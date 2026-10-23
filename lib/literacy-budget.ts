// Design Ref: §2.5 시험 화면 / §3.4 exam-state — 문제 묶음 1개의 남은 토큰·질문 횟수를 계산한다. (브라우저 전용 계산, 서버는 모름)
// PRD 5번 AI 리터러시 규칙:
//  - 파일은 처음 열 때만 파일의 토큰 수만큼 차감한다. (같은 파일을 다시 열어도 차감하지 않는다)
//  - 질문과 AI 답변은 글자 수로 어림한 토큰만큼 차감하고, 질문 횟수는 1회 차감한다. AI 호출이 실패하면 차감하지 않는다.
//  - 토큰이나 횟수가 0이 되면 그 묶음의 AI 어시스트만 멈춘다. 답 입력과 제출, 파일 열기는 계속할 수 있다.
// 모든 함수는 받은 값을 바꾸지 않고 새 값을 돌려준다.
import { LIMITS } from "@/lib/limits";
import { estimateTokens } from "@/lib/tokens";

export type BundleBudget = {
  /** 남은 토큰 */
  tokensLeft: number;
  /** 남은 질문 횟수 */
  questionsLeft: number;
  /** 지금까지 연 파일 번호 (처음 연 순서) */
  openedFileIds: string[];
  /** 사용 내역: 파일을 여는 데 쓴 토큰 */
  fileTokensUsed: number;
  /** 사용 내역: 질문·답변에 쓴 토큰 */
  chatTokensUsed: number;
  /** 사용 내역: 질문한 횟수 */
  questionsUsed: number;
};

export type BudgetConfig = { tokens: number; questions: number };

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  tokens: LIMITS.LITERACY_BUNDLE_TOKENS,
  questions: LIMITS.LITERACY_BUNDLE_QUESTIONS,
};

/** 묶음 하나의 처음 상태 */
export function createBundleBudget(config: BudgetConfig = DEFAULT_BUDGET_CONFIG): BundleBudget {
  return {
    tokensLeft: config.tokens,
    questionsLeft: config.questions,
    openedFileIds: [],
    fileTokensUsed: 0,
    chatTokensUsed: 0,
    questionsUsed: 0,
  };
}

export type OpenFileResult = {
  budget: BundleBudget;
  /** 이번에 차감한 토큰. 이미 연 파일이면 0 */
  charged: number;
  /** 처음 여는 것인가 */
  firstOpen: boolean;
};

/**
 * 파일을 연다. 처음 열 때만 파일의 토큰 수만큼 차감한다.
 * 남은 토큰이 모자라도 파일은 열 수 있다. (문제를 풀려면 자료를 봐야 하므로) 이때는 0까지만 내려간다.
 */
export function openFile(budget: BundleBudget, fileId: string, fileTokens: number): OpenFileResult {
  if (budget.openedFileIds.includes(fileId)) return { budget, charged: 0, firstOpen: false };
  const charged = Math.min(Math.max(0, Math.ceil(fileTokens)), budget.tokensLeft);
  return {
    budget: {
      ...budget,
      tokensLeft: budget.tokensLeft - charged,
      openedFileIds: [...budget.openedFileIds, fileId],
      fileTokensUsed: budget.fileTokensUsed + charged,
    },
    charged,
    firstOpen: true,
  };
}

export type AskCheck = { ok: true } | { ok: false; reason: "no-tokens" | "no-questions" };

/** 지금 AI 어시스트에 질문할 수 있는가. 토큰이 0이거나 횟수가 0이면 막는다. */
export function canAsk(budget: BundleBudget): AskCheck {
  if (budget.questionsLeft <= 0) return { ok: false, reason: "no-questions" };
  if (budget.tokensLeft <= 0) return { ok: false, reason: "no-tokens" };
  return { ok: true };
}

/** 어시스트가 멈춘 상태인가 */
export function isAssistLocked(budget: BundleBudget): boolean {
  return !canAsk(budget).ok;
}

/**
 * 질문 1회를 차감한다. AI 답변을 받은 뒤에만 부른다. (AI 호출이 실패하면 부르지 않는다 = 차감 없음)
 * 질문과 답변을 합친 토큰이 남은 토큰보다 크면 0까지만 내려간다.
 */
export function chargeQuestion(budget: BundleBudget, questionText: string, answerText: string): { budget: BundleBudget; charged: number } {
  const wanted = estimateTokens(questionText) + estimateTokens(answerText);
  const charged = Math.min(wanted, budget.tokensLeft);
  return {
    budget: {
      ...budget,
      tokensLeft: budget.tokensLeft - charged,
      questionsLeft: Math.max(0, budget.questionsLeft - 1),
      chatTokensUsed: budget.chatTokensUsed + charged,
      questionsUsed: budget.questionsUsed + 1,
    },
    charged,
  };
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/** 저장해 둔 값이 올바른 모양인가. (시험 상태를 저장하는 18번에서 쓴다) */
export function isBundleBudget(value: unknown): value is BundleBudget {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    isNonNegativeInteger(v.tokensLeft) &&
    isNonNegativeInteger(v.questionsLeft) &&
    isNonNegativeInteger(v.fileTokensUsed) &&
    isNonNegativeInteger(v.chatTokensUsed) &&
    isNonNegativeInteger(v.questionsUsed) &&
    Array.isArray(v.openedFileIds) &&
    v.openedFileIds.every((id) => typeof id === "string")
  );
}
