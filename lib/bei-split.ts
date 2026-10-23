// Design Ref: §4 `/api/bei/split` — 입력 글에서 경험 후보를 최대 5개 찾는다. (서버 전용)
// 규칙(PRD 5번): 후보는 최대 5개, 질문은 고른 경험의 "원문"에서만 만든다 → 원문 구간은 서버가 입력에서 직접 잘라 쓴다.
import "server-only";
import { z } from "zod";
import { AiError, callAiJson } from "@/lib/ai";
import type { ExperienceCandidate } from "@/lib/bei-types";
import { dropOverlaps, sliceByQuotes, type Span } from "@/lib/excerpt";
import { LIMITS } from "@/lib/limits";

const INSTRUCTIONS = [
  "너는 은행 면접을 준비하는 지원자를 돕는 도우미다.",
  "자료로 주어진 자기소개서·경험 글에서, 면접 질문을 만들 만한 '구체적인 경험 하나'를 이루는 부분을 찾아 최대 8개의 후보로 나눈다.",
  "",
  "각 후보에는 다음을 적는다.",
  "- title: 경험을 알아볼 수 있는 짧은 제목(20자 안팎). 글에 있는 내용만 쓴다.",
  "- summary: 글에 있는 사실만으로 쓴 한두 문장 요약(100자 이내). 글에 없는 내용·숫자·평가를 넣지 않는다.",
  "- startQuote: 그 경험이 시작하는 곳의 글을 자료에서 한 글자도 바꾸지 말고 그대로 복사한 10~25자.",
  "- endQuote: 그 경험이 끝나는 곳의 글을 자료에서 한 글자도 바꾸지 말고 그대로 복사한 10~25자.",
  "",
  "지켜야 할 것:",
  "- 후보끼리 겹치지 않게 나눈다. 한 경험은 한 후보에만 넣는다.",
  "- 같은 사건의 앞뒤 이야기(상황, 한 일, 결과, 이후의 후속 조치)는 쪼개지 말고 하나의 후보로 묶는다. 서로 다른 사건일 때만 후보를 나눈다.",
  "- 인사말, 지원 동기를 일반론으로 말한 부분, 성격 소개만 있는 부분은 후보로 만들지 않는다.",
  "- 한 후보는 최소 두세 문장 이상의 구체적인 사건(언제·무엇을·어떻게·결과 중 일부)이어야 한다.",
  "- 자료에 경험이 하나도 없으면 candidates를 빈 배열로 돌려준다. 없는 경험을 만들어 내지 않는다.",
  '- 출력은 {"candidates":[{"title":"","summary":"","startQuote":"","endQuote":""}]} 모양의 JSON 하나뿐이다.',
].join("\n");

const aiOutputSchema = z.object({
  candidates: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(80),
        summary: z.string().trim().min(1).max(300),
        startQuote: z.string().min(1),
        endQuote: z.string().min(1),
      }),
    )
    .max(12),
});

/** 가린 글에서 경험 후보를 찾는다. 후보가 하나도 없으면 빈 배열을 돌려준다. */
export async function findExperienceCandidates(maskedText: string): Promise<ExperienceCandidate[]> {
  const output = await callAiJson(
    {
      instructions: INSTRUCTIONS,
      materials: [{ label: "자기소개서·경험 글", text: maskedText }],
      userMessage: "위 자료에서 경험 후보를 나눠 줘.",
      maxOutputTokens: 6000,
    },
    aiOutputSchema,
  );

  // AI가 말한 앞뒤 문구로 원문을 직접 잘라낸다. 원문에서 찾지 못한 후보는 버린다. (지어낸 것일 수 있다)
  const found: { title: string; summary: string; span: Span }[] = [];
  for (const candidate of output.candidates) {
    const span = sliceByQuotes(maskedText, candidate.startQuote, candidate.endQuote);
    if (span) found.push({ title: candidate.title, summary: candidate.summary, span });
  }

  // AI가 후보를 말했는데 하나도 원문에서 찾지 못했다면, 같은 요청을 다시 해 보라고 알린다.
  if (output.candidates.length > 0 && found.length === 0) {
    throw new AiError("bad_output", "경험을 정확히 찾지 못했습니다. 다시 시도해 주세요.", true);
  }

  return dropOverlaps(found)
    .slice(0, LIMITS.BEI_MAX_CANDIDATES)
    .map((item, index) => ({ id: `c${index + 1}`, title: item.title, summary: item.summary, excerpt: item.span.text }));
}
