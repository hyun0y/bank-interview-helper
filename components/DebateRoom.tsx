"use client";
// Design Ref: §2.7 토론 `/debate/[topicId]` — 입장을 고르면 고른 입장의 의견을 크게, 생각지 못한 관점, 반대 입장 논거를 작게 아래에 보여 준다. (작업 22번)
// 토론 결과는 저장하지 않는다. 같은 입장은 한 번만 만들고(AI 요청 1회), 입장을 바꿨다 돌아오면 이미 만든 결과를 보여 준다.
import { useState } from "react";
import { useEnsureAiConsent } from "@/components/AiConsentProvider";
import { DEBATE_CATEGORY_LABELS, STANCE_LABELS, type DebateTopic, type OpinionItem, type OpinionsResponse, type Stance } from "@/lib/debate-types";

type State = { status: "idle" } | { status: "loading" } | { status: "error"; message: string };

function KindBadge({ kind }: { kind: OpinionItem["kind"] }) {
  return kind === "fact" ? (
    <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-900 dark:bg-blue-900 dark:text-blue-100">사실</span>
  ) : (
    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">의견</span>
  );
}

function OpinionList({ items, testId, small }: { items: OpinionItem[]; testId: string; small?: boolean }) {
  return (
    <ol data-testid={testId} className="flex flex-col gap-3">
      {items.map((item, index) => (
        <li key={index} data-testid={`${testId}-${index}`} className={`rounded-lg border border-zinc-300 dark:border-zinc-700 ${small ? "p-3 text-sm" : "p-4"}`}>
          <div className="flex items-start gap-2">
            <KindBadge kind={item.kind} />
            <p className={`${small ? "" : "text-base"} font-medium leading-7`}>{item.point}</p>
          </div>
          <p className={`mt-1 leading-6 text-zinc-700 dark:text-zinc-200 ${small ? "text-xs" : "text-sm"}`}>{item.detail}</p>
        </li>
      ))}
    </ol>
  );
}

export default function DebateRoom({ topic }: { topic: DebateTopic }) {
  const ensureConsent = useEnsureAiConsent();
  const [stance, setStance] = useState<Stance | null>(null);
  const [results, setResults] = useState<Partial<Record<Stance, OpinionsResponse>>>({});
  const [state, setState] = useState<State>({ status: "idle" });

  async function load(next: Stance) {
    if (results[next]) return;
    const agreed = await ensureConsent();
    if (!agreed) {
      setState({ status: "error", message: "AI에 보내려면 AI 전달에 동의해야 합니다." });
      return;
    }
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/debate/opinions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: topic.id, stance: next }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.chosen) throw new Error(data?.error?.message ?? "의견을 만들지 못했습니다.");
      setResults((prev) => ({ ...prev, [next]: data as OpinionsResponse }));
      setState({ status: "idle" });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "의견을 만들지 못했습니다." });
    }
  }

  function choose(next: Stance) {
    if (state.status === "loading") return;
    setStance(next);
    setState({ status: "idle" });
    void load(next);
  }

  const result = stance ? results[stance] : undefined;
  const other: Stance | null = stance === "pro" ? "con" : stance === "con" ? "pro" : null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{DEBATE_CATEGORY_LABELS[topic.category]} 주제</p>
        <h1 data-testid="topic-title" className="mt-1 text-2xl font-bold leading-9">
          {topic.title}
        </h1>
        <p data-testid="topic-background" className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {topic.background}
        </p>
      </header>

      <section aria-labelledby="stance-heading" className="flex flex-col gap-2">
        <h2 id="stance-heading" className="text-sm font-bold">
          내 입장을 골라 주세요
        </h2>
        <div role="group" aria-label="입장" className="flex gap-3">
          {(["pro", "con"] as const).map((value) => (
            <button
              key={value}
              type="button"
              data-testid={`stance-${value}`}
              aria-pressed={stance === value}
              onClick={() => choose(value)}
              disabled={state.status === "loading"}
              className={`h-12 w-28 rounded-lg border text-base font-bold disabled:opacity-50 ${stance === value ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "border-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
            >
              {STANCE_LABELS[value]}
            </button>
          ))}
        </div>
      </section>

      {state.status === "loading" && (
        <p data-testid="debate-loading" role="status" className="text-sm">
          의견을 만드는 중입니다… (보통 10~30초 걸립니다)
        </p>
      )}

      {state.status === "error" && stance && (
        <div data-testid="debate-error" role="alert" className="rounded-md border border-red-300 p-3 text-sm dark:border-red-700">
          <p className="font-medium text-red-600">{state.message}</p>
          <button type="button" data-testid="debate-retry" onClick={() => void load(stance)} className="mt-2 rounded-md border border-zinc-400 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            다시 시도 (AI 요청 1회)
          </button>
        </div>
      )}

      {result && stance && other && (
        <>
          <section aria-labelledby="chosen-heading" className="flex flex-col gap-3">
            <h2 id="chosen-heading" className="text-lg font-bold">
              {STANCE_LABELS[stance]} 입장 의견 <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">({result.chosen.length}개)</span>
            </h2>
            <OpinionList items={result.chosen} testId="chosen" />
          </section>

          <section aria-labelledby="insight-heading" className="flex flex-col gap-3 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
            <h2 id="insight-heading" className="text-lg font-bold">
              💡 생각지 못한 관점
            </h2>
            <ul data-testid="insights" className="flex flex-col gap-3">
              {result.insights.map((item, index) => (
                <li key={index} data-testid={`insight-${index}`}>
                  <p className="font-medium leading-7">{item.viewpoint}</p>
                  <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">{item.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="opposing-heading" className="flex flex-col gap-3">
            <h2 id="opposing-heading" className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
              {STANCE_LABELS[other]} 입장 논거 <span className="font-normal text-zinc-500 dark:text-zinc-400">({result.opposing.length}개) · 반박에 대비해 보세요</span>
            </h2>
            <OpinionList items={result.opposing} testId="opposing" small />
          </section>

          <p data-testid="debate-notice" className="text-xs leading-5 text-zinc-600 dark:text-zinc-300">
            <KindBadge kind="fact" /> 는 일반적으로 알려진 내용, <KindBadge kind="opinion" /> 는 가치 판단·예상·주장입니다. AI가 만든 글이라 &quot;사실&quot;로 표시된 내용도 틀릴 수 있으니 면접 전에 직접
            확인하세요. 토론 결과는 저장되지 않아 새로고침하면 사라집니다.
          </p>
        </>
      )}
    </div>
  );
}
