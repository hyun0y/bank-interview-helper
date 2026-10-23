// Design Ref: §3.4 exam-state / §2.5 시험 화면 — 시험을 푸는 동안의 상태(답, 묶음별 토큰·횟수)를 다루는 순수 함수들.
// 화면(React)과 따로 두어 규칙을 점검하기 쉽게 했다. 모든 함수는 받은 값을 바꾸지 않고 새 값을 돌려준다.
import { DEFAULT_BUDGET_CONFIG, createBundleBudget, isBundleBudget, type BudgetConfig, type BundleBudget } from "@/lib/literacy-budget";
import type { BundleId, LiteracySet, PublicQuestion } from "@/lib/literacy-types";

/** 서술형 표의 한 줄. 칸 5개를 모두 글자로 들고 있다. */
export type ScheduleRowInput = {
  date: string;
  time: string;
  title: string;
  place: string;
  attendees: string;
};

export type ExamAnswers = {
  /** 객관식(O/X)과 단답형 답. 문제 번호표(id) → 답 */
  text: Record<string, string>;
  /** 서술형 일정표 */
  schedule: ScheduleRowInput[];
};

/** AI 어시스트와 나눈 대화 한 줄 */
export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ExamState = {
  answers: ExamAnswers;
  budgets: Record<BundleId, BundleBudget>;
  /** 묶음별 AI 어시스트 대화 기록 */
  chats: Record<BundleId, ChatMessage[]>;
  /** 제출했는가. 제출한 뒤에는 답을 바꿀 수 없다. */
  submitted: boolean;
  /** 마지막으로 보던 문제의 자리(0부터). 새로고침하면 그 문제에서 이어 간다. */
  currentIndex: number;
};

export const BUNDLE_ORDER: BundleId[] = ["A", "B", "C"];

export function emptyScheduleRow(): ScheduleRowInput {
  return { date: "", time: "", title: "", place: "", attendees: "" };
}

export function createExamState(): ExamState {
  return {
    answers: { text: {}, schedule: [emptyScheduleRow()] },
    budgets: { A: createBundleBudget(), B: createBundleBudget(), C: createBundleBudget() },
    chats: { A: [], B: [], C: [] },
    submitted: false,
    currentIndex: 0,
  };
}

/** 객관식·단답형 답을 바꾼다. */
export function setTextAnswer(state: ExamState, questionId: string, value: string): ExamState {
  return { ...state, answers: { ...state.answers, text: { ...state.answers.text, [questionId]: value } } };
}

export function setSchedule(state: ExamState, schedule: ScheduleRowInput[]): ExamState {
  return { ...state, answers: { ...state.answers, schedule } };
}

export function setBudget(state: ExamState, bundle: BundleId, budget: BundleBudget): ExamState {
  return { ...state, budgets: { ...state.budgets, [bundle]: budget } };
}

/** 대화 기록에 질문과 답변을 덧붙인다. */
export function appendChat(state: ExamState, bundle: BundleId, question: string, answer: string): ExamState {
  const next: ChatMessage[] = [...state.chats[bundle], { role: "user", content: question }, { role: "assistant", content: answer }];
  return { ...state, chats: { ...state.chats, [bundle]: next } };
}

function rowHasContent(row: ScheduleRowInput): boolean {
  return Object.values(row).some((cell) => cell.trim() !== "");
}

/** 이 문제에 답을 적었는가. (서술형은 표에 글자가 한 칸이라도 있으면 적은 것으로 본다) */
export function isAnswered(question: PublicQuestion, answers: ExamAnswers): boolean {
  if (question.kind === "schedule") return answers.schedule.some(rowHasContent);
  return (answers.text[question.id] ?? "").trim() !== "";
}

export function countAnswered(questions: PublicQuestion[], answers: ExamAnswers): number {
  return questions.filter((q) => isAnswered(q, answers)).length;
}

/** 빈 줄을 뺀 서술형 표. (제출할 때 쓴다) */
export function nonEmptyScheduleRows(schedule: ScheduleRowInput[]): ScheduleRowInput[] {
  return schedule.filter(rowHasContent);
}

