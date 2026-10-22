// Design Ref: §4 서버 API 설계 `/api/bei/split` — 가린 텍스트(최대 1만 자)를 받아 경험 후보(최대 5개)를 돌려준다.
// 순서: ① 요청 상한 확인 → ② 입력 검사 → ③ 처리 → ④ 응답 모양 확인 (DESIGN §4)
import { z } from "zod";
import { aiErrorResponse } from "@/lib/ai";
import { readJsonBody } from "@/lib/api-input";
import type { SplitResponse } from "@/lib/bei-types";
import { findExperienceCandidates } from "@/lib/bei-split";
import { LIMITS } from "@/lib/limits";
import { maskPersonalInfo } from "@/lib/masking";
import { enforceRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  text: z
    .string("글을 보내 주세요.")
    .trim()
    .min(1, "글을 입력해 주세요.")
    .max(LIMITS.BEI_TEXT_MAX_CHARS, "1만 자 이내로 줄여 주세요."),
});

export async function POST(request: Request) {
  const limited = enforceRateLimit(request); // ① 요청 상한 (AI 호출 전에 센다)
  if (limited) return limited;

  const body = await readJsonBody(request, bodySchema); // ② 입력 검사
  if (!body.ok) return body.response;

  // 화면에서 이미 가렸더라도, 연락처·주민번호·이메일이 남아 있으면 서버에서 한 번 더 가린다. (보내기 전 마지막 안전장치)
  const masked = maskPersonalInfo(body.data.text).text;

  try {
    const candidates = await findExperienceCandidates(masked); // ③ 처리
    const response: SplitResponse = { candidates }; // ④ 응답
    return Response.json(response);
  } catch (err) {
    return aiErrorResponse(err);
  }
}
