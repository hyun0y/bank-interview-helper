// Design Ref: §4 서버 API 설계 — 입력 길이·요청 크기 제한을 한 곳에 모아 둔다.
// 브라우저 화면(글자 수 안내)과 서버(검사)가 같은 숫자를 쓰도록 순수 상수만 둔다. (서버 전용 코드 아님)

export const LIMITS = {
  /** AI 어시스트에 보내는 질문의 최대 글자 수 (PRD 5번 공통 규칙) */
  QUESTION_MAX_CHARS: 1000,
  /** BEI 입력 글의 최대 글자 수 (PRD 5번 BEI 규칙) */
  BEI_TEXT_MAX_CHARS: 10000,
  /** 서버가 받는 요청 본문의 최대 크기(바이트). 한글 1만 자(약 30KB)와 JSON 포장을 넉넉히 담는 크기 */
  REQUEST_BODY_MAX_BYTES: 100_000,
} as const;
