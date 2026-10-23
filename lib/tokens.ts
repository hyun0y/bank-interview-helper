// Design Ref: §3.6 토큰 추정 규칙 — 글자 수로 토큰 수를 어림한다. (브라우저·서버 어디서나 쓸 수 있는 순수 계산)
// 이 값은 실제 AI 사용량이 아니라 연습용 어림값이다. 실제와 차이가 나면 이 파일의 규칙만 고치면 된다.

/** 한글(완성형·자모)과 한자인가. 이 글자들은 글자 1개를 토큰 1개로 센다. */
function isHangulOrHanja(code: number): boolean {
  return (
    (code >= 0xac00 && code <= 0xd7a3) || // 한글 완성형
    (code >= 0x1100 && code <= 0x11ff) || // 한글 자모
    (code >= 0x3130 && code <= 0x318f) || // 한글 호환 자모
    (code >= 0x3400 && code <= 0x4dbf) || // 한자 확장 A
    (code >= 0x4e00 && code <= 0x9fff) // 한자
  );
}

function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}

/**
 * 글의 토큰 수를 어림한다.
 * - 한글·한자 1글자 = 1토큰
 * - 영문·숫자·기호 4글자 = 1토큰 (올림)
 * - 띄어쓰기와 줄바꿈은 세지 않는다.
 */
export function estimateTokens(text: string): number {
  let hangul = 0;
  let other = 0;
  for (const char of text) {
    if (isWhitespace(char)) continue;
    if (isHangulOrHanja(char.codePointAt(0) ?? 0)) hangul += 1;
    else other += 1;
  }
  return hangul + Math.ceil(other / 4);
}
