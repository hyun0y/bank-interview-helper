// Design Ref: §4 서버 API 설계 `/api/literacy/assist` — 질문을 받아 AI 어시스트의 답을 돌려준다.
// 순서: ① 요청 상한 확인 → ② 입력 검사(질문 1,000자·요청 크기) → ③ 열어 본 파일 확인 → ④ AI 호출 → ⑤ 응답 (DESIGN §4)
// 질문 횟수·토큰은 브라우저가 차감한다. 이 API가 실패하면(charged:false) 차감하지 않는다.
import { z } from "zod";
import { aiErrorResponse } from "@/lib/ai";
import { withCostAccounting } from "@/lib/ai-billing";
import { questionSchema, readJsonBody } from "@/lib/api-input";
import { answerAssistQuestion, ASSIST_HISTORY_MAX_CHARS, ASSIST_HISTORY_MAX_MESSAGES, ASSIST_MAX_FILES, resolveOpenedFiles } from "@/lib/literacy-assist";
import { enforceRateLimit } from "@/lib/rate-limit";
import { enforceSameSite } from "@/lib/request-guard";

const bodySchema = z.object({
  bundle: z.enum(["A", "B", "C"], "묶음 번호가 올바르지 않습니다."),
  question: questionSchema,
  openedFileIds: z.array(z.string().trim().min(1).max(20)).max(ASSIST_MAX_FILES, "열어 본 파일 수가 너무 많습니다."),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(ASSIST_HISTORY_MAX_CHARS * 4) }))
    .max(ASSIST_HISTORY_MAX_MESSAGES * 4, "이전 대화가 너무 깁니다."),
});

export async function POST(request: Request) {
  // 다른 사이트가 방문자 브라우저로 이 주소를 대신 부르는 것을 먼저 막는다. (요청 상한도 쓰지 않게 가장 앞에서)
  const crossSite = enforceSameSite(request);
  if (crossSite) return crossSite;

  // ① 요청 상한 (AI 호출 전에 센다): 어시스트 질문 전용 상한 → 전체 AI 요청 상한 순서. 어시스트가 범용 AI 창구로 쓰이는 것을 막는다.
  const assistLimited = enforceRateLimit(request, "assist");
  if (assistLimited) return assistLimited;
  const limited = enforceRateLimit(request);
  if (limited) return limited;

  const body = await readJsonBody(request, bodySchema); // ② 입력 검사
  if (!body.ok) return body.response;

  // ③ 열어 본 파일만 참고한다. 없는 번호·다른 묶음 파일은 거부한다.
  const files = resolveOpenedFiles(body.data.bundle, body.data.openedFileIds);
  if (!files.ok) {
    return Response.json({ error: { code: "invalid_files", message: files.message }, charged: false }, { status: 400 });
  }

  try {
    const answer = await withCostAccounting(request, () =>
      answerAssistQuestion({
        bundle: body.data.bundle,
        question: body.data.question,
        materials: files.materials,
        history: body.data.history,
      }),
    ); // ④ AI 호출
    return Response.json({ answer, referencedFiles: files.names }); // ⑤ 응답
  } catch (err) {
    return aiErrorResponse(err);
  }
}
