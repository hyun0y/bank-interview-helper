// Design Ref: §4 `/api/bei/generate` — 고른 경험 하나의 원문에서 질문 5개, 꼬리 질문(질문마다 2개), 1분 모범 답변(질문마다 1개)을 만든다. (서버 전용)
// 규칙(PRD 5번):
//   - 경험당 질문 5개, 질문마다 꼬리 질문 2개 (꼬리 질문에는 답변 대신 "답변 방향 한 줄"만)
//   - 모범 답변은 280~320자(띄어쓰기 포함) STAR 구조. 길이를 벗어나면 1회 다시 만들고, 그래도 벗어나면 글자 수를 표시한다.
//   - 답변에는 경험 원문에 있는 사실만 쓴다. STAR 부분마다 근거 문장을 받아 원문과 대조하고, 확인하지 못하면 "근거 확인 안 됨"으로 표시한다.
//   - 원문에 행동·결과가 없으면 지어내지 않고 "경험에서 확인되지 않음, 보완 필요"로 표시한다.
//   - 모든 답변에 반영한 평가 기준을 한 줄 이상 붙인다.
import "server-only";
import { z } from "zod";
import { AiError, callAiJson } from "@/lib/ai";
import { checkAnswer, countAnswerChars, isAnswerLengthOk, type StarEvidenceInput } from "@/lib/answer-check";
import { TARGET_CHARS, describeLengthFix, formatLengthFix, isTooLong, sentenceLengths, trimToRange } from "@/lib/answer-length";
import { BEI_CRITERIA, buildCriteriaList, findBeiCriterion } from "@/lib/bei-criteria";
import { STAR_LABELS, type AnswerCriterion, type BeiAnswer, type BeiQuestion, type StarPart } from "@/lib/bei-types";
import { LIMITS } from "@/lib/limits";

export const QUESTIONS_PER_EXPERIENCE = 5;
export const FOLLOW_UPS_PER_QUESTION = 2;

/** 이보다 짧은 원문은 사실이 부족해 300자 답변을 채우기 어렵다고 본다. */
const SHORT_ORIGINAL_CHARS = 250;

/** 길이를 맞추려고 AI에게 다시 쓰기를 맡기는 최대 횟수. 원문이 짧을수록 사실이 모자라 늘리기 어려우므로 줄인다. (CHECK.md 4번) */
const MAX_LENGTH_ROUNDS = 3;
/** 원문이 이보다 짧으면 사실이 너무 적어 다시 쓰기를 1회만 한다. (250자 미만은 최대 2회) */
const VERY_SHORT_ORIGINAL_CHARS = 120;
/** 이 시간(ms)이 지나면 새 다시 쓰기 회차를 시작하지 않는다. 요청 제한 시간(120초) 안에 끝내기 위한 것이다. */
const LENGTH_FIX_BUDGET_MS = 70_000;

