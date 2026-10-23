// Design Ref: §2.5 시험 화면 — AI 어시스트 위쪽에 "남은 토큰 / 남은 질문"을 항상 보여 준다. (작업 15번)
// 한도가 모두 떨어지면 그 묶음의 어시스트만 막힌다는 안내를 함께 보여 준다.
import { DEFAULT_BUDGET_CONFIG, canAsk, type BudgetConfig, type BundleBudget } from "@/lib/literacy-budget";

type Props = {
  budget: BundleBudget;
  config?: BudgetConfig;
};

function Meter({ label, left, total, testId }: { label: string; left: number; total: number; testId: string }) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  const low = left === 0 || ratio <= 0.2;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span data-testid={testId} className={`font-bold tabular-nums ${low ? "text-amber-700 dark:text-amber-300" : ""}`}>
          {left.toLocaleString("ko-KR")} / {total.toLocaleString("ko-KR")}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={left}
        className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
      >
        <div className={`h-full ${low ? "bg-amber-500" : "bg-zinc-700 dark:bg-zinc-200"}`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

export default function AssistBudget({ budget, config = DEFAULT_BUDGET_CONFIG }: Props) {
  const check = canAsk(budget);
  return (
    <section aria-label="AI 어시스트 남은 한도" className="flex flex-col gap-3 rounded-md border border-zinc-300 p-3 dark:border-zinc-700">
      <Meter label="남은 토큰" left={budget.tokensLeft} total={config.tokens} testId="budget-tokens" />
      <Meter label="남은 질문" left={budget.questionsLeft} total={config.questions} testId="budget-questions" />
      {!check.ok && (
        <p data-testid="budget-locked" role="status" className="rounded-md bg-amber-100 px-3 py-2 text-xs leading-5 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          이 묶음은 어시스트를 더 쓸 수 없습니다.{" "}
          {check.reason === "no-questions" ? "질문 횟수를 모두 썼습니다." : "토큰을 모두 썼습니다."} 답 입력과 제출은 계속할 수 있습니다.
        </p>
      )}
    </section>
  );
}
