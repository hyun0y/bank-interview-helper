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
