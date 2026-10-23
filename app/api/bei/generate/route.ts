// Design Ref: §4 서버 API 설계 `/api/bei/generate` — 고른 경험 1개의 원문을 받아 질문 5개, 꼬리 질문(질문마다 2개), 1분 모범 답변을 돌려준다.
// 경험이 여러 개면 화면이 경험마다 한 번씩, 동시에 부른다. (3분 이내 목표와 서버 실행 시간 한도를 지키기 위함: DESIGN §7)
// 순서: ① 요청 상한 확인 → ② 입력 검사 → ③ 처리 → ④ 응답 모양 확인
import { z } from "zod";
import { aiErrorResponse } from "@/lib/ai";
import { withCostAccounting } from "@/lib/ai-billing";
import { readJsonBody } from "@/lib/api-input";
import { generateQuestionsAndAnswers } from "@/lib/bei-generate";
import type { GenerateResponse } from "@/lib/bei-types";
import { MIN_EXCERPT_CHARS } from "@/lib/excerpt";
import { LIMITS } from "@/lib/limits";
import { maskPersonalInfo } from "@/lib/masking";
import { enforceRateLimit } from "@/lib/rate-limit";
import { enforceSameSite } from "@/lib/request-guard";

// AI가 여러 질문을 만들려면 시간이 걸릴 수 있어 실행 시간을 넉넉히 지정한다.
export const maxDuration = 120;

const bodySchema = z.object({
  excerpt: z
    .string("경험 글을 보내 주세요.")
    .trim()
    .min(MIN_EXCERPT_CHARS, "경험 글이 너무 짧습니다.")
    .max(LIMITS.BEI_TEXT_MAX_CHARS, "경험 글이 너무 깁니다."),
});

export async function POST(request: Request) {
  // 다른 사이트가 방문자 브라우저로 이 주소를 대신 부르는 것을 먼저 막는다. (요청 상한도 쓰지 않게 가장 앞에서)
  const crossSite = enforceSameSite(request);
  if (crossSite) return crossSite;

  const limited = enforceRateLimit(request); // ① 요청 상한 (AI 호출 전에 센다)
  if (limited) return limited;

  const body = await readJsonBody(request, bodySchema); // ② 입력 검사
  if (!body.ok) return body.response;

  // 보내기 직전 마지막 안전장치: 연락처·주민번호·이메일이 남아 있으면 한 번 더 가린다.
  const masked = maskPersonalInfo(body.data.excerpt).text;

  try {
    // ③ 처리: 형식 재시도·길이 다시 쓰기로 모델을 여러 번 부르면 그만큼 요청 상한에 더한다.
    const questions = await withCostAccounting(request, () => generateQuestionsAndAnswers(masked));
    const response: GenerateResponse = { questions }; // ④ 응답
    return Response.json(response);
  } catch (err) {
    return aiErrorResponse(err);
  }
}
