// Design Ref: §4 서버 API 설계 `/api/bei/split` — 서버와 화면이 같이 쓰는 모양(타입). 순수 선언만 있다.

/** AI가 찾아 준 경험 후보 하나 */
export type ExperienceCandidate = {
  /** 후보 번호. 화면에서 고른 것을 구분하는 데 쓴다. (c1, c2, …) */
  id: string;
  /** 경험을 한눈에 알아볼 수 있는 짧은 제목 */
  title: string;
  /** 글에 있는 사실만으로 쓴 한두 문장 요약 */
  summary: string;
  /** 입력 글에서 그대로 잘라낸 경험 부분(원문). 질문·답변을 만들 때 이 부분만 AI에 보낸다. */
  excerpt: string;
};

export type SplitResponse = { candidates: ExperienceCandidate[] };

// Design Ref: §4 `/api/bei/generate` — 질문 5개, 질문마다 꼬리 질문 2개. (작업 9번)
//   모범 답변·근거·평가 기준은 작업 10번에서 이 모양에 이어 붙인다.

/** 꼬리 질문 하나. 꼬리 질문에는 답변을 대신 써 주지 않고 "답변 방향 한 줄"만 붙인다. (PRD 5번) */
export type FollowUp = {
  question: string;
  /** 이 꼬리 질문에 답할 때 경험의 어떤 부분을 짚으면 좋은지 한 줄 */
  answerDirection: string;
  /** 경험 글에 없는 정보를 묻는 꼬리 질문인가. true면 "경험에서 확인되지 않음, 보완 필요"로 표시한다. */
  missingInfo: boolean;
};

export type BeiQuestion = {
  /** q1 ~ q5 */
  id: string;
  question: string;
  /** 이 질문이 확인하려는 평가 기준의 번호(lib/bei-criteria.ts). 알 수 없는 값이면 비워 둔다. */
  criterionId?: string;
  followUps: FollowUp[];
};

export type GenerateResponse = { questions: BeiQuestion[] };
