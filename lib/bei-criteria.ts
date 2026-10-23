// Design Ref: §6 폴더 구조 `lib/bei-criteria.ts` — BEI 모범 답변에 붙이는 "반영한 평가 기준"을 앱에 내장한 자료. (PRD 5번 BEI 규칙, PLAN 5번)
//
// ⚠ 이 기준은 은행의 공식 점수표가 아니다. 은행별 채점표는 공개되어 있지 않아서 찾지 못했다.
//   아래 내용은 (1) BEI(행동사건면접)와 STAR 구조에 대한 공개 설명, (2) 보도·채용 정보에 실린 은행 인재상,
//   (3) 면접 후기에서 반복해서 나오는 이야기를 바탕으로 직접 정리한 요약이다. 문장은 모두 새로 썼다.
//   화면에는 항상 BEI_CRITERIA_NOTICE를 함께 보여 준다.
//
// 이 파일은 순수한 자료만 담는다. (서버·브라우저 어디서든 불러 쓸 수 있다)

/** 화면에서 평가 기준 옆에 함께 보여 주는 안내문 (PRD 5번 BEI 규칙) */
export const BEI_CRITERIA_NOTICE = "공식 점수표가 아닌 공개 정보 요약이며 은행마다 다릅니다";

/** 이 기준이 어떤 근거에서 나왔는가 */
export type CriterionBasis =
  /** BEI·STAR에 대한 일반적인 공개 설명 */
  | "bei-general"
  /** 보도·채용 정보에 실린 은행 인재상 (최신 공식 문구와 다를 수 있음) */
  | "bank-talent"
  /** 면접 후기에서 반복되는 이야기 (공식 기준 아님) */
  | "interview-reports";

export type BeiCriterion = {
  id: string;
  /** 화면에 보여 주는 이름 */
  name: string;
  /** 화면에 보여 주는 한 줄 설명 */
  summary: string;
  /** 좋은 답변에서 보이는 모습. AI가 답변을 만들 때 참고한다. (경험에 없는 내용을 만들어 넣으라는 뜻이 아니다) */
  lookFor: string[];
  /** 이 기준을 깊이 확인하는 꼬리 질문의 방향 */
  followUpHints: string[];
  basis: CriterionBasis;
};