function buildInstructions(originalChars: number): string {
  // 원문이 충분히 길면 길이를 반드시 맞추게 하고, 원문이 아주 짧을 때만 지어내지 않기 위해 짧은 채로 두는 것을 허용한다.
  const lengthEscape = originalChars >= SHORT_ORIGINAL_CHARS
    ? "- 원문은 충분히 길다. 답변은 반드시 280자 이상이어야 한다. 짧게 끝내지 않는다."
    : "- 원문이 짧아 사실이 부족하면 억지로 지어내서 늘리지 않는다. 원문에 있는 사실을 서로 연결해 이유와 순서를 설명하는 방식으로 최대한 길이를 맞추고, 그래도 모자라면 짧은 채로 둔다.";
  return [
    "너는 은행 신입 채용 BEI(행동사건면접)의 면접관 역할로 질문을 만들고, 지원자를 위한 모범 답변을 쓰는 도우미다.",
    "자료는 지원자가 직접 쓴 경험 한 가지의 원문이다. 이 경험을 깊이 파고드는 질문 5개를 만들고, 질문마다 꼬리 질문 2개와 1분 모범 답변 1개를 쓴다.",
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
    "모범 답변(answer) 규칙:",
    '- 지원자 본인이 면접에서 1분 동안 말하는 1인칭 구어체 존댓말로 쓴다. (예: "저는 … 했습니다.") 한 단락으로 쓰고 줄바꿈·목록·머리말을 쓰지 않는다.',
    "- 길이는 띄어쓰기를 포함해 280자 이상 320자 이하여야 한다. 글자 수를 실제보다 적게 세는 경향이 있으므로, 350자 안팎을 목표로 넉넉히 쓴다. 보통 8~10개 문장(문장당 35~50자)이다. 짧게 끝내지 말고, 원문에 있는 세부 사실(누가·언제·몇 명·어떻게·왜)을 풀어서 문장을 채운다.",
    "- 답변을 쓴 뒤 글자 수를 세어 보고 280자에 못 미치면, 원문에 있는 사실을 더 구체적으로 풀어 써서 늘린 다음에 내보낸다.",
    "- 상황 → 과제 → 행동 → 결과 순서(STAR)로 이어지게 쓴다.",
    "- 가장 중요한 규칙: 답변에는 자료(경험 원문)에 적힌 사실만 쓴다. 원문에 없는 경험·숫자·인물·기관·성과·결과를 만들어 넣지 않는다.",
    "- 특히 '결과', '성과', '배운 점', '느낀 점', '이후의 변화'는 원문에 그 내용이 실제로 적혀 있을 때만 쓴다. 원문에 없다면 '배웠습니다', '깨달았습니다', '이후에는 ~하게 되었습니다' 같은 문장도 쓰지 않는다.",
    "- 숫자는 원문에 적힌 것만 쓴다. 항목을 나열할 때는 숫자 대신 '첫째', '둘째'처럼 글자로 쓴다.",
    "- evidence: 상황(situation), 과제(task), 행동(action), 결과(result) 각각에 대해, 답변에 쓴 내용의 근거가 된 원문 문장을 원문에서 한 글자도 바꾸지 말고 그대로 복사한다.",
    "  원문에 그 부분의 내용이 없으면 빈 문자열(\"\")로 두고, 그 부분은 답변에 쓰지 않는다. (과제는 원문에 목표나 맡은 역할이 적혀 있을 때만 그 문장을 적는다. 없으면 빈 문자열로 두고 답변에 과제를 지어내지 않는다)",
    lengthEscape,
    "- criteria: 아래 평가 기준 중 그 답변에 실제로 담긴 기준을 1~3개 고르고, 각각 id와 reason(그 답변이 그 기준을 어떻게 보여 주는지 40자 안팎의 한 줄)을 적는다. 담기지 않은 기준을 억지로 붙이지 않는다.",
    "",
    "경험 전체의 빠진 부분(experienceGaps):",
    "- 자료(경험 원문) 전체를 보고, 원문에 아예 적혀 있지 않은 STAR 부분(\"situation\", \"task\", \"action\", \"result\" 중)을 experienceGaps 배열에 적는다. 모두 적혀 있으면 빈 배열이다. 답변 하나에 안 쓰였다는 이유로 넣지 않는다. 원문 어디에도 없을 때만 넣는다.",
    "",
    "평가 기준 목록:",
    buildCriteriaList(),
    "",
    '출력은 다음 모양의 JSON 하나뿐이다: {"experienceGaps":[],"questions":[{"question":"","criterionId":"","answer":{"text":"","evidence":{"situation":"","task":"","action":"","result":""},"criteria":[{"id":"","reason":""}]},"followUps":[{"question":"","answerDirection":"","missingInfo":false},{"question":"","answerDirection":"","missingInfo":false}]}]}',
  ].join("\n");
}

const evidenceSchema = z
  .object({
    situation: z.string().optional(),
    task: z.string().optional(),
    action: z.string().optional(),
    result: z.string().optional(),
  })
  .optional();

const rawAnswerSchema = z.object({
  text: z.string().trim().min(30).max(1200),
  evidence: evidenceSchema,
  criteria: z.array(z.object({ id: z.string(), reason: z.string().optional() })).max(8).optional(),
});

