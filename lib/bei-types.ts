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