export const BEI_CRITERIA = [
  {
    id: "situation-task",
    name: "상황·과제의 구체성",
    summary: "언제, 어디서, 어떤 역할로, 무엇을 해내야 했는지가 구체적으로 드러난다.",
    lookFor: [
      "시기·장소·함께한 사람 등 배경이 짧고 분명하다.",
      "내가 맡은 역할과 이루려던 목표(과제)가 구분되어 있다.",
      "일반론이 아니라 실제로 있었던 한 가지 사건을 다룬다.",
    ],
    followUpHints: ["그때 정확히 어떤 상황이었나요?", "당시 본인의 역할과 목표는 무엇이었나요?"],
    basis: "bei-general",
  },
  {
    id: "own-action",
    name: "내가 한 행동",
    summary: "'우리'가 아니라 '내가' 무엇을 어떤 순서로 했는지 관찰할 수 있게 말한다.",
    lookFor: [
      "내가 직접 한 행동이 단계별로 드러난다.",
      "왜 그 방법을 골랐는지 이유가 있다.",
      "팀의 성과와 나의 기여가 구분되어 있다.",
    ],
    followUpHints: ["그중 본인이 직접 한 일은 무엇인가요?", "다른 방법도 있었을 텐데 왜 그렇게 하셨나요?"],
    basis: "bei-general",
  },
  {
    id: "result-learning",
    name: "결과와 배운 점",
    summary: "행동의 결과를 가능한 한 구체적으로 말하고, 그 경험에서 배운 점과 이후의 변화까지 이어진다.",
    lookFor: [
      "결과가 사실대로 적혀 있다. (숫자가 경험에 있다면 함께 말한다)",
      "잘된 점뿐 아니라 아쉬운 점도 솔직하게 돌아본다.",
      "배운 점이 이후의 행동 변화로 이어진다.",
    ],
    followUpHints: ["결과는 어땠고, 어떻게 확인하셨나요?", "다시 한다면 무엇을 다르게 하시겠어요?"],
    basis: "bei-general",
  },
  {
    id: "consistency",
    name: "답변의 일관성",
    summary: "자기소개서와 답변, 꼬리 질문에 대한 대답이 서로 어긋나지 않는다.",
    lookFor: [
      "자기소개서에 쓴 사실과 말하는 내용이 같다.",
      "꼬리 질문이 이어져도 시기·역할·결과가 바뀌지 않는다.",
      "과장 없이 기억나는 만큼만 구체적으로 말한다.",
    ],
    followUpHints: ["자기소개서에는 이렇게 적으셨는데, 조금 더 설명해 주실 수 있나요?", "그 부분을 좀 더 자세히 말씀해 주세요."],
    basis: "interview-reports",
  },
  {
    id: "customer-first",
    name: "고객(상대) 중심 사고",
    summary: "상대의 입장과 필요를 먼저 헤아리고 그에 맞춰 행동한 경험이 보인다.",
    lookFor: [
      "상대가 원하는 것·불편한 점을 파악하려고 한 과정이 있다.",
      "내 방식이 아니라 상대 입장에서 해결책을 고른다.",
      "그 결과 상대의 반응이 어땠는지 말한다.",
    ],
    followUpHints: ["상대는 무엇을 가장 불편해했나요?", "상대 입장에서 어떤 점을 가장 신경 쓰셨나요?"],
    basis: "bank-talent",
  },
  {
    id: "communication-collaboration",
    name: "소통과 협력",
    summary: "의견이 다른 사람과 이야기하고 조율하며 함께 결과를 만든 경험이 보인다.",
    lookFor: [
      "의견이 달랐던 지점과 조율한 방법이 구체적이다.",
      "상대의 이야기를 듣고 내 의견을 바꾸거나 설득한 장면이 있다.",
      "혼자 해낸 이야기가 아니라 함께 만든 결과로 마무리된다.",
    ],
    followUpHints: ["의견이 달랐던 사람은 누구였고 어떻게 풀었나요?", "협업에서 본인이 맡은 역할은 무엇이었나요?"],
    basis: "bank-talent",
  },
  {
    id: "challenge-growth",
    name: "도전과 성장",
    summary: "새로운 시도를 하거나 어려움을 겪고도 스스로 성장하려 한 경험이 보인다.",
    lookFor: [
      "익숙하지 않은 일에 먼저 나서 본 계기가 있다.",
      "실패나 부족함을 인정하고 보완하려고 노력한 과정이 있다.",
      "이 경험이 앞으로의 업무에 어떻게 이어질지 연결한다.",
    ],
    followUpHints: ["왜 그 도전을 해 보려고 하셨나요?", "가장 어려웠던 순간과 극복 방법은 무엇이었나요?"],
    basis: "bank-talent",
  },
  {
    id: "integrity-responsibility",
    name: "정직과 책임감",
    summary: "원칙을 지키고 맡은 일에 끝까지 책임을 진 경험이 보인다.",
    lookFor: [
      "유혹이나 편한 길이 있었어도 원칙을 선택한 장면이 있다.",
      "실수가 있었다면 숨기지 않고 바로잡은 과정이 있다.",
      "맡은 일을 끝까지 마무리한 이야기가 있다.",
    ],
    followUpHints: ["그때 다른 선택도 가능했는데, 왜 그렇게 결정하셨나요?", "잘못된 부분은 어떻게 바로잡으셨나요?"],
    basis: "bank-talent",
  },
  {
    id: "calm-problem-solving",
    name: "침착한 문제 해결",
    summary: "곤란하거나 예상 밖의 상황에서도 침착하게 원인을 파악하고 해결한 경험이 보인다.",
    lookFor: [
      "당황스러운 상황에서 먼저 확인한 것과 우선순위가 분명하다.",
      "감정이 아니라 사실을 바탕으로 대응한다.",
      "해결 후 같은 문제를 막기 위해 한 일이 있다.",
    ],
    followUpHints: ["그 상황에서 가장 먼저 무엇을 확인하셨나요?", "동시에 해결할 일이 여러 개였다면 무엇부터 하셨나요?"],
    basis: "interview-reports",
  },
] as const satisfies readonly BeiCriterion[];

export type BeiCriterionId = (typeof BEI_CRITERIA)[number]["id"];

/** zod 등으로 "AI가 돌려준 기준 번호가 맞는지" 검사할 때 쓰는 번호 목록 */
export const BEI_CRITERION_IDS = BEI_CRITERIA.map((criterion) => criterion.id) as [BeiCriterionId, ...BeiCriterionId[]];

export function findBeiCriterion(id: string): BeiCriterion | undefined {
  return BEI_CRITERIA.find((criterion) => criterion.id === id);
}

