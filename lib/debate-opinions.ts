// Design Ref: §3.3 토론 면접 / §4 `/api/debate/opinions` — 고른 주제와 입장에 대해 의견·반대 논거·새로운 관점을 만든다. (서버 전용)
// PRD 5번 규칙: 고른 입장 3개 이상 + 반대 입장 3개 이상, 사실과 의견을 구분해 표시, 생각지 못한 관점 1개 이상,
// 기사·연구소 글은 그대로 옮기지 않고 주제만 참고한다. 결과는 저장하지 않는다.
// AI에게는 입장을 알려 주지 않고 "찬성 쪽 / 반대 쪽" 논거를 각각 쓰게 한 뒤, 어느 쪽이 "고른 입장"인지는 서버가 정한다.
// (AI에게 "고른 입장"을 맡겼더니 반대를 골랐을 때 찬성 논거를 내놓는 실수가 있어서 바꿨다.)
import "server-only";
import { z } from "zod";
import { callAiJson } from "@/lib/ai";
import type { DebateTopic, OpinionItem, OpinionsResponse, Stance } from "@/lib/debate-types";

export const MIN_OPINIONS = 3;
export const MIN_INSIGHTS = 1;

const INSTRUCTIONS = [
  "너는 은행·금융권 토론 면접을 준비하는 지원자를 돕는 도우미다.",
  "<자료>에 토론 주제(한 문장의 주장)와 배경이 있다. 주제 문장에 동의하는 쪽이 '찬성', 동의하지 않는 쪽이 '반대'다.",
  "",
  "다음을 만든다.",
  "- pro: '찬성' 쪽의 의견 4개. 주제 문장이 옳다는 근거만 쓴다.",
  "- con: '반대' 쪽의 의견 4개. 주제 문장이 옳지 않다는 근거만 쓴다.",
  "- insights: 두 쪽이 흔히 놓치는 '생각지 못한 관점' 1~2개. 이해관계자, 제3의 대안, 장기·부작용 같은 시각이다.",
  "찬성과 반대는 서로 다른 근거(예: 고객, 은행, 사회, 장기 영향)를 다루고, 각자 가장 설득력 있는 논거를 쓴다. 반드시 pro에는 찬성 논거만, con에는 반대 논거만 넣는다.",
  "",
  "pro·con의 각 항목:",
  "- point: 주장 한 문장(80자 이내).",
  '- kind: "fact" 또는 "opinion". 누구나 확인할 수 있는 일반적인 사실·제도·원리는 "fact", 가치 판단·예상·주장은 "opinion"이다. 확실하지 않으면 반드시 "opinion"이다.',
  "- detail: 근거나 설명 한두 문장(150자 이내).",
  "insights의 각 항목: viewpoint(관점 한 문장, 80자 이내), detail(설명 한두 문장, 150자 이내).",
  "",
  "지켜야 할 것:",
  "- 구체적인 숫자·통계·연도·기관 이름·보고서나 기사 인용을 쓰지 않는다. 지어낸 수치는 사실이 아니다. 기사나 연구소 글을 옮기지 않고 주제만 참고해 직접 쓴다.",
  "- 한쪽을 일방적으로 깎아내리거나 정치적 편을 들지 않는다. 존중하는 말투로 쓴다.",
  "- 같은 말을 되풀이하지 않는다.",
  '- 출력은 {"pro":[{"point":"","kind":"","detail":""}],"con":[...],"insights":[{"viewpoint":"","detail":""}]} 모양의 JSON 하나뿐이다.',
].join("\n");

const opinionSchema = z.object({
  point: z.string().trim().min(5).max(200),
  kind: z.enum(["fact", "opinion"]),
  detail: z.string().trim().min(5).max(400),
});

const aiOutputSchema = z.object({
  pro: z.array(opinionSchema).min(MIN_OPINIONS).max(8),
  con: z.array(opinionSchema).min(MIN_OPINIONS).max(8),
  insights: z
    .array(z.object({ viewpoint: z.string().trim().min(5).max(200), detail: z.string().trim().min(5).max(400) }))
    .min(MIN_INSIGHTS)
    .max(4),
});

/** 통계처럼 보이는 수치(%, 억·조 원, 몇 배 등)가 있는가. 이런 수치는 지어냈을 수 있어서 "사실"로 보여 주지 않는다. */
const STATISTIC_PATTERN = /\d[\d,.]*\s*(%|퍼센트|배|조|억|만\s*원|천\s*원|원|명|개국|곳|건|년)/;

/**
 * "사실"로 표시된 항목에 통계 같은 수치가 있으면 "의견"으로 내려서 보여 준다.
 * (AI가 지어낸 수치를 사실처럼 보여 주지 않기 위한 안전장치. 규칙은 프롬프트에도 적혀 있다.)
 */
export function downgradeUnsafeFacts(items: OpinionItem[]): OpinionItem[] {
  return items.map((item) => (item.kind === "fact" && STATISTIC_PATTERN.test(`${item.point} ${item.detail}`) ? { ...item, kind: "opinion" as const } : item));
}

export async function generateOpinions(topic: DebateTopic, stance: Stance): Promise<OpinionsResponse> {
  const output = await callAiJson(
    {
      instructions: INSTRUCTIONS,
      materials: [{ label: "토론 주제", text: `주제: ${topic.title}\n배경: ${topic.background}` }],
      userMessage: "위 주제에 대해 찬성 쪽 의견, 반대 쪽 의견, 새로운 관점을 만들어 줘.",
      maxOutputTokens: 5000,
    },
    aiOutputSchema,
  );
  const pro = downgradeUnsafeFacts(output.pro);
  const con = downgradeUnsafeFacts(output.con);
  return {
    topicId: topic.id,
    stance,
    chosen: stance === "pro" ? pro : con,
    opposing: stance === "pro" ? con : pro,
    insights: output.insights,
  };
}
