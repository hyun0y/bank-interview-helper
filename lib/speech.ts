// Design Ref: §2.4 BEI 결과 (nice) — 면접관 음성으로 질문 읽기. 브라우저 내장 음성 기능(Web Speech API)을 쓴다. (작업 20번)
// 이 파일은 목소리 고르기·속도 다듬기 같은 순수 계산만 담는다. 브라우저 기능을 직접 부르지 않는다.

/** 읽는 속도 범위(1이 보통). 너무 느리거나 빠르면 알아듣기 어려워 이 안에서만 고르게 한다. */
export const RATE_MIN = 0.7;
export const RATE_MAX = 1.5;
export const RATE_STEP = 0.1;
export const RATE_DEFAULT = 1;

/** 속도를 범위 안으로 맞추고 0.1 단위로 다듬는다. 숫자가 아니면 보통 속도로 돌린다. */
export function clampRate(value: number): number {
  if (!Number.isFinite(value)) return RATE_DEFAULT;
  const clamped = Math.min(RATE_MAX, Math.max(RATE_MIN, value));
  return Math.round(clamped * 10) / 10;
}

export function formatRate(rate: number): string {
  return `${clampRate(rate).toFixed(1)}배`;
}

/** 한국어 목소리인가. (ko-KR, ko_KR, ko 모두 인정) */
export function isKoreanVoice(voice: { lang: string }): boolean {
  return /^ko([-_]|$)/i.test(voice.lang.trim());
}

type VoiceLike = { lang: string; localService?: boolean; default?: boolean; name?: string };

/**
 * 읽어 줄 한국어 목소리를 고른다. 없으면 undefined.
 * 우선순위: 컴퓨터에 설치된(인터넷이 필요 없는) 목소리 → 브라우저 기본 목소리 → 목록의 첫 번째
 */
export function pickKoreanVoice<T extends VoiceLike>(voices: readonly T[]): T | undefined {
  const korean = voices.filter(isKoreanVoice);
  if (korean.length === 0) return undefined;
  return korean.find((v) => v.localService && v.default) ?? korean.find((v) => v.localService) ?? korean.find((v) => v.default) ?? korean[0];
}

/** 읽기 전에 글을 다듬는다. 줄바꿈·겹친 띄어쓰기를 정리하고, 읽을 것이 없으면 빈 글자를 돌려준다. */
export function toSpeakableText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