// ---------------------------------------------------------------------------
// 은행별 인재상 메모 (참고용)
// ---------------------------------------------------------------------------
export type BankTalentNote = {
  bank: string;
  /** 검색으로 확인한 내용 요약 (직접 쓴 문장) */
  keywords: string[];
  /** 출처의 성격과 시기 */
  evidence: string;
  /** 확인 정도: reported=보도·채용 정보에서 확인 / secondary=커뮤니티 등 2차 자료만 확인 / unconfirmed=최신 공식 문구 확인 못 함 */
  confidence: "reported" | "secondary" | "unconfirmed";
};

/**
 * 은행별 인재상 요약. 공식 채용 홈페이지의 최신 문구와 다를 수 있다. (2026-10-22에 검색으로 확인한 내용)
 * 화면에 보여 줄 때는 "최신 인재상은 각 은행 채용 홈페이지에서 확인하세요"를 함께 적는다.
 */
export const BANK_TALENT_NOTES: readonly BankTalentNote[] = [
  {
    bank: "하나은행",
    keywords: ["사람에 대한 온기(Humanity)", "미래에 대한 용기(First Mover)", "성장에 대한 동기(Growth Mind)"],
    evidence: "2024년 2월 보도와 채용 정보 문구",
    confidence: "reported",
  },
  {
    bank: "우리은행",
    keywords: ["올바른 품성", "도전적·창의적인 금융전문가", "고객 소통 능력"],
    evidence: "커뮤니티 게시글과 2016~2017년 보도 (공식 자료는 확인 못 함)",
    confidence: "secondary",
  },
  {
    bank: "NH농협은행",
    keywords: ["금융전문가", "소통과 협력", "사회적 책임", "변화를 선도", "고객을 먼저 생각"],
    evidence: "자기소개서 후기 글 (공식 자료는 확인 못 함)",
    confidence: "secondary",
  },
  {
    bank: "신한은행",
    keywords: ["바르게·빠르게·다르게(핵심가치)", "열정과 창의성을 갖고 성장하는 인재"],
    evidence: "채용 안내문과 2016년 인사 담당자 발언 (최신 공식 인재상 문구는 확인 못 함)",
    confidence: "unconfirmed",
  },
  {
    bank: "KB국민은행",
    keywords: ["고객 우선", "영업 역량", "디지털 기본 소양", "도전 정신과 자기계발"],
    evidence: "2024~2025년 채용 보도와 과거 기사 (공식 인재상 문구는 확인 못 함)",
    confidence: "unconfirmed",
  },
];

/** 정리하면서 참고한 자료. 검색 결과로 찾은 것이며, 모든 문서를 끝까지 직접 읽지는 않았다. (확인일 2026-10-22) */
export const BEI_CRITERIA_SOURCES = [
  { title: "BEI(행동사건면접) 개념 소개", url: "https://eopla.net/magazines/26084" },
  { title: "KB국민은행 신입행원 채용 보도(2025 상반기)", url: "https://www.smarttoday.co.kr/ko-kr/articles/76488" },
  { title: "신한은행 신입행원 채용 보도(2025 상반기)", url: "https://www.smarttoday.co.kr/ko-kr/articles/75439" },
  { title: "신한은행 인사 담당자 인터뷰(2016)", url: "https://www.mt.co.kr/finance/2016/08/21/2016081814402172444" },
] as const;

// ---------------------------------------------------------------------------
// AI에게 줄 지침 글
// ---------------------------------------------------------------------------

/**
 * 평가 기준 번호(id)와 이름·설명만 한 줄씩 담은 짧은 목록 글을 만든다. (질문을 만들 때 "이 질문이 확인하려는 기준"을 고르게 하는 용도)
 */
export function buildCriteriaList(): string {
  return BEI_CRITERIA.map((criterion) => `- ${criterion.id} (${criterion.name}): ${criterion.summary}`).join("\n");
}

/**
 * AI가 모범 답변을 만들 때 참고할 평가 기준 목록 글을 만든다. (개발자가 쓴 지침이므로 안전하게 그대로 넣는다)
 * 답변마다 이 중 관련 있는 기준의 번호(id)를 골라 돌려주게 하면 "반영한 평가 기준" 표시를 만들 수 있다.
 */
export function buildCriteriaGuide(): string {
  const lines = BEI_CRITERIA.map((criterion) => {
    const look = criterion.lookFor.join(" / ");
    return `- ${criterion.id} (${criterion.name}): ${criterion.summary} 좋은 답변: ${look}`;
  });
  return [
    "아래는 면접 답변을 돌아볼 때 쓰는 평가 기준이다. 공식 점수표가 아니다.",
    "각 답변에는 이 중 실제로 그 답변에 담긴 기준만 골라 번호(id)로 적는다. 담기지 않은 기준을 억지로 붙이지 않는다.",
    ...lines,
  ].join("\n");
}
