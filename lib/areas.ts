// Design Ref: §2.1 화면 지도 — 시작 화면에서 고르는 세 가지 면접 영역.
// `ready`는 그 영역의 화면이 만들어졌는지를 나타낸다. 영역 화면을 만드는 작업이 끝날 때 true로 바꾼다.
//   BEI → 작업 6번, AI 리터러시 → 작업 16번, 토론 → 작업 22번(nice)

export type Area = {
  id: "bei" | "literacy" | "debate";
  href: string;
  title: string;
  subtitle: string;
  description: string;
  ready: boolean;
};

export const AREAS: Area[] = [
  {
    id: "bei",
    href: "/bei",
    title: "BEI 면접",
    subtitle: "경험 맞춤",
    description: "자기소개서·경험을 넣으면 질문과 꼬리 질문, 1분 모범 답변을 만들어 줍니다.",
    ready: true,
  },
  {
    id: "literacy",
    href: "/literacy",
    title: "AI 리터러시 면접",
    subtitle: "모의 시험",
    description: "여러 파일과 AI 어시스트로 푸는 10문제 모의 시험입니다. 토큰과 질문 횟수가 제한됩니다.",
    ready: true,
  },
  {
    id: "debate",
    href: "/debate",
    title: "토론 면접",
    subtitle: "찬반 연습",
    description: "금융·일반 주제를 고르면 찬성·반대 의견과 새로운 관점을 보여 줍니다.",
    ready: false,
  },
];
