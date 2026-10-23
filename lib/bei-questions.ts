// Design Ref: §4 `/api/bei/generate` — 고른 경험 하나의 원문에서 질문 5개와 꼬리 질문(질문마다 2개)을 만든다. (서버 전용)
// 규칙(PRD 5번): 경험당 질문 5개, 질문마다 꼬리 질문 2개, 꼬리 질문에는 답변 대신 "답변 방향 한 줄"만 붙인다.
//   글에 없는 사실을 있었던 것처럼 전제하지 않는다. (작업 10번에서 모범 답변·근거·평가 기준을 같은 호출에 이어 붙인다)
import "server-only";
import { z } from "zod";
import { AiError, callAiJson } from "@/lib/ai";
import { buildCriteriaList, findBeiCriterion } from "@/lib/bei-criteria";
import type { BeiQuestion } from "@/lib/bei-types";

export const QUESTIONS_PER_EXPERIENCE = 5;
export const FOLLOW_UPS_PER_QUESTION = 2;

const INSTRUCTIONS = [
  "너는 은행 신입 채용 BEI(행동사건면접)의 면접관 역할로 질문을 만드는 도우미다.",
  "자료는 지원자가 직접 쓴 경험 한 가지의 원문이다. 이 경험을 깊이 파고드는 질문 5개와, 질문마다 꼬리 질문 2개를 만든다.",
  "",
  "질문 규칙:",
  "- 질문 5개는 서로 다른 관점을 묻는다. (예: 상황과 맡은 역할, 선택한 방법과 이유, 어려웠던 점이나 갈등, 결과를 확인한 방법, 배운 점과 이후의 변화) 같은 내용을 반복해서 묻지 않는다.",
  '- 면접관이 실제로 말하듯 자연스러운 존댓말 한 문장으로 쓴다. (예: "그때 가장 어려웠던 점은 무엇이었나요?")',
  "- 글에 적힌 사실을 바탕으로 묻는다. 글에 없는 사람·숫자·사건을 이미 있었던 일처럼 전제하지 않는다.",
  "- 한 질문에는 질문 하나만 담는다.",
  "- criterionId: 아래 평가 기준 중 그 질문이 가장 잘 확인하는 기준의 id를 하나 적는다. 목록에 없는 값은 쓰지 않는다.",
  "",
  "꼬리 질문 규칙:",
  "- 꼬리 질문 2개는 같은 질문에 대한 답을 더 깊이 파고든다. (구체적인 행동, 근거, 숫자, 다른 선택지, 이유)",
  "- answerDirection: 지원자가 그 꼬리 질문에 답할 때 경험의 어떤 부분을 짚어 말하면 좋은지를 60자 안팎의 한 줄로 쓴다. 답변을 대신 써 주지 않는다. 글에 없는 내용을 지어내지 않는다.",
  '- 글에 없는 정보를 묻는 꼬리 질문이면 missingInfo를 true로 하고, answerDirection에 "경험에서 확인되지 않음, 보완 필요"를 넣는다. 글에 있는 내용이면 false다.',
  "",
  "평가 기준 목록:",
  buildCriteriaList(),
  "",
  '출력은 다음 모양의 JSON 하나뿐이다: {"questions":[{"question":"","criterionId":"","followUps":[{"question":"","answerDirection":"","missingInfo":false},{"question":"","answerDirection":"","missingInfo":false}]}]}',
].join("\n");

const outputSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().trim().min(5).max(300),
        criterionId: z.string().optional(),
        followUps: z
          .array(
            z.object({
              question: z.string().trim().min(5).max(300),
              answerDirection: z.string().trim().min(3).max(300),
              missingInfo: z.boolean().optional(),
            }),
          )
          .min(FOLLOW_UPS_PER_QUESTION),
      }),
    )
    .min(QUESTIONS_PER_EXPERIENCE),
});

/** 경험 원문 하나로 질문 5개와 꼬리 질문(질문마다 2개)을 만든다. */
export async function generateQuestions(experienceText: string): Promise<BeiQuestion[]> {
  const output = await callAiJson(
    {
      instructions: INSTRUCTIONS,
      materials: [{ label: "경험 원문", text: experienceText }],
      userMessage: "위 경험으로 면접 질문과 꼬리 질문을 만들어 줘.",
      maxOutputTokens: 8000,
    },
    outputSchema,
  );

  const questions = output.questions.slice(0, QUESTIONS_PER_EXPERIENCE).map((item, index): BeiQuestion => ({
    id: `q${index + 1}`,
    question: item.question,
    // AI가 목록에 없는 기준을 말했다면 표시하지 않는다.
    criterionId: item.criterionId && findBeiCriterion(item.criterionId) ? item.criterionId : undefined,
    followUps: item.followUps.slice(0, FOLLOW_UPS_PER_QUESTION).map((followUp) => ({
      question: followUp.question,
      answerDirection: followUp.answerDirection,
      missingInfo: followUp.missingInfo ?? false,
    })),
  }));

  if (questions.length !== QUESTIONS_PER_EXPERIENCE) {
    throw new AiError("bad_output", "질문을 충분히 만들지 못했습니다. 다시 시도해 주세요.", true);
  }
  return questions;
}
