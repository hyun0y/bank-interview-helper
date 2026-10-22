"use client";
// Design Ref: §2.5 시험 화면 `/literacy/exam` — 문제·파일·남은 한도·답 입력을 한 화면에 보여 주고 10문제를 한 번에 제출한다. (작업 16번)
// 이 작업의 범위: 문제 풀이 화면과 파일 열기(차감). AI 어시스트 대화는 17번, 새로고침 후 값 유지는 18번, 채점은 19번에서 붙인다.
import { useEffect, useState } from "react";
import AssistBudget from "@/components/AssistBudget";
import ExamFiles from "@/components/ExamFiles";
import ScheduleEditor from "@/components/ScheduleEditor";
import { openFile } from "@/lib/literacy-budget";
import {
  BUNDLE_ORDER,
  countAnswered,
  createExamState,
  isAnswered,
  setBudget,
  setSchedule,
  setTextAnswer,
  type ExamState,
} from "@/lib/literacy-exam";
import type { LiteracySet, PublicQuestion } from "@/lib/literacy-types";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; set: LiteracySet };

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data as { error?: { message?: string } } | null)?.error?.message;
    throw new Error(message ?? "불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
  return data as T;
}

function OxButtons({ question, value, onChange, disabled }: { question: PublicQuestion; value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <div role="group" aria-label={`문제 ${question.number} 답 고르기`} className="flex gap-3">
      {(["O", "X"] as const).map((choice) => (
        <button
          key={choice}
          type="button"
          data-testid={`ox-${choice}`}
          aria-pressed={value === choice}
          onClick={() => onChange(choice)}
          disabled={disabled}
          className={`h-14 w-24 rounded-lg border text-2xl font-bold disabled:opacity-50 ${value === choice ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "border-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
        >
          {choice}
        </button>
      ))}
    </div>
  );
}

export default function ExamScreen() {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [exam, setExam] = useState<ExamState>(createExamState);
  const [index, setIndex] = useState(0);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    postJson<LiteracySet>("/api/literacy/set")
      .then((set) => {
        if (!cancelled) setLoad({ status: "ready", set });
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoad({ status: "error", message: err instanceof Error ? err.message : "문제를 불러오지 못했습니다." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (load.status === "loading") {
    return (
      <p role="status" className="text-sm text-zinc-600 dark:text-zinc-300">
        문제를 불러오는 중입니다…
      </p>
    );
  }
  if (load.status === "error") {
    return (
      <p role="alert" data-testid="exam-load-error" className="text-sm font-medium text-red-600">
        {load.message}
      </p>
    );
  }

  const { set } = load;
  const question = set.questions[index];
  const bundle = set.bundles.find((b) => b.id === question.bundle)!;
  const budget = exam.budgets[bundle.id];
  const answeredCount = countAnswered(set.questions, exam.answers);
  const locked = submitted;

  function goTo(next: number) {
    setIndex(next);
    setViewingId(null);
    setFileMessage(null);
    setConfirming(false);
  }

  function goToBundle(id: (typeof BUNDLE_ORDER)[number]) {
    const first = set.questions.findIndex((q) => q.bundle === id);
    if (first >= 0) goTo(first);
  }

  async function handleOpenFile(fileId: string) {
    const file = bundle.files.find((f) => f.id === fileId);
    if (!file) return;
    if (viewingId === fileId) {
      setViewingId(null);
      return;
    }
    setFileMessage(null);
    if (contents[fileId] === undefined) {
      setLoadingId(fileId);
      try {
        const data = await postJson<{ content: string }>("/api/literacy/file", { fileId });
        setContents((prev) => ({ ...prev, [fileId]: data.content }));
      } catch (err) {
        // 내용을 받지 못했으면 토큰을 차감하지 않는다.
        setFileMessage(err instanceof Error ? err.message : "파일을 불러오지 못했습니다.");
        setLoadingId(null);
        return;
      }
      setLoadingId(null);
    }
    const result = openFile(budget, fileId, file.tokens);
    if (result.firstOpen) {
      setExam((prev) => setBudget(prev, bundle.id, result.budget));
      setFileMessage(
        result.charged < file.tokens
          ? `처음 열어서 남은 토큰 ${result.charged.toLocaleString("ko-KR")}개만 차감되었습니다. 이 묶음의 토큰이 모두 소진되었습니다.`
          : `처음 열어서 ${file.tokens.toLocaleString("ko-KR")}토큰이 차감되었습니다.`,
      );
    } else {
      setFileMessage("이미 열었던 파일이라 토큰이 차감되지 않았습니다.");
    }
    setViewingId(fileId);
  }

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="묶음" className="flex flex-wrap gap-2">
        {set.bundles.map((b) => {
          const selected = b.id === bundle.id;
          const mine = set.questions.filter((q) => q.bundle === b.id);
          const done = mine.filter((q) => isAnswered(q, exam.answers)).length;
          return (
            <button
              key={b.id}
              type="button"
              data-testid={`bundle-${b.id}`}
              aria-current={selected ? "true" : undefined}
              onClick={() => goToBundle(b.id)}
              className={`rounded-full border px-3 py-1.5 text-sm ${selected ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "border-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
            >
              묶음 {b.id} <span className="text-xs opacity-80">({done}/{mine.length})</span>
            </button>
          );
        })}
      </nav>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-label="문제" className="flex min-w-0 flex-col gap-4 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {bundle.title} · {bundle.points}점
            </p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{bundle.description}</p>
          </div>

          <div>
            <h2 data-testid="question-number" className="text-lg font-bold">
              문제 {question.number}
            </h2>
            <p data-testid="question-prompt" className="mt-2 leading-7">
              {question.prompt}
            </p>
          </div>

          {question.kind === "ox" && (
            <OxButtons question={question} value={exam.answers.text[question.id] ?? ""} onChange={(v) => setExam((prev) => setTextAnswer(prev, question.id, v))} disabled={locked} />
          )}

          {question.kind === "short" && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-zinc-600 dark:text-zinc-300">{question.format}</span>
              <input
                data-testid="short-answer"
                value={exam.answers.text[question.id] ?? ""}
                onChange={(e) => setExam((prev) => setTextAnswer(prev, question.id, e.target.value))}
                disabled={locked}
                className="rounded-md border border-zinc-400 bg-transparent px-3 py-2 disabled:opacity-50"
              />
            </label>
          )}

          {question.kind === "schedule" && question.columns && (
            <ScheduleEditor columns={question.columns} rows={exam.answers.schedule} onChange={(rows) => setExam((prev) => setSchedule(prev, rows))} disabled={locked} />
          )}

          <ExamFiles
            files={bundle.files}
            openedIds={budget.openedFileIds}
            viewingId={viewingId}
            viewingContent={viewingId ? (contents[viewingId] ?? null) : null}
            loadingId={loadingId}
            message={fileMessage}
            onOpen={handleOpenFile}
            onClose={() => setViewingId(null)}
          />
        </section>

        <aside aria-label="AI 어시스트" className="flex flex-col gap-3">
          <h2 className="text-sm font-bold">AI 어시스트 · 묶음 {bundle.id}</h2>
          <AssistBudget budget={budget} />
          <p className="text-xs leading-5 text-zinc-600 dark:text-zinc-300">
            {bundle.files.length > 0 ? "내가 열어 본 파일만 참고합니다." : "이 묶음은 파일이 없어 일반 지식으로 답합니다."}
          </p>
        </aside>
      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            data-testid="prev-question"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            className="rounded-md border border-zinc-400 px-4 py-2 text-sm hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
          >
            이전 문제
          </button>
          <span data-testid="progress" className="text-sm tabular-nums">
            문제 {question.number} / {set.questions.length} · 답한 문제 {answeredCount}개
          </span>
          <button
            type="button"
            data-testid="next-question"
            onClick={() => goTo(index + 1)}
            disabled={index === set.questions.length - 1}
            className="rounded-md border border-zinc-400 px-4 py-2 text-sm hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
          >
            다음 문제
          </button>
        </div>

        {!submitted && !confirming && (
          <button
            type="button"
            data-testid="submit-start"
            onClick={() => setConfirming(true)}
            className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            10문제 제출
          </button>
        )}

        {confirming && !submitted && (
          <div data-testid="submit-confirm" role="alertdialog" aria-label="제출 확인" className="rounded-md border border-zinc-400 p-4 text-sm leading-6">
            <p className="font-medium">
              {set.questions.length}문제 중 {answeredCount}문제에 답했습니다.
              {answeredCount < set.questions.length && ` 답하지 않은 문제가 ${set.questions.length - answeredCount}개 있습니다.`}
            </p>
            <p className="mt-1 text-zinc-600 dark:text-zinc-300">제출하면 답을 더 바꿀 수 없습니다. 10문제를 한 번에 제출할까요?</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                data-testid="submit-confirm-yes"
                onClick={() => {
                  setSubmitted(true);
                  setConfirming(false);
                }}
                className="rounded-md bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
              >
                제출하기
              </button>
              <button type="button" data-testid="submit-confirm-no" onClick={() => setConfirming(false)} className="rounded-md border border-zinc-400 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                계속 풀기
              </button>
            </div>
          </div>
        )}

        {submitted && (
          <p data-testid="submitted" role="status" className="rounded-md border border-zinc-400 px-4 py-3 text-sm leading-6">
            제출했습니다. ({set.questions.length}문제 중 {answeredCount}문제에 답함) 채점과 정답·해설 화면은 다음 단계에서 연결됩니다.
          </p>
        )}
      </div>
    </div>
  );
}
