// Design Ref: §4 서버 API 설계 — 입력 길이·요청 크기 제한을 한 곳에 모아 둔다.
// 브라우저 화면(글자 수 안내)과 서버(검사)가 같은 숫자를 쓰도록 순수 상수만 둔다. (서버 전용 코드 아님)

export const LIMITS = {
  /** AI 어시스트에 보내는 질문의 최대 글자 수 (PRD 5번 공통 규칙) */
  QUESTION_MAX_CHARS: 1000,
  /** BEI 입력 글의 최대 글자 수 (PRD 5번 BEI 규칙) */
  BEI_TEXT_MAX_CHARS: 10000,
  /** AI가 찾아 주는 경험 후보의 최대 개수 (PRD 5번 BEI 규칙) */
  BEI_MAX_CANDIDATES: 5,
  /** 사용자가 고를 수 있는 경험의 최대 개수 (PRD 5번 BEI 규칙) */
  BEI_MAX_SELECTED: 3,
  /** BEI에 올리는 PDF·docx 파일의 최대 크기(바이트). 5MB (PRD 5번 BEI 규칙) */
  BEI_FILE_MAX_BYTES: 5 * 1024 * 1024,
  /** 서버가 받는 요청 본문의 최대 크기(바이트). 한글 1만 자(약 30KB)와 JSON 포장을 넉넉히 담는 크기 */
  REQUEST_BODY_MAX_BYTES: 100_000,
  /** 한 사용자(접속 주소 기준)가 정해진 시간 안에 보낼 수 있는 AI 요청 수 (PRD 7번: 1시간에 100회) */
  AI_REQUESTS_PER_WINDOW: 100,
  /** 위 요청 수를 세는 시간(초). 1시간 */
  AI_WINDOW_SECONDS: 3600,
} as const;
