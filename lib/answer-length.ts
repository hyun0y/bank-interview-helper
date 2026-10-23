// Design Ref: PRD 5번 — 모범 답변은 280~320자(띄어쓰기 포함). 글자 수를 맞추는 순수 계산 도우미. (CHECK.md 4번)
// AI는 글자 수를 정확히 세지 못하므로, 서버가 "문장별 글자 수"를 알려 주고 "문장 몇 개를 더/덜"로 고치게 한다.
// 너무 긴 답변은 서버가 문장 단위로 덜어내 범위에 맞춘다. (없던 내용을 새로 만들지 않으므로 사실 규칙을 해치지 않는다)
import { countAnswerChars } from "@/lib/answer-check";
import { LIMITS } from "@/lib/limits";

/** 목표 글자 수. 범위(280~320)의 한가운데 */
export const TARGET_CHARS = 300;
/** 한국어 답변 문장 하나의 보통 길이. "문장 몇 개를 더/덜"로 바꿀 때 쓴다. */
const TYPICAL_SENTENCE_CHARS = 40;

/** 문장 끝(. ! ?)과 그 뒤 띄어쓰기에서 나눈다. */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\s*\n\s*/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function isTooShort(text: string): boolean {
  return countAnswerChars(text) < LIMITS.ANSWER_MIN_CHARS;
}

export function isTooLong(text: string): boolean {
  return countAnswerChars(text) > LIMITS.ANSWER_MAX_CHARS;
}

export type LengthFix = { direction: "add" | "remove"; chars: number; sentences: number };

/** 범위 밖 답변을 고치려면 몇 자(문장 몇 개)를 더하거나 덜어야 하는지. 범위 안이면 null */
export function describeLengthFix(text: string): LengthFix | null {
  const length = countAnswerChars(text);
  if (length < LIMITS.ANSWER_MIN_CHARS) {
    const chars = TARGET_CHARS - length;
    return { direction: "add", chars, sentences: Math.max(1, Math.round(chars / TYPICAL_SENTENCE_CHARS)) };
  }
  if (length > LIMITS.ANSWER_MAX_CHARS) {
    const chars = length - TARGET_CHARS;
    return { direction: "remove", chars, sentences: Math.max(1, Math.round(chars / TYPICAL_SENTENCE_CHARS)) };
  }
  return null;
}

/** 다시 쓰기를 맡길 때 AI에게 보여 줄 한 줄 설명 */
export function formatLengthFix(fix: LengthFix): string {
  return fix.direction === "add"
    ? `약 ${fix.chars}자 늘려야 한다. 원문에 있는 사실을 풀어서 ${fix.sentences}문장 안팎(문장당 40자 안팎)을 더한다.`
    : `약 ${fix.chars}자 줄여야 한다. 덜 중요한 문장 ${fix.sentences}개 안팎을 뺀다.`;
}

/** 문장별 글자 수 (AI가 문장 단위로 늘리고 줄이도록 알려 주는 값) */
export function sentenceLengths(text: string): number[] {
  return splitSentences(text).map((sentence) => countAnswerChars(sentence));
}

function lengthOfSentences(sentences: string[]): number {
  return countAnswerChars(sentences.join(" "));
}

/**
 * 320자를 넘는 답변에서 문장을 한두 개 덜어 280~320자 안으로 맞춘다. 맞출 수 없으면 원래 글을 그대로 돌려준다.
 *  - 첫 문장(상황)과 마지막 문장(결과)은 남긴다. STAR의 처음과 끝이 사라지지 않게 하려는 것이다.
 *  - 가운데 문장 한 개를 뺐을 때 범위 안이 되는 경우를 먼저 찾고(300자에 가장 가까운 것), 없으면 두 개를 뺀다.
 *  - 새 문장을 만들지 않고 AI가 쓴 문장만 덜어내므로 원문에 없는 사실이 생기지 않는다.
 */
export function trimToRange(text: string): string {
  if (!isTooLong(text)) return text;
  const sentences = splitSentences(text);
  if (sentences.length < 4) return text; // 문장이 너무 적으면 덜어낼 수 없다.

  const middle = sentences.map((_, index) => index).filter((index) => index > 0 && index < sentences.length - 1);
  const inRange = (candidate: string[]) => {
    const length = lengthOfSentences(candidate);
    return length >= LIMITS.ANSWER_MIN_CHARS && length <= LIMITS.ANSWER_MAX_CHARS;
  };
  const closeness = (candidate: string[]) => Math.abs(lengthOfSentences(candidate) - TARGET_CHARS);

  let best: string[] | null = null;
  for (const skip of middle) {
    const candidate = sentences.filter((_, index) => index !== skip);
    if (inRange(candidate) && (best === null || closeness(candidate) < closeness(best))) best = candidate;
  }
  if (!best) {
    for (const a of middle) {
      for (const b of middle) {
        if (b <= a) continue;
        const candidate = sentences.filter((_, index) => index !== a && index !== b);
        if (inRange(candidate) && (best === null || closeness(candidate) < closeness(best))) best = candidate;
      }
    }
  }
  return best ? best.join(" ") : text;
}
