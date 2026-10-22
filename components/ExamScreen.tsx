"use client";
// Design Ref: §2.5 시험 화면 `/literacy/exam` — 문제·파일·남은 한도·답 입력을 한 화면에 보여 주고 10문제를 한 번에 제출한다. (작업 16번)
// 이 작업의 범위: 문제 풀이 화면, 파일 열기(차감), AI 어시스트 대화(17번). 시험 상태 저장·두 탭 방지(18번). 제출·채점 연결(19번).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ExamAssist from "@/components/ExamAssist";
import ExamFiles from "@/components/ExamFiles";
import ScheduleEditor from "@/components/ScheduleEditor";
import StorageNotice from "@/components/StorageNotice";
import { chargeQuestion, openFile } from "@/lib/literacy-budget";
import {
  BUNDLE_ORDER,
  appendChat,
  countAnswered,
  isAnswered,
  isExamState,
  prepareExamState,
  setBudget,
  setCurrentIndex,
  setSchedule,
  setSubmitted,
  setTextAnswer,
  type ExamState,
} from "@/lib/literacy-exam";
import { buildExamResult } from "@/lib/exam-result";
import type { GradeResponse, LiteracySet, PublicQuestion } from "@/lib/literacy-types";
import { checkScheduleFormat, type ScheduleFormatError } from "@/lib/schedule-format";
import { parseStored, readRaw, removeItem, saveItem, STORAGE_KEYS } from "@/lib/storage";
import { useExamTabLock } from "@/lib/use-exam-tab-lock";
import { useStoredValue } from "@/lib/use-stored-value";

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
  // 시험 상태(답·한도·열어 본 파일·대화)는 이 브라우저에 저장해 두고, 새로고침해도 이어서 한다. (작업 18번)
  const [stored, save] = useStoredValue<ExamState>(STORAGE_KEYS.examState, isExamState);
  const tab = useExamTabLock();
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [restarting, setRestarting] = useState(false);
  const router = useRouter();
  // 제출 전 서술형 형식 검사에서 나온 오류, 채점 요청 중 여부, 채점 실패 안내 (작업 19번)
  const [formatErrors, setFormatErrors] = useState<ScheduleFormatError[]>([]);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

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
  const exam = prepareExamState(stored, set);
  const isOwner = tab.status === "owner";
  const submitted = exam.submitted;
  const index = viewIndex ?? exam.currentIndex;
  const question = set.questions[index];
  const bundle = set.bundles.find((b) => b.id === question.bundle)!;
  const budget = exam.budgets[bundle.id];
  const answeredCount = countAnswered(set.questions, exam.answers);
  // 제출했거나, 다른 탭이 시험 화면을 쓰는 중이면 이 탭에서는 답을 바꿀 수 없다.
  const locked = submitted || !isOwner;

  /** 저장해 둔 최신 상태를 읽어 바꾼 뒤 다시 저장한다. (비동기 작업이 끝날 때도 오래된 값을 덮어쓰지 않게) */
  function updateExam(change: (prev: ExamState) => ExamState) {
    if (!isOwner) return;
    save(change(prepareExamState(parseStored(readRaw(STORAGE_KEYS.examState), isExamState), set)));
  }

  function goTo(next: number) {
    setViewIndex(next);
    updateExam((prev) => setCurrentIndex(prev, next));
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
    // 다른 탭이 시험 중이면 새 파일을 열어 토큰을 차감할 수 없다. (이미 열어 둔 파일은 볼 수 있다)
    if (!isOwner && !budget.openedFileIds.includes(fileId)) return;
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
    const result = openFile(prepareExamState(parseStored(readRaw(STORAGE_KEYS.examState), isExamState), set).budgets[bundle.id], fileId, file.tokens);
    if (result.firstOpen) {
      updateExam((prev) => setBudget(prev, bundle.id, openFile(prev.budgets[bundle.id], fileId, file.tokens).budget));
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

  /** [10문제 제출]: 서술형 형식을 먼저 검사하고, 오류가 있으면 그 문제로 데려가 고치게 한다. */
  function startSubmit() {
    setGradeError(null);
    const errors = checkScheduleFormat(exam.answers.schedule);
    setFormatErrors(errors);
    if (errors.length > 0) {
      const scheduleIndex = set.questions.findIndex((q) => q.kind === "schedule");
      if (scheduleIndex >= 0) goTo(scheduleIndex);
      return;
    }
    setConfirming(true);
  }

  /** [제출하기]: 서버에서 채점한 뒤에만 "제출함"으로 바꾸고 결과를 저장한다. 채점에 실패하면 제출되지 않는다. */
  async function submitExam() {
    if (grading || !isOwner) return;
    setGrading(true);
    setGradeError(null);
    try {
      const response = await fetch("/api/literacy/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: exam.answers.text, schedule: exam.answers.schedule.filter((row) => Object.values(row).some((cell) => cell.trim() !== "")) }),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 400 && data?.error?.code === "schedule_format") {
        setFormatErrors(data.error.errors as ScheduleFormatError[]);
        setConfirming(false);
        const scheduleIndex = set.questions.findIndex((q) => q.kind === "schedule");
        if (scheduleIndex >= 0) goTo(scheduleIndex);
        return;
      }
      if (!response.ok) throw new Error(data?.error?.message ?? "채점하지 못했습니다.");
      const result = buildExamResult(data as GradeResponse, exam.budgets);
      saveItem(STORAGE_KEYS.examResult, result);
      updateExam((prev) => setSubmitted(prev, true));
      setConfirming(false);
      router.push("/literacy/result");
    } catch (err) {
      setGradeError(`${err instanceof Error ? err.message : "채점하지 못했습니다."} 제출되지 않았으니 다시 시도해 주세요.`);
    } finally {
      setGrading(false);
    }
  }

  function restart() {
    removeItem(STORAGE_KEYS.examResult);
    removeItem(STORAGE_KEYS.examState);
    setFormatErrors([]);
    setGradeError(null);
    setViewIndex(null);
    setViewingId(null);
    setFileMessage(null);
    setConfirming(false);
    setRestarting(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <StorageNotice />

      {tab.status === "other" && (
        <div data-testid="other-tab" role="status" className="rounded-md border border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-medium">다른 탭에서 진행 중입니다.</p>
          <p>같은 시험을 두 탭에서 풀면 서로의 답을 덮어쓰게 되어, 이 탭에서는 볼 수만 있습니다. 다른 탭을 닫은 뒤 아래 버튼을 눌러 이 탭에서 이어서 풀 수 있습니다.</p>
          <button type="button" data-testid="other-tab-retry" onClick={tab.retry} className="mt-2 rounded-md border border-amber-600 px-3 py-1.5 hover:bg-amber-100 dark:hover:bg-amber-900">
            이 탭에서 이어서 하기
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p data-testid="resume-note" className="text-xs text-zinc-600 dark:text-zinc-300">
          답과 남은 한도는 이 브라우저에 자동으로 저장되어, 새로고침해도 이어서 풀 수 있습니다.
        </p>
        {isOwner && !restarting && (
          <button type="button" data-testid="restart-start" onClick={() => setRestarting(true)} className="rounded-md border border-zinc-400 px-3 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800">
            처음부터 다시 시작
          </button>
        )}
      </div>

      {restarting && (
        <div data-testid="restart-confirm" role="alertdialog" aria-label="다시 시작 확인" className="rounded-md border border-red-400 p-4 text-sm leading-6">
          <p className="font-medium">처음부터 다시 시작할까요?</p>
          <p className="text-zinc-600 dark:text-zinc-300">입력한 답, 어시스트 대화, 열어 본 파일, 남은 토큰·질문 횟수가 모두 처음 상태로 돌아갑니다.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" data-testid="restart-yes" onClick={restart} className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700">
              처음부터 다시 시작
            </button>
            <button type="button" data-testid="restart-no" onClick={() => setRestarting(false)} className="rounded-md border border-zinc-400 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              취소
            </button>
          </div>
        </div>
      )}

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
            <OxButtons question={question} value={exam.answers.text[question.id] ?? ""} onChange={(v) => updateExam((prev) => setTextAnswer(prev, question.id, v))} disabled={locked} />
          )}

          {question.kind === "short" && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-zinc-600 dark:text-zinc-300">{question.format}</span>
              <input
                data-testid="short-answer"
                value={exam.answers.text[question.id] ?? ""}
                onChange={(e) => updateExam((prev) => setTextAnswer(prev, question.id, e.target.value))}
                disabled={locked}
                className="rounded-md border border-zinc-400 bg-transparent px-3 py-2 disabled:opacity-50"
              />
            </label>
          )}

          {question.kind === "schedule" && question.columns && (
            <ScheduleEditor columns={question.columns} rows={exam.answers.schedule} onChange={(rows) => {
                setFormatErrors([]);
                updateExam((prev) => setSchedule(prev, rows));
              }}
              disabled={locked}
              errors={formatErrors}
            />
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
            disabled={!isOwner}
          />
        </section>

        <aside aria-label="AI 어시스트" className="flex min-w-0 flex-col gap-3">
          <h2 className="text-sm font-bold">AI 어시스트 · 묶음 {bundle.id}</h2>
          <ExamAssist
            key={bundle.id}
            bundle={bundle.id}
            files={bundle.files}
            budget={budget}
            messages={exam.chats[bundle.id]}
            disabled={locked}
            onAnswered={(q, answer) =>
              updateExam((prev) => {
                const charged = chargeQuestion(prev.budgets[bundle.id], q, answer);
                return appendChat(setBudget(prev, bundle.id, charged.budget), bundle.id, q, answer);
              })
            }
          />
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
            onClick={startSubmit}
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
                onClick={() => void submitExam()}
                disabled={grading}
                className="rounded-md bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {grading ? "채점하는 중…" : "제출하기"}
              </button>
              <button type="button" data-testid="submit-confirm-no" disabled={grading} onClick={() => setConfirming(false)} className="rounded-md border border-zinc-400 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                계속 풀기
              </button>
            </div>
          </div>
        )}

        {formatErrors.length > 0 && !submitted && (
          <p data-testid="format-errors" role="alert" className="rounded-md border border-red-400 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
            서술형 일정표에 형식 오류가 {formatErrors.length}건 있어 제출하지 못했습니다. 문제 10의 표에서 빨간 칸을 고쳐 주세요.
          </p>
        )}

        {gradeError && (
          <p data-testid="grade-error" role="alert" className="rounded-md border border-red-400 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
            {gradeError}
          </p>
        )}

        {submitted && (
          <div data-testid="submitted" role="status" className="flex flex-wrap items-center gap-3 rounded-md border border-zinc-400 px-4 py-3 text-sm leading-6">
            <span>제출을 마쳤습니다. ({set.questions.length}문제 중 {answeredCount}문제에 답함)</span>
            <Link href="/literacy/result" data-testid="result-link" className="font-medium underline">
              채점 결과 보기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
