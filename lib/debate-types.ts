// Design Ref: §3.3 토론 면접 (nice) — 미리 준비한 토론 주제의 모양. (작업 21번)

export type DebateCategory = "finance" | "general";

export const DEBATE_CATEGORY_LABELS: Record<DebateCategory, string> = {
  finance: "금융",
  general: "일반",
};

export type DebateTopic = {
  /** 주소와 API에서 쓰는 번호표 (예: "f1") */
  id: string;
  category: DebateCategory;
  /** 토론 주제. 찬성·반대가 분명하도록 "~해야 한다."처럼 한 문장으로 쓴다. */
  title: string;
  /** 두 입장에 치우치지 않게 쓴 한두 문장의 배경 설명. 숫자·통계·기사 문장은 넣지 않는다. */
  background: string;
};

// ---- 의견 생성 (작업 22번) ----

/** 사용자가 고른 입장. pro=찬성, con=반대 */
export type Stance = "pro" | "con";

export const STANCE_LABELS: Record<Stance, string> = { pro: "찬성", con: "반대" };

/** 의견 하나. kind로 "일반적으로 알려진 사실"과 "의견·주장"을 구분해 보여 준다. */
export type OpinionItem = {
  /** 한 문장 주장 */
  point: string;
  kind: "fact" | "opinion";
  /** 근거나 설명 한두 문장 */
  detail: string;
};

/** 생각지 못한 관점 */
export type InsightItem = {
  viewpoint: string;
  detail: string;
};

export type OpinionsResponse = {
  topicId: string;
  stance: Stance;
  /** 고른 입장의 의견 (3개 이상) */
  chosen: OpinionItem[];
  /** 반대 입장의 논거 (3개 이상) */
  opposing: OpinionItem[];
  /** 생각지 못한 관점 (1개 이상) */
  insights: InsightItem[];
};
