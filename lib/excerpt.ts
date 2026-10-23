// Design Ref: §4 `/api/bei/split` — AI가 알려 준 "시작 문구·끝 문구"로 입력 글에서 경험 원문을 그대로 잘라낸다.
// AI에게 긴 원문을 통째로 다시 쓰게 하면 글이 바뀌거나 지어낼 수 있다.
// 그래서 AI에게는 앞뒤 몇 글자만 말하게 하고, 실제 글은 서버가 원문에서 직접 잘라 쓴다. (경험에 있는 사실만 쓰는 규칙을 지키기 위함)
// 순수한 글자 처리 함수만 있다.

/** 이보다 짧은 경험 구간은 질문을 만들기에 부족해 버린다. */
export const MIN_EXCERPT_CHARS = 30;
/** 앞뒤 문구가 이보다 짧으면 엉뚱한 곳과 맞을 수 있어 쓰지 않는다. */
const MIN_QUOTE_CHARS = 4;

export type Span = { start: number; end: number; text: string };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 띄어쓰기·줄바꿈이 조금 달라도 찾을 수 있는 검색식을 만든다. */
function tolerantPattern(quote: string): RegExp | null {
  // 글자 사이마다 "공백이 있어도 없어도 된다"로 만든다. (AI가 띄어쓰기를 조금 바꿔 말해도 같은 곳을 찾기 위해)
  const chars = Array.from(quote.replace(/\s+/g, ""));
  if (chars.length < MIN_QUOTE_CHARS) return null;
  return new RegExp(chars.map(escapeRegExp).join("\\s*"));
}

/**
 * 시작 문구에서 끝 문구까지를 원문에서 잘라 돌려준다. 찾지 못하거나 너무 짧으면 null
 * - 끝 문구는 시작 문구 "이후"에서 가장 먼저 나오는 곳을 쓴다.
 */
export function sliceByQuotes(original: string, startQuote: string, endQuote: string): Span | null {
  const startPattern = tolerantPattern(startQuote);
  const endPattern = tolerantPattern(endQuote);
  if (!startPattern || !endPattern) return null;

  const start = startPattern.exec(original);
  if (!start) return null;

  const afterStart = original.slice(start.index);
  const end = endPattern.exec(afterStart);
  if (!end) return null;

  const from = start.index;
  const to = from + end.index + end[0].length;
  const text = original.slice(from, to).trim();
  if (text.length < MIN_EXCERPT_CHARS) return null;
  return { start: from, end: to, text };
}

/**
 * 원문 안에서 어떤 문장(근거 문장)을 찾아, 원문에 적힌 그대로의 글을 돌려준다. 찾지 못하거나 너무 짧으면 null
 * - 띄어쓰기·줄바꿈이 조금 달라도 같은 곳으로 본다.
 * - 너무 짧은 문장(기본 8글자 미만)은 우연히 맞을 수 있어 근거로 인정하지 않는다.
 */
export function findQuote(original: string, quote: string, minChars = 8): string | null {
  if (quote.replace(/\s+/g, "").length < minChars) return null;
  const pattern = tolerantPattern(quote);
  if (!pattern) return null;
  const match = pattern.exec(original);
  return match ? match[0] : null;
}

/** 서로 크게 겹치는 구간은 앞의 것만 남긴다. (겹침이 짧은 쪽의 절반을 넘으면 같은 경험으로 본다) */
export function dropOverlaps<T extends { span: Span }>(items: T[]): T[] {
  const sorted = [...items].sort((a, b) => a.span.start - b.span.start);
  const kept: T[] = [];
  for (const item of sorted) {
    const overlapsKept = kept.some((other) => {
      const overlap = Math.min(item.span.end, other.span.end) - Math.max(item.span.start, other.span.start);
      if (overlap <= 0) return false;
      const shorter = Math.min(item.span.end - item.span.start, other.span.end - other.span.start);
      return overlap > shorter / 2;
    });
    if (!overlapsKept) kept.push(item);
  }
  return kept;
}
