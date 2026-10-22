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

// Design Ref: §4 `/api/bei/generate` — 질문 5개, 질문마다 꼬리 질문 2개와 1분 모범 답변 1개. (작업 9·10번)

/** 꼬리 질문 하나. 꼬리 질문에는 답변을 대신 써 주지 않고 "답변 방향 한 줄"만 붙인다. (PRD 5번) */
export type FollowUp = {
  question: string;
  /** 이 꼬리 질문에 답할 때 경험의 어떤 부분을 짚으면 좋은지 한 줄 */
  answerDirection: string;
  /** 경험 글에 없는 정보를 묻는 꼬리 질문인가. true면 "경험에서 확인되지 않음, 보완 필요"로 표시한다. */
  missingInfo: boolean;
};

/** STAR: 상황 · 과제 · 행동 · 결과 */
export type StarPart = "situation" | "task" | "action" | "result";

export const STAR_LABELS: Record<StarPart, string> = { situation: "상황", task: "과제", action: "행동", result: "결과" };

/** 답변의 한 부분이 근거로 삼은 경험 원문 문장 (원문에서 그대로 확인된 것) */
export type AnswerEvidence = { part: StarPart; quote: string };

/** 답변이 반영한 평가 기준 하나와, 그 답변이 어떻게 반영했는지 설명하는 한 줄 */
export type AnswerCriterion = { id: string; reason: string };

/** 1분 모범 답변 하나 (메인 질문마다 1개) */
export type BeiAnswer = {
  /** 약 300자(280~320자, 띄어쓰기 포함)의 STAR 구조 답변 */
  text: string;
  /** 서버가 센 글자 수(띄어쓰기 포함) */
  length: number;
  /** 280~320자 안인가. false면 화면에 글자 수를 함께 보여 준다. */
  lengthOk: boolean;
  /** 반영한 평가 기준 (항상 1개 이상) */
  criteria: AnswerCriterion[];
  /** 근거가 된 경험 원문 문장 — STAR 부분별로, 원문에서 그대로 확인된 것만 담는다. */
  evidence: AnswerEvidence[];
  /** 원문에 근거가 없어 답변에 쓰지 않은 STAR 부분 (행동·결과가 없으면 보완이 필요하다) */
  missingParts: StarPart[];
  /** verified: 근거가 원문에서 확인됨 / unverified: "근거 확인 안 됨"으로 표시 */
  evidenceStatus: "verified" | "unverified";
  /** unverified인 이유 */
  evidenceIssue?: string;
  /** 경험 글에 정보가 부족해 지원자가 보완해야 하는가 ("경험에서 확인되지 않음, 보완 필요") */
  needsSupplement: boolean;
  /** 무엇이 부족한지 한 줄 */
  supplementNote?: string;
};

export type BeiQuestion = {
  /** q1 ~ q5 */
  id: string;
  question: string;
  /** 이 질문이 확인하려는 평가 기준의 번호(lib/bei-criteria.ts). 알 수 없는 값이면 비워 둔다. */
  criterionId?: string;
  answer: BeiAnswer;
  followUps: FollowUp[];
};

export type GenerateResponse = { questions: BeiQuestion[] };
