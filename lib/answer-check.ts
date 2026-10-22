// Design Ref: §4 `/api/bei/generate` — 모범 답변이 "경험 원문에 있는 사실만" 썼는지, 길이가 맞는지 서버가 기계적으로 확인한다.
// AI는 그럴듯하게 지어낼 수 있으므로 다음을 따로 확인한다.
//   (1) 답변 글자 수, (2) STAR 부분마다 근거로 든 원문 문장이 원문에 실제로 있는지,
//   (3) 답변 속 숫자가 원문에 있는지, (4) 원문에 없는 "배웠다·느꼈다" 같은 표현이 없는지
// 순수한 글자 처리 함수만 있다.
import { STAR_LABELS, type AnswerEvidence, type StarPart } from "@/lib/bei-types";
import { findQuote } from "@/lib/excerpt";
import { LIMITS } from "@/lib/limits";

/** 답변 글자 수(띄어쓰기 포함). 줄바꿈은 공백 하나로 보고 센다. */
export function countAnswerChars(text: string): number {
  return Array.from(text.replace(/\s*\n\s*/g, " ").trim()).length;
}

export function isAnswerLengthOk(text: string): boolean {
  const length = countAnswerChars(text);
  return length >= LIMITS.ANSWER_MIN_CHARS && length <= LIMITS.ANSWER_MAX_CHARS;
}

function normalizeNumber(raw: string): string {
  return raw.replace(/,/g, "");
}

// "세 가지"를 "3가지"처럼 쓰는 경우는 사실이 아니라 말투이므로 숫자 검사에서 뺀다.
const NON_FACT_NUMBER = /^(?:가지|번째|단계|차례|째|번)/;

/** 답변에 있는 숫자 중, 원문에는 없는 숫자를 모아 돌려준다. (예: 원문에 없는 "80%", "30명") */
export function findUnsupportedNumbers(answer: string, original: string): string[] {
  const inOriginal = new Set((original.match(/\d+(?:[.,]\d+)*/g) ?? []).map(normalizeNumber));
  const unsupported: string[] = [];
  const pattern = /\d+(?:[.,]\d+)*/g;
  for (let match = pattern.exec(answer); match; match = pattern.exec(answer)) {
    const value = normalizeNumber(match[0]);
    const after = answer.slice(match.index + match[0].length, match.index + match[0].length + 3);
    if (NON_FACT_NUMBER.test(after)) continue;
    if (!inOriginal.has(value) && !unsupported.includes(match[0])) unsupported.push(match[0]);
  }
  return unsupported;
}

// 원문에 없는데 답변에 들어가기 쉬운 "배운 점·느낀 점" 표현의 어근. AI가 가장 흔하게 지어내는 부분이다.
const REFLECTION_STEMS = ["배웠", "배우게", "느꼈", "느끼게", "깨달", "깨닫", "성장했", "성장하게", "알게 됐", "알게 되었", "생각하게 됐", "생각하게 되었"];

/** 답변에 있는 "배웠다·느꼈다·깨달았다" 같은 표현 중, 원문에는 없는 것을 돌려준다. */
export function findUnsupportedReflections(answer: string, original: string): string[] {
  const compactAnswer = answer.replace(/\s+/g, "");
  const compactOriginal = original.replace(/\s+/g, "");
  return REFLECTION_STEMS.filter((stem) => {
    const compactStem = stem.replace(/\s+/g, "");
    return compactAnswer.includes(compactStem) && !compactOriginal.includes(compactStem);
  });
}

/** STAR 부분의 차례: 상황 → 과제 → 행동 → 결과 */
export const STAR_PARTS: StarPart[] = ["situation", "task", "action", "result"];

/** AI가 STAR 부분마다 적은 원문 근거 문장. 비어 있으면 "원문에 그 내용이 없음"이라는 뜻이다. */
export type StarEvidenceInput = Partial<Record<StarPart, string>>;

export type AnswerCheck = {
  status: "verified" | "unverified";
  /** 원문에서 그대로 확인된 근거 문장(원문에 적힌 글자) */
  evidence: AnswerEvidence[];
  /** 원문에 근거가 없다고 AI가 스스로 밝힌 STAR 부분 */
  missingParts: StarPart[];
  /** 근거라고 문장을 적었지만 원문에서 찾지 못한 STAR 부분 (AI가 지어낸 부분일 수 있다) */
  unfoundParts: StarPart[];
  /** unverified인 이유 (사용자에게 보여 줄 안내) */
  issue?: string;
};

/**
 * 답변이 원문에서 확인되는지 본다.
 * verified: 확인된 근거가 있고, 근거라고 한 문장이 모두 원문에 실제로 있으며,
 *           답변의 숫자도 모두 원문에 있고, 원문에 없는 "배웠다·느꼈다" 표현도 없다.
 */
export function checkAnswer(answerText: string, input: StarEvidenceInput, original: string): AnswerCheck {
  const evidence: AnswerEvidence[] = [];
  const missingParts: StarPart[] = [];
  const unfound: StarPart[] = [];

  for (const part of STAR_PARTS) {
    const quote = (input[part] ?? "").trim();
    if (!quote) {
      missingParts.push(part);
      continue;
    }
    const exact = findQuote(original, quote);
    if (exact) evidence.push({ part, quote: exact });
    else unfound.push(part);
  }

  const unsupportedNumbers = findUnsupportedNumbers(answerText, original);
  const unsupportedReflections = findUnsupportedReflections(answerText, original);

  const base = { evidence, missingParts, unfoundParts: unfound };
  if (evidence.length === 0) {
    return { ...base, status: "unverified", issue: "근거가 된 원문 문장을 확인하지 못했습니다." };
  }
  if (unfound.length > 0) {
    const labels = unfound.map((part) => STAR_LABELS[part]).join("·");
    return { ...base, status: "unverified", issue: `근거라고 한 문장(${labels})이 원문에서 확인되지 않았습니다.` };
  }
  if (unsupportedNumbers.length > 0) {
    return { ...base, status: "unverified", issue: `원문에 없는 숫자(${unsupportedNumbers.join(", ")})가 답변에 들어 있습니다.` };
  }
  if (unsupportedReflections.length > 0) {
    return {
      ...base,
      status: "unverified",
      issue: `원문에 없는 배운 점·느낀 점 표현(${unsupportedReflections.join(", ")})이 답변에 들어 있습니다.`,
    };
  }
  return { ...base, status: "verified" };
}
