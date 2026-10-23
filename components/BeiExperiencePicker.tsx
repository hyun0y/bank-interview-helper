"use client";
// Design Ref: §2.3 BEI 입력 `/bei` ③ 경험 고르기 — 후보(최대 5개) 중 3개까지 고르고, 후보를 누르면 원문 구간을 볼 수 있다.
// [질문·답변 만들기]는 작업 9·10번에서 이어서 만든다.
import type { ExperienceCandidate } from "@/lib/bei-types";
import { LIMITS } from "@/lib/limits";

type Props = {
  candidates: ExperienceCandidate[];
  /** 고른 후보의 id 목록 */
  selected: string[];
  onToggle: (id: string) => void;
  /** ②로 돌아가기 */
  onBack: () => void;
  /** [질문 만들기] — 고른 경험마다 질문·꼬리 질문을 만든다 */
  onGenerate: () => void;
  /** 질문을 만들 수 없을 때(예: 동의 거부) 보여 줄 안내 */
  notice: string | null;
};

export default function BeiExperiencePicker({ candidates, selected, onToggle, onBack, onGenerate, notice }: Props) {
  const full = selected.length >= LIMITS.BEI_MAX_SELECTED;

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="bei-step3" className="flex flex-col gap-4">
        <h2 id="bei-step3" className="text-lg font-bold">
          ③ 경험 고르기
        </h2>

        {candidates.length === 0 ? (
          <div data-testid="no-candidates" className="rounded-md border border-zinc-300 p-4 text-sm leading-6 dark:border-zinc-700">
            <p className="font-medium">경험으로 볼 만한 부분을 찾지 못했습니다.</p>
            <p className="mt-1 text-zinc-600 dark:text-zinc-300">
              언제, 무엇을, 어떻게 했고 결과가 어땠는지가 들어간 경험을 글에 더 구체적으로 적은 뒤 다시 시도해 주세요.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              AI가 글에서 찾은 경험 후보입니다. 질문을 만들 경험을 최대 {LIMITS.BEI_MAX_SELECTED}개까지 골라 주세요.
              후보의 &quot;원문 보기&quot;를 누르면 질문에 쓰일 글을 확인할 수 있습니다.
            </p>
            <p data-testid="selected-count" aria-live="polite" className="text-sm font-medium">
              {selected.length} / {LIMITS.BEI_MAX_SELECTED}개 선택
            </p>
            <ul className="flex flex-col gap-3">
              {candidates.map((candidate) => {
                const checked = selected.includes(candidate.id);
                const disabled = !checked && full;
                return (
                  <li
                    key={candidate.id}
                    data-testid={`candidate-${candidate.id}`}
                    className={`rounded-lg border p-4 ${checked ? "border-zinc-900 dark:border-zinc-100" : "border-zinc-300 dark:border-zinc-700"} ${disabled ? "opacity-60" : ""}`}
                  >
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => onToggle(candidate.id)}
                        data-testid={`pick-${candidate.id}`}
                        className="mt-1 size-4"
                      />
                      <span className="flex flex-col gap-1">
                        <span className="font-bold">{candidate.title}</span>
                        <span className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">{candidate.summary}</span>
                      </span>
                    </label>
                    <details className="mt-2 pl-7 text-sm">
                      <summary className="cursor-pointer text-zinc-600 dark:text-zinc-300">원문 보기 ({candidate.excerpt.length.toLocaleString()}자)</summary>
                      <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-zinc-50 p-3 leading-6 dark:bg-zinc-900">
                        {candidate.excerpt}
                      </p>
                    </details>
                  </li>
                );
              })}
            </ul>
            {full && <p className="text-sm text-zinc-600 dark:text-zinc-300">{LIMITS.BEI_MAX_SELECTED}개를 모두 골랐습니다. 바꾸려면 하나를 먼저 해제해 주세요.</p>}
          </>
        )}
      </section>

      <section aria-label="다음 단계" className="flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            data-testid="pick-back"
            onClick={onBack}
            className="rounded-md border border-zinc-400 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ← 개인정보 확인으로
          </button>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={onGenerate}
            data-testid="pick-next"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            질문 만들기
          </button>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {selected.length === 0
            ? "경험을 하나 이상 골라 주세요."
            : `고른 경험 ${selected.length}개마다 AI가 질문 5개와 꼬리 질문을 만듭니다. (경험 1개당 AI 요청 1회) 모범 답변은 다음 작업에서 이어서 만들어집니다.`}
        </p>
        {notice && (
          <p data-testid="pick-notice" role="alert" className="text-sm font-medium text-red-600">
            {notice}
          </p>
        )}
      </section>
    </div>
  );
}