const outputSchema = z.object({
  experienceGaps: z.array(z.string()).optional(),
  questions: z
    .array(
      z.object({
        question: z.string().trim().min(5).max(300),
        criterionId: z.string().optional(),
        answer: rawAnswerSchema,
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

const rewriteSchema = z.object({
  answers: z
    .array(
      z.object({
        index: z.number().int().min(0),
        text: z.string().trim().min(30).max(1200),
        evidence: evidenceSchema,
      }),
    )
    .min(1),
});

type Draft = { text: string; evidence: StarEvidenceInput };

/** 정해진 글자 수 범위에서 얼마나 벗어났는지 (범위 안이면 0) */
function lengthDistance(text: string): number {
  const length = countAnswerChars(text);
  return Math.max(0, LIMITS.ANSWER_MIN_CHARS - length, length - LIMITS.ANSWER_MAX_CHARS);
}

/**
 * 길이가 범위를 벗어난 답변들을 한 번의 요청으로 다시 쓴다. (한 회차)
 * AI는 글자 수를 정확히 세지 못하므로, 각 초안의 "문장별 글자 수"와 "몇 자(문장 몇 개)를 더/덜"을 함께 알려 준다.
 * 다시 쓴 결과가 오히려 더 멀어졌다면 이전 답변을 그대로 둔다.
 */
async function rewriteForLength(
  original: string,
  questions: { question: string }[],
  drafts: Draft[],
  badIndexes: number[],
): Promise<void> {
  const rewrite = await callAiJson(
    {
      instructions: [
        "너는 면접 모범 답변의 글자 수를 맞추는 도우미다.",
        `자료의 '고칠 답변 초안'은 각각 ${LIMITS.ANSWER_MIN_CHARS}~${LIMITS.ANSWER_MAX_CHARS}자(띄어쓰기 포함, 목표 ${TARGET_CHARS}자)여야 하는데 길이가 맞지 않는다.`,
        "초안마다 length(지금 글자 수), sentenceLengths(문장별 글자 수), fix(몇 자를 더하거나 덜어야 하는지)를 준다. fix를 그대로 따른다. 글자 수를 직접 세려고 하지 말고 문장 단위로 늘리고 줄인다.",
        "늘려야 하면 '경험 원문'에 있는 사실(시기·사람·횟수·방법·이유·결과)을 풀어서 문장을 추가하거나 기존 문장에 구체적인 내용을 덧붙인다. 줄여야 하면 덜 중요한 문장을 통째로 뺀다.",
        "초안마다 같은 index로 고쳐 쓴다. 고친 뒤에도 상황→과제→행동→결과 순서와 1인칭 구어체 존댓말, 한 단락을 유지한다. 숫자 대신 '첫째', '둘째'처럼 쓴다.",
        "가장 중요한 규칙: '경험 원문'에 없는 사실·숫자·인물·성과·결과·배운 점·느낀 점은 절대 추가하지 않는다.",
        original.length >= SHORT_ORIGINAL_CHARS
          ? "원문은 충분히 길다. 반드시 280자 이상 320자 이하로 만든다. 초안과 같은 길이로 돌려주지 않는다."
          : "원문이 짧아 사실이 부족하면 억지로 늘리지 않고 가능한 만큼만 고친다.",
        "evidence에는 상황(situation)·과제(task)·행동(action)·결과(result) 각각의 근거가 된 원문 문장을 원문에서 한 글자도 바꾸지 말고 그대로 복사한다. 원문에 그 내용이 없으면 빈 문자열로 두고 그 부분은 쓰지 않는다.",
        '출력은 {"answers":[{"index":0,"text":"","evidence":{"situation":"","task":"","action":"","result":""}}]} 모양의 JSON 하나뿐이다.',
      ].join("\n"),
      materials: [
        { label: "경험 원문", text: original },
        {
          label: "고칠 답변 초안",
          text: JSON.stringify(
            badIndexes.map((index) => {
              const fix = describeLengthFix(drafts[index].text);
              return {
                index,
                question: questions[index].question,
                length: countAnswerChars(drafts[index].text),
                sentenceLengths: sentenceLengths(drafts[index].text),
                fix: fix ? formatLengthFix(fix) : "길이는 맞다. 그대로 둔다.",
                text: drafts[index].text,
              };
            }),
          ),
        },
      ],
      userMessage: "초안을 길이에 맞게 고쳐 줘.",
      maxOutputTokens: 6000,
      tier: "quality",
    },
    rewriteSchema,
  );

  const lengthLog: string[] = [];
  for (const fixed of rewrite.answers) {
    if (!badIndexes.includes(fixed.index)) continue;
    const before = countAnswerChars(drafts[fixed.index].text);
    const after = countAnswerChars(fixed.text);
    lengthLog.push(`${before}→${after}`);
    if (lengthDistance(fixed.text) <= lengthDistance(drafts[fixed.index].text)) {
      drafts[fixed.index] = { text: fixed.text, evidence: fixed.evidence ?? {} };
    }
  }
  // 글자 수만 남긴다. (글 내용은 기록하지 않는다)
  console.warn(`[bei/generate] 길이 다시 쓰기 결과(글자 수): ${lengthLog.join(", ")}`);
}

/**
 * 모든 답변을 280~320자에 가깝게 맞춘다. (CHECK.md 4번)
 *  1) 너무 긴 답변은 AI를 부르지 않고 서버가 문장을 덜어내 맞춘다.
 *  2) 그래도 범위 밖인 답변(주로 짧은 것)은 문장별 글자 수를 알려 주며 최대 3회까지 다시 쓰게 한다. 모자란 답변만 보낸다.
 *  3) 마지막으로 길어진 답변은 한 번 더 문장을 덜어낸다.
 * 끝내 맞추지 못한 답변은 그대로 두고 화면이 글자 수와 안내를 보여 준다. (없는 사실을 지어내 늘리지 않는다)
 */
async function fitAnswerLengths(original: string, questions: { question: string }[], drafts: Draft[], startedAt: number): Promise<void> {
  const trimLong = () => {
    for (const draft of drafts) if (isTooLong(draft.text)) draft.text = trimToRange(draft.text);
  };
  trimLong();

  const maxRounds = original.length >= SHORT_ORIGINAL_CHARS ? MAX_LENGTH_ROUNDS : original.length >= VERY_SHORT_ORIGINAL_CHARS ? 2 : 1;
  for (let round = 1; round <= maxRounds; round++) {
    const badIndexes = drafts.flatMap((draft, index) => (isAnswerLengthOk(draft.text) ? [] : [index]));
    if (badIndexes.length === 0) break;
    if (Date.now() - startedAt > LENGTH_FIX_BUDGET_MS) break;
    try {
      await rewriteForLength(original, questions, drafts, badIndexes);
    } catch (err) {
      // 이전 답변을 그대로 쓴다. (글 내용은 기록하지 않고 실패 종류만 남긴다)
      console.warn("[bei/generate] 길이 다시 쓰기에 실패해 이전 답변을 씁니다:", err instanceof AiError ? err.kind : "unknown");
      break;
    }
    trimLong();
  }
}

function cleanText(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").trim();
}

/** AI가 적은 평가 기준에서 목록에 없는 것을 빼고, 최대 3개로 줄인다. 하나도 없으면 질문의 기준으로 채운다. */
function buildCriteria(
  raw: { id: string; reason?: string }[] | undefined,
  questionCriterionId: string | undefined,
): AnswerCriterion[] {
  const result: AnswerCriterion[] = [];
  for (const item of raw ?? []) {
    const criterion = findBeiCriterion(item.id);
    if (!criterion || result.some((existing) => existing.id === criterion.id)) continue;
    result.push({ id: criterion.id, reason: item.reason?.trim() || criterion.summary });
    if (result.length === 3) break;
  }
  if (result.length === 0) {
    // 모든 답변에 평가 기준을 한 줄 이상 붙인다. (PRD 5번) AI가 고르지 못했으면 그 질문이 확인하려던 기준을 쓴다.
    const fallback = (questionCriterionId && findBeiCriterion(questionCriterionId)) || BEI_CRITERIA[0];
    result.push({ id: fallback.id, reason: "이 질문이 확인하려는 기준입니다." });
  }
  return result;
}

function buildAnswer(
  original: string,
  experienceGaps: StarPart[],
  draft: Draft,
  rawCriteria: { id: string; reason?: string }[] | undefined,
  questionCriterionId: string | undefined,
): BeiAnswer {
  const text = cleanText(draft.text);
  const check = checkAnswer(text, draft.evidence, original);

  // "보완 필요"는 이 답변에 안 쓰인 부분이 경험 원문 전체에도 없을 때(또는 근거라고 적은 문장을 원문에서 찾지 못했을 때)만 표시한다.
  // 답변이 다루는 질문에 따라 결과를 안 쓰는 것은 자연스러우므로, 원문에 결과가 있는데 이 답변에만 없는 경우는 표시하지 않는다.
  // (상황·과제는 한 문장으로 합쳐 쓰는 일이 많아 기준에서 뺀다)
  const lacking = [...check.missingParts.filter((part) => experienceGaps.includes(part)), ...check.unfoundParts];
  const missingKey = lacking.filter((part, index, all) => (part === "action" || part === "result") && all.indexOf(part) === index);
  const needsSupplement = missingKey.length > 0;

  return {
    text,
    length: countAnswerChars(text),
    lengthOk: isAnswerLengthOk(text),
    criteria: buildCriteria(rawCriteria, questionCriterionId),
    evidence: check.evidence,
    missingParts: [...check.missingParts, ...check.unfoundParts].filter((part, index, all) => all.indexOf(part) === index),
    evidenceStatus: check.status,
    evidenceIssue: check.issue,
    needsSupplement,
    supplementNote: needsSupplement
      ? `원문에 ${missingKey.map((part) => STAR_LABELS[part]).join("·")}에 해당하는 내용이 없어 답변에 쓰지 못했습니다. 직접 보완해 보세요.`
      : undefined,
  };
}

/** 경험 원문 하나로 질문 5개, 꼬리 질문(질문마다 2개), 1분 모범 답변(질문마다 1개)을 만든다. */
export async function generateQuestionsAndAnswers(experienceText: string): Promise<BeiQuestion[]> {
  const startedAt = Date.now();
  const output = await callAiJson(
    {
      instructions: buildInstructions(experienceText.length),
      materials: [{ label: "경험 원문", text: experienceText }],
      userMessage: "위 경험으로 면접 질문, 꼬리 질문, 1분 모범 답변을 만들어 줘.",
      maxOutputTokens: 14000,
      tier: "quality", // 글자 수·사실 확인을 정확히 지켜야 하므로 품질 모델을 쓴다
    },
    outputSchema,
  );

  // AI가 약속하지 않은 값을 적었다면 무시한다.
  const experienceGaps = (output.experienceGaps ?? []).filter((part): part is StarPart => part in STAR_LABELS);
  const items = output.questions.slice(0, QUESTIONS_PER_EXPERIENCE);
  const drafts: Draft[] = items.map((item) => ({ text: item.answer.text, evidence: item.answer.evidence ?? {} }));

  // 길이가 280~320자를 벗어난 답변을 맞춘다. (긴 것은 서버가 덜어내고, 짧은 것은 AI가 문장 단위로 늘린다. CHECK.md 4번)
  await fitAnswerLengths(experienceText, items, drafts, startedAt);

  const questions = items.map((item, index): BeiQuestion => {
    // AI가 목록에 없는 기준을 말했다면 표시하지 않는다.
    const criterionId = item.criterionId && findBeiCriterion(item.criterionId) ? item.criterionId : undefined;
    return {
      id: `q${index + 1}`,
      question: item.question,
      criterionId,
      answer: buildAnswer(experienceText, experienceGaps, drafts[index], item.answer.criteria, criterionId),
      followUps: item.followUps.slice(0, FOLLOW_UPS_PER_QUESTION).map((followUp) => ({
        question: followUp.question,
        answerDirection: followUp.answerDirection,
        missingInfo: followUp.missingInfo ?? false,
      })),
    };
  });

  if (questions.length !== QUESTIONS_PER_EXPERIENCE) {
    throw new AiError("bad_output", "질문을 충분히 만들지 못했습니다. 다시 시도해 주세요.", true);
  }
  return questions;
}
