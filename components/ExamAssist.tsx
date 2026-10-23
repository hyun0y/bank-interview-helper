"use client";
// Design Ref: §2.5 시험 화면 오른쪽 — AI 어시스트: 남은 토큰·횟수 + 대화. (작업 17번)
// 질문은 AI 답변을 받은 뒤에만 차감한다. AI 호출이 실패하면 차감하지 않고 다시 시도할 수 있다. (PRD 5번)
// 어시스트는 "열어 본 파일"만 참고한다. 어떤 파일을 참고하는지 화면에도 보여 준다.
import { useState } from "react";
import { useEnsureAiConsent } from "@/components/AiConsentProvider";
import AssistBudget from "@/components/AssistBudget";
import { canAsk, type BundleBudget } from "@/lib/literacy-budget";
import type { ChatMessage } from "@/lib/literacy-exam";
import type { BundleId, PublicFile } from "@/lib/literacy-types";
import { LIMITS } from "@/lib/limits";

type Props = {
  bundle: BundleId;
  files: PublicFile[];
  budget: BundleBudget;
  messages: ChatMessage[];
  /** 제출한 뒤에는 질문할 수 없다 */
  disabled: boolean;
  /** 답변을 받았을 때 부른다. 화면이 대화 기록과 한도를 갱신한다. */
  onAnswered: (question: string, answer: string) => void;
};

/** 이전 대화로 함께 보낼 최대 개수 (서버도 같은 수로 자른다) */
const HISTORY_SENT = 6;

export default function ExamAssist({ bundle, files, budget, messages, disabled, onAnswered }: Props) {
  const ensureConsent = useEnsureAiConsent();
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = canAsk(budget);
  const locked = !check.ok;
  const openedNames = files.filter((file) => budget.openedFileIds.includes(file.id)).map((file) => file.name);
  const trimmed = question.trim();
  const canSend = !disabled && !locked && !sending && trimmed.length > 0 && trimmed.length <= LIMITS.QUESTION_MAX_CHARS;

  async function send() {
    if (!canSend) return;
    setError(null);
    const agreed = await ensureConsent();
    if (!agreed) {
      setError("AI에 질문을 보내려면 AI 전달에 동의해야 합니다.");
      return;
    }
    setSending(true);
    try {
      const response = await fetch("/api/literacy/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle, question: trimmed, openedFileIds: budget.openedFileIds, history: messages.slice(-HISTORY_SENT) }),
      });
      const data = (await response.json().catch(() => null)) as { answer?: string; error?: { message?: string } } | null;
      if (!response.ok || typeof data?.answer !== "string") {
        // 실패하면 차감하지 않는다.
        setError(`${data?.error?.message ?? "답을 받지 못했습니다."} (질문 횟수와 토큰은 차감되지 않았습니다.)`);
        return;
      }
      onAnswered(trimmed, data.answer);
      setQuestion("");
    } catch {
      setError("서버에 연결하지 못했습니다. (질문 횟수와 토큰은 차감되지 않았습니다.)");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <AssistBudget budget={budget} />

      <p data-testid="assist-scope" className="text-xs leading-5 text-zinc-600 dark:text-zinc-300">
        {bundle === "B"
          ? "이 묶음은 파일이 없어 일반 지식으로 답합니다."
          : openedNames.length > 0
            ? `내가 열어 본 파일만 참고합니다. (열어 본 파일 ${openedNames.length}개: ${openedNames.join(", ")})`
            : "내가 열어 본 파일만 참고합니다. 아직 열어 본 파일이 없습니다."}
      </p>

      <ul data-testid="assist-log" aria-live="polite" className="flex max-h-96 flex-col gap-2 overflow-y-auto">
        {messages.length === 0 && <li className="text-xs text-zinc-500 dark:text-zinc-400">궁금한 점을 질문해 보세요. 질문 1회마다 횟수가 1 줄어듭니다.</li>}
        {messages.map((message, i) => (
          <li
            key={i}
            data-testid={message.role === "user" ? "assist-user" : "assist-answer"}
            className={`whitespace-pre-wrap break-words rounded-md px-3 py-2 text-sm leading-6 ${message.role === "user" ? "bg-zinc-100 dark:bg-zinc-800" : "border border-zinc-300 dark:border-zinc-700"}`}
          >
            <span className="mb-0.5 block text-xs font-bold text-zinc-500 dark:text-zinc-400">{message.role === "user" ? "나" : "AI 어시스트"}</span>
            {message.content}
          </li>
        ))}
        {sending && (
          <li data-testid="assist-sending" role="status" className="text-xs text-zinc-600 dark:text-zinc-300">
            AI가 답하는 중입니다…
          </li>
        )}
      </ul>

      {error && (
        <p data-testid="assist-error" role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
        className="flex flex-col gap-2"
      >
        <label className="sr-only" htmlFor="assist-question">
          AI 어시스트에게 질문
        </label>
        <textarea
          id="assist-question"
          data-testid="assist-input"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          disabled={disabled || locked || sending}
          rows={3}
          maxLength={LIMITS.QUESTION_MAX_CHARS + 200}
          placeholder={locked ? "이 묶음은 어시스트를 더 쓸 수 없습니다." : "질문을 입력하세요"}
          className="rounded-md border border-zinc-400 bg-transparent px-3 py-2 text-sm disabled:opacity-50"
        />
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs tabular-nums ${trimmed.length > LIMITS.QUESTION_MAX_CHARS ? "font-bold text-red-600" : "text-zinc-500 dark:text-zinc-400"}`}>
            {trimmed.length.toLocaleString("ko-KR")} / {LIMITS.QUESTION_MAX_CHARS.toLocaleString("ko-KR")}자
          </span>
          <button
            type="submit"
            data-testid="assist-send"
            disabled={!canSend}
            className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {sending ? "보내는 중…" : "보내기"}
          </button>
        </div>
      </form>
    </div>
  );
}
