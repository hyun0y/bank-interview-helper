"use client";
// Design Ref: §2.4 BEI 결과 `/bei/result` — 경험별 탭에 질문·꼬리 질문(답변 방향 한 줄)을 보여 준다. (작업 9번)
// 모범 답변·근거·평가 기준은 작업 10번, 저장과 안내문은 작업 11번에서 이어서 만든다.
import { useState } from "react";
import { findBeiCriterion } from "@/lib/bei-criteria";
import type { BeiQuestion, ExperienceCandidate } from "@/lib/bei-types";

export type ExperienceResult =
  | { status: "loading" }
  | { status: "done"; questions: BeiQuestion[] }
  | { status: "error"; message: string };

type Item = { candidate: ExperienceCandidate; result: ExperienceResult | undefined };

type Props = {
  items: Item[];
  onRetry: (candidate: ExperienceCandidate) => void;
  /** 경험 고르기로 돌아가기 */
  onBack: () => void;
};

function QuestionList({ questions }: { questions: BeiQuestion[] }) {
  return (
    <ol className="flex flex-col gap-5">
      {questions.map((question, index) => {
        const criterion = question.criterionId ? findBeiCriterion(question.criterionId) : undefined;
        return (
          <li key={question.id} data-testid={`question-${question.id}`} className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold">질문 {index + 1}</span>
              {criterion && (
                <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
                  확인하는 기준: {criterion.name}
                </span>
              )}
            </div>
            <p className="mt-2 font-medium leading-7">{question.question}</p>
            <ul className="mt-3 flex flex-col gap-3 border-l-2 border-zinc-300 pl-4 dark:border-zinc-700">
              {question.followUps.map((followUp, followIndex) => (
                <li key={followIndex} data-testid={`followup-${question.id}-${followIndex + 1}`} className="text-sm leading-6">
                  <p>
                    <span className="font-bold">꼬리 질문 {index + 1}-{followIndex + 1}</span> {followUp.question}
                  </p>
                  <p className="mt-0.5 text-zinc-600 dark:text-zinc-300">
                    <span className="font-medium">답변 방향</span> {followUp.answerDirection}
                    {followUp.missingInfo && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                        경험에서 확인되지 않음, 보완 필요
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

export default function BeiResultView({ items, onRetry, onBack }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = items.find((item) => item.candidate.id === activeId) ?? items[0];

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="bei-step4" className="flex flex-col gap-4">
        <h2 id="bei-step4" className="text-lg font-bold">
          ④ 질문·꼬리 질문
        </h2>

        <div role="tablist" aria-label="경험" className="flex flex-wrap gap-2">
          {items.map((item) => {
            const selected = item.candidate.id === active?.candidate.id;
            return (
              <button
                key={item.candidate.id}
                type="button"
                role="tab"
                aria-selected={selected}
                data-testid={`tab-${item.candidate.id}`}
                onClick={() => setActiveId(item.candidate.id)}
                className={`rounded-full border px-3 py-1.5 text-sm ${selected ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "border-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              >
                {item.candidate.title}
                {item.result?.status === "loading" && " …"}
                {item.result?.status === "error" && " ⚠"}
              </button>
            );
          })}
        </div>

        {active && (
          <div role="tabpanel" className="flex flex-col gap-3">
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{active.candidate.summary}</p>

            {(!active.result || active.result.status === "loading") && (
              <p role="status" data-testid="result-loading" className="text-sm">
                질문을 만드는 중입니다…
              </p>
            )}

            {active.result?.status === "error" && (
              <div data-testid="result-error" role="alert" className="rounded-md border border-red-300 p-3 text-sm dark:border-red-700">
                <p className="font-medium text-red-600">{active.result.message}</p>
                <button
                  type="button"
                  data-testid="result-retry"
                  onClick={() => onRetry(active.candidate)}
                  className="mt-2 rounded-md border border-zinc-400 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  다시 시도 (AI 요청 1회)
                </button>
              </div>
            )}

            {active.result?.status === "done" && <QuestionList questions={active.result.questions} />}
          </div>
        )}
      </section>

      <section aria-label="다음 단계" className="flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            data-testid="result-back"
            onClick={onBack}
            className="rounded-md border border-zinc-400 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ← 경험 고르기로
          </button>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          1분 모범 답변과 결과 저장은 다음 작업에서 이어서 만들어집니다.
        </p>
      </section>
    </div>
  );
}
