// Design Ref: §4 서버 API 설계 `/api/debate/opinions` — 주제 번호와 입장을 받아 입장별 의견과 인사이트를 돌려준다.
// 순서: ① 요청 상한 확인 → ② 입력 검사 → ③ 주제 확인 → ④ AI 호출 → ⑤ 응답 모양 확인 (DESIGN §4)
// 주제 글은 브라우저가 보낸 것이 아니라 서버 목록에서 찾는다. 결과는 저장하지 않고 로그에도 남기지 않는다.
import { z } from "zod";
import { aiErrorResponse } from "@/lib/ai";
import { withCostAccounting } from "@/lib/ai-billing";
import { readJsonBody } from "@/lib/api-input";
import { generateOpinions } from "@/lib/debate-opinions";
import { DEBATE_TOPICS } from "@/content/debate/topics";
import { enforceRateLimit } from "@/lib/rate-limit";
import { enforceSameSite } from "@/lib/request-guard";

const bodySchema = z.object({
  topicId: z.string("주제 번호를 보내 주세요.").trim().min(1, "주제 번호를 보내 주세요.").max(20, "주제 번호가 올바르지 않습니다."),
  stance: z.enum(["pro", "con"], "입장은 찬성(pro) 또는 반대(con)여야 합니다."),
});

export async function POST(request: Request) {
  // 다른 사이트가 방문자 브라우저로 이 주소를 대신 부르는 것을 먼저 막는다. (요청 상한도 쓰지 않게 가장 앞에서)
  const crossSite = enforceSameSite(request);
  if (crossSite) return crossSite;

  const limited = enforceRateLimit(request); // ① 요청 상한 (AI 호출 전에 센다)
  if (limited) return limited;

  const body = await readJsonBody(request, bodySchema); // ② 입력 검사
  if (!body.ok) return body.response;

  const topic = DEBATE_TOPICS.find((item) => item.id === body.data.topicId); // ③ 주제 확인
  if (!topic) return Response.json({ error: { code: "not_found", message: "없는 주제입니다." }, charged: false }, { status: 404 });

  try {
    return Response.json(await withCostAccounting(request, () => generateOpinions(topic, body.data.stance))); // ④⑤ AI 호출과 응답 모양 확인
  } catch (err) {
    return aiErrorResponse(err);
  }
}
