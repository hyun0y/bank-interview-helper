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
  /** 브라우저에 저장해 두는 BEI 결과의 최대 개수. 넘으면 가장 오래된 것부터 지운다. (PRD 5번 BEI 규칙) */
  BEI_MAX_SAVED_RESULTS: 5,
  /** 1분 모범 답변의 글자 수 범위(띄어쓰기 포함, PRD 5번 BEI 규칙) */
  ANSWER_MIN_CHARS: 280,
  ANSWER_MAX_CHARS: 320,
  /** BEI에 올리는 PDF·docx 파일의 최대 크기(바이트). 5MB (PRD 5번 BEI 규칙) */
  BEI_FILE_MAX_BYTES: 5 * 1024 * 1024,
  /** 서버가 받는 요청 본문의 최대 크기(바이트). 한글 1만 자(약 30KB)와 JSON 포장을 넉넉히 담는 크기 */
  REQUEST_BODY_MAX_BYTES: 100_000,
  /** 한 사용자(접속 주소 기준)가 정해진 시간 안에 보낼 수 있는 AI 요청 수 (PRD 7번: 1시간에 100회) */
  AI_REQUESTS_PER_WINDOW: 100,
  /** 위 요청 수를 세는 시간(초). 1시간 */
  AI_WINDOW_SECONDS: 3600,
  /** AI 어시스트 질문만 따로 세는 상한. 한 세트(3묶음 × 10회 = 30회)와 약간의 다시 풀기를 허용한다. 위 전체 상한과 별개로 적용된다. (CHECK.md 3번) */
  ASSIST_REQUESTS_PER_WINDOW: 40,
  /** AI 리터러시: 같은 자료를 함께 쓰는 문제 묶음 1개당 토큰 한도. 코드의 설정값으로만 바꾼다. (PRD 5번) */
  LITERACY_BUNDLE_TOKENS: 20_000,
  /** AI 리터러시: 문제 묶음 1개당 AI 어시스트에 질문할 수 있는 횟수 (PRD 5번) */
  LITERACY_BUNDLE_QUESTIONS: 10,
} as const;
