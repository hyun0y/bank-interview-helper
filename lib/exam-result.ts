// Design Ref: §3.4 exam-result / §2.6 시험 결과 — 채점 결과와 묶음별 토큰·횟수 사용 내역을 이 브라우저에 저장해 두고 결과 화면에서 보여 준다. (작업 19번)
import type { BudgetConfig, BundleBudget } from "@/lib/literacy-budget";
import { DEFAULT_BUDGET_CONFIG } from "@/lib/literacy-budget";
import type { BundleId, GradeResponse } from "@/lib/literacy-types";

export type BundleUsage = {
  fileTokensUsed: number;
  chatTokensUsed: number;
  questionsUsed: number;
  tokensLeft: number;
  questionsLeft: number;
  openedFileCount: number;
  tokenLimit: number;
  questionLimit: number;
};

export type ExamResult = {
  gradedAt: string;
  grade: GradeResponse;
  usage: Record<BundleId, BundleUsage>;
};

const BUNDLES: BundleId[] = ["A", "B", "C"];

export function buildExamResult(
  grade: GradeResponse,
  budgets: Record<BundleId, BundleBudget>,
  config: BudgetConfig = DEFAULT_BUDGET_CONFIG,
  now: Date = new Date(),
): ExamResult {
  const usage = {} as Record<BundleId, BundleUsage>;
  for (const id of BUNDLES) {
    const b = budgets[id];
    usage[id] = {
      fileTokensUsed: b.fileTokensUsed,
      chatTokensUsed: b.chatTokensUsed,
      questionsUsed: b.questionsUsed,
      tokensLeft: b.tokensLeft,
      questionsLeft: b.questionsLeft,
      openedFileCount: b.openedFileIds.length,
      tokenLimit: config.tokens,
      questionLimit: config.questions,
    };
  }
  return { gradedAt: now.toISOString(), grade, usage };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNum(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStr(value: unknown): value is string {
  return typeof value === "string";
}

function isCells(value: unknown): boolean {
  return isObject(value) && ["date", "time", "title", "place", "attendees"].every((key) => isStr(value[key]));
}

/** 저장해 둔 결과가 올바른 모양인가. (화면이 깨지지 않도록 쓰는 값만 확인한다) */
export function isExamResult(value: unknown): value is ExamResult {
  if (!isObject(value) || !isStr(value.gradedAt) || !isObject(value.grade) || !isObject(value.usage)) return false;
  const { grade, usage } = value;
  if (!isNum(grade.total) || !isNum(grade.max) || !isObject(grade.bundleScores) || !Array.isArray(grade.questions) || !isObject(grade.schedule)) return false;
  for (const id of BUNDLES) {
    const score = (grade.bundleScores as Record<string, unknown>)[id];
    const u = usage[id];
    if (!isObject(score) || !isNum(score.earned) || !isNum(score.max)) return false;
    if (!isObject(u) || !["fileTokensUsed", "chatTokensUsed", "questionsUsed", "tokensLeft", "questionsLeft", "openedFileCount", "tokenLimit", "questionLimit"].every((k) => isNum(u[k]))) return false;
  }
  const questionsOk = grade.questions.every(
    (q) =>
      isObject(q) &&
      isStr(q.id) && isNum(q.number) && isStr(q.bundle) && isStr(q.kind) && isStr(q.prompt) && isNum(q.points) && isNum(q.earned) &&
      typeof q.correct === "boolean" && isStr(q.userAnswer) && isStr(q.correctAnswer) && isStr(q.explanation),
  );
  if (!questionsOk) return false;
  const s = grade.schedule;
  return (
    isNum(s.number) && isStr(s.prompt) && isNum(s.points) && isNum(s.earned) && isNum(s.correctRows) && isNum(s.wrongRows) && isNum(s.answerRowCount) &&
    Array.isArray(s.submitted) && s.submitted.every((r) => isObject(r) && isCells(r.row) && (r.status === "correct" || r.status === "wrong")) &&
    Array.isArray(s.answerRows) && s.answerRows.every((r) => isCells(r) && isStr((r as Record<string, unknown>).reason)) &&
    Array.isArray(s.excluded) && s.excluded.every(isStr)
  );
}