export function setSubmitted(state: ExamState, submitted: boolean): ExamState {
  return { ...state, submitted };
}

export function setCurrentIndex(state: ExamState, currentIndex: number): ExamState {
  return { ...state, currentIndex };
}

// ---------------------------------------------------------------------------
// 저장해 둔 값 검사 (Design Ref: §3.4 exam-state — 저장 값이 망가지거나 손으로 바뀌었어도 화면이 깨지지 않게 한다)
// ---------------------------------------------------------------------------
const MAX_ANSWER_CHARS = 2000;
const MAX_SCHEDULE_ROWS = 60;
const MAX_CELL_CHARS = 500;
const MAX_CHAT_MESSAGES = 60;
const MAX_CHAT_CHARS = 12000;
const MAX_TEXT_ANSWERS = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScheduleRow(value: unknown): value is ScheduleRowInput {
  if (!isRecord(value)) return false;
  return (["date", "time", "title", "place", "attendees"] as const).every((key) => typeof value[key] === "string" && (value[key] as string).length <= MAX_CELL_CHARS);
}

function isChatMessage(value: unknown): value is ChatMessage {
  return isRecord(value) && (value.role === "user" || value.role === "assistant") && typeof value.content === "string" && value.content.length <= MAX_CHAT_CHARS;
}

/** 저장해 둔 값이 올바른 모양인가. */
export function isExamState(value: unknown): value is ExamState {
  if (!isRecord(value)) return false;
  const { answers, budgets, chats } = value;
  if (typeof value.submitted !== "boolean") return false;
  if (!Number.isInteger(value.currentIndex) || (value.currentIndex as number) < 0 || (value.currentIndex as number) > 99) return false;

  if (!isRecord(answers) || !isRecord(answers.text) || !Array.isArray(answers.schedule)) return false;
  const textEntries = Object.entries(answers.text);
  if (textEntries.length > MAX_TEXT_ANSWERS) return false;
  if (!textEntries.every(([, v]) => typeof v === "string" && v.length <= MAX_ANSWER_CHARS)) return false;
  if (answers.schedule.length > MAX_SCHEDULE_ROWS || !answers.schedule.every(isScheduleRow)) return false;

  if (!isRecord(budgets) || !isRecord(chats)) return false;
  return BUNDLE_ORDER.every((id) => {
    const messages = chats[id];
    return isBundleBudget(budgets[id]) && Array.isArray(messages) && messages.length <= MAX_CHAT_MESSAGES && messages.every(isChatMessage);
  });
}

/**
 * 저장해 둔 상태를 화면에 쓰기 좋게 다듬는다. (저장 값이 없으면 새 시험 상태)
 *  - 남은 토큰·횟수가 지금 설정값보다 크면 설정값으로 줄인다. (한도를 낮춰도 안전하고, 저장 값을 손으로 늘려도 설정값을 못 넘는다)
 *  - 문제 세트를 알고 있으면 그 묶음에 없는 파일 번호는 뺀다.
 *  - 문제 자리가 문제 수를 넘으면 마지막 문제로 맞춘다.
 */
export function prepareExamState(stored: ExamState | null, set: LiteracySet | null, config: BudgetConfig = DEFAULT_BUDGET_CONFIG): ExamState {
  if (!stored) return createExamState();
  const budgets = { ...stored.budgets };
  for (const id of BUNDLE_ORDER) {
    const budget = budgets[id];
    const validFiles = set?.bundles.find((bundle) => bundle.id === id)?.files.map((file) => file.id);
    budgets[id] = {
      ...budget,
      tokensLeft: Math.min(budget.tokensLeft, config.tokens),
      questionsLeft: Math.min(budget.questionsLeft, config.questions),
      openedFileIds: validFiles ? budget.openedFileIds.filter((fileId) => validFiles.includes(fileId)) : budget.openedFileIds,
    };
  }
  const lastIndex = set ? set.questions.length - 1 : stored.currentIndex;
  return { ...stored, budgets, currentIndex: Math.min(stored.currentIndex, Math.max(0, lastIndex)) };
}
