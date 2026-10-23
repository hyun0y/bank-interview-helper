// Design Ref: §3.4 exam-state / §2.5 시험 화면 — 시험을 푸는 동안의 상태(답, 묶음별 토큰·횟수)를 다루는 순수 함수들.
// 화면(React)과 따로 두어 규칙을 점검하기 쉽게 했다. 모든 함수는 받은 값을 바꾸지 않고 새 값을 돌려준다.
import { createBundleBudget, type BundleBudget } from "@/lib/literacy-budget";
import type { BundleId, PublicQuestion } from "@/lib/literacy-types";

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

export type ExamState = {
  answers: ExamAnswers;
  budgets: Record<BundleId, BundleBudget>;
};

export const BUNDLE_ORDER: BundleId[] = ["A", "B", "C"];

export function emptyScheduleRow(): ScheduleRowInput {
  return { date: "", time: "", title: "", place: "", attendees: "" };
}

export function createExamState(): ExamState {
  return {
    answers: { text: {}, schedule: [emptyScheduleRow()] },
    budgets: { A: createBundleBudget(), B: createBundleBudget(), C: createBundleBudget() },
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
