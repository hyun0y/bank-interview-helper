"use client";
// Design Ref: §2.4 BEI 결과 — ④ 방금 만든 결과를 보여 주고, [이 결과 저장]으로 이 브라우저에 저장한다. (작업 9·10·11번)
// 저장하는 것은 질문·꼬리 질문·모범 답변·평가 기준 같은 분석 결과뿐이다. 자기소개서 원문과 원문 근거 문장은 저장하지 않는다. (PRD 7번)
import Link from "next/link";
import { useState } from "react";
import BeiResultTabs, { type ResultTabItem } from "@/components/BeiResultTabs";
import { LIMITS } from "@/lib/limits";
import type { SaveResult } from "@/lib/storage";

export type { ExperienceResult } from "@/components/BeiResultTabs";

type Props = {
  items: ResultTabItem[];
  onRetry: (id: string) => void;
  /** 경험 고르기로 돌아가기 */
  onBack: () => void;
  /** 질문·답변이 다 만들어진 경험의 수 */
  doneCount: number;
  /** 이미 저장한 경험의 수. doneCount가 더 크면 새로 저장할 수 있다. */
  savedDoneCount: number;
  /** [이 결과 저장] — 결과와 저장한 개수를 돌려준다. 만들어진 경험이 없으면 null */
  onSave: () => { result: SaveResult; total: number } | null;
};

function messageFor(outcome: { result: SaveResult; total: number }): string {
  if (!outcome.result.ok) return "저장하지 못했습니다. 다시 시도해 주세요.";
  if (!outcome.result.persisted) return "이 브라우저에서는 저장되지 않아, 이 화면을 벗어나면 결과가 사라집니다.";
  return `저장했습니다. (저장한 결과 ${outcome.total}/${LIMITS.BEI_MAX_SAVED_RESULTS}개)`;
}

export default function BeiResultView({ items, onRetry, onBack, doneCount, savedDoneCount, onSave }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const canSave = doneCount > savedDoneCount;

  function handleSave() {
    const outcome = onSave();
    setMessage(outcome ? messageFor(outcome) : "저장할 결과가 아직 없습니다.");
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="bei-step4" className="flex flex-col gap-4">
        <h2 id="bei-step4" className="text-lg font-bold">
          ④ 질문과 모범 답변
        </h2>
        <BeiResultTabs items={items} onRetry={onRetry} />
      </section>

      <section aria-label="저장과 이동" className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="result-save"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {doneCount > 0 && savedDoneCount >= doneCount ? "저장됨" : "이 결과 저장"}
          </button>
          <button
            type="button"
            data-testid="result-back"
            onClick={onBack}
            className="rounded-md border border-zinc-400 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ← 경험 고르기로
          </button>
          <Link href="/bei/result" data-testid="saved-link" className="text-sm underline">
            저장한 결과 보기
          </Link>
        </div>
        {message && (
          <p data-testid="save-message" role="status" className="text-sm font-medium">
            {message}
          </p>
        )}
        <p className="text-xs leading-5 text-zinc-600 dark:text-zinc-300">
          저장하지 않으면 새로고침하거나 화면을 벗어날 때 결과가 사라집니다. 저장한 결과는 이 브라우저에만 있고 최대 {LIMITS.BEI_MAX_SAVED_RESULTS}개까지 보관하며,
          넘으면 가장 오래된 것부터 지웁니다. 자기소개서 원문과 근거로 보여 주던 원문 문장은 저장하지 않습니다.
        </p>
      </section>
    </div>
  );
}
