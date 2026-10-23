"use client";
// Design Ref: §2.3 BEI 입력 `/bei` ② 개인정보 확인 — "개인정보는 가리고 올려 주세요. 이름·학교명은 직접 가려 주세요".
//   자동으로 가린 부분을 보여 주고, 사용자가 직접 고칠 수 있다. 이 단계의 글은 아직 AI로 보내지 않는다. (PRD 7번)
// ③ 경험 고르기(AI 호출)는 작업 8번에서 이어서 만든다.
import { useId, useState, type Dispatch, type SetStateAction } from "react";
import { checkTextLength } from "@/lib/file-text";
import { LIMITS } from "@/lib/limits";
import {
  PERSONAL_INFO_LABELS,
  countPersonalInfo,
  maskPersonalInfo,
  maskTerms,
  type PersonalInfoCounts,
  type PersonalInfoKind,
} from "@/lib/masking";

type Props = {
  /** 자동으로 가린 뒤 사용자가 고치고 있는 글 */
  value: string;
  onChange: Dispatch<SetStateAction<string>>;
  /** 자동 가림을 처음 적용했을 때의 결과(건수 표시용) */
  autoCounts: PersonalInfoCounts;
  /** [처음 가림 결과로 되돌리기]를 눌렀을 때 */
  onReset: () => void;
  /** ①로 돌아가기 */
  onBack: () => void;
  /** [다음: 경험 고르기] — 동의 확인 후 글을 AI에 보내 경험 후보를 찾는다 */
  onNext: () => void;
  /** 경험 후보를 찾는 중인가 */
  finding: boolean;
  /** 경험 후보를 찾지 못했을 때 보여 줄 안내 */
  findError: string | null;
};

// 자동으로 가린 건수를 이 순서로 보여 준다. (생년월일·계좌/카드번호도 몇 건 가렸는지 함께 안내)
const KINDS: PersonalInfoKind[] = ["phone", "email", "resident-id", "birth-date", "account"];

function describeCounts(counts: PersonalInfoCounts): string {
  const parts = KINDS.filter((kind) => counts[kind] > 0).map((kind) => `${PERSONAL_INFO_LABELS[kind]} ${counts[kind]}건`);
  return parts.join(" · ");
}

export default function BeiPrivacyReview({ value, onChange, autoCounts, onReset, onBack, onNext, finding, findError }: Props) {
  const [termInput, setTermInput] = useState("");
  const [termMessage, setTermMessage] = useState("");
  const textareaId = useId();
  const termId = useId();

  const check = checkTextLength(value);
  const overLimit = !check.ok && check.reason === "too_long";
  const autoSummary = describeCounts(autoCounts);
  const remaining = countPersonalInfo(value);
  const remainingSummary = describeCounts(remaining);

  function handleMaskTerms() {
    const terms = termInput.split(/[,\n]/);
    const result = maskTerms(value, terms);
    if (result.replaced > 0) {
      onChange(result.text);
      setTermMessage(`${result.replaced}곳을 [가림]으로 바꿨습니다.`);
      setTermInput("");
    } else {
      setTermMessage("바꿀 곳이 없습니다. 글에 있는 단어를 두 글자 이상으로 정확히 적어 주세요.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="bei-step2" className="flex flex-col gap-4">
        <h2 id="bei-step2" className="text-lg font-bold">
          ② 개인정보 확인
        </h2>

        <div className="rounded-md border border-zinc-300 bg-zinc-50 p-4 text-sm leading-6 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="font-medium">개인정보는 가리고 올려 주세요. 이름·학교명은 직접 가려 주세요.</p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-300">
            연락처·주민등록번호·이메일·카드번호는 자동으로 가렸고, &quot;생년월일&quot;·&quot;계좌&quot;라고 적은 뒤의 날짜·번호도 가렸습니다. 이름·학교명처럼 자동으로 찾기 어려운 정보는 아래에서 직접 가릴 수
            있습니다. 이 단계의 글은 아직 AI로 보내지 않았습니다.
          </p>
        </div>

        <p data-testid="auto-summary" aria-live="polite" className="text-sm">
          {autoSummary ? (
            <>
              자동으로 가린 개인정보: <strong>{autoSummary}</strong>
            </>
          ) : (
            "자동으로 가린 개인정보가 없습니다."
          )}
        </p>

        <div className="flex flex-col gap-2">
          <label htmlFor={termId} className="text-sm font-medium">
            직접 가릴 이름·학교명 등 (쉼표로 여러 개)
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id={termId}
              data-testid="term-input"
              value={termInput}
              onChange={(e) => setTermInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleMaskTerms();
                }
              }}
              placeholder="예: 홍길동, 가나다대학교"
              className="min-w-0 flex-1 rounded-md border border-zinc-400 bg-transparent px-3 py-2 text-sm"
            />
            <button
              type="button"
              data-testid="term-apply"
              onClick={handleMaskTerms}
              disabled={termInput.trim().length === 0}
              className="rounded-md border border-zinc-400 px-3 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
            >
              가리기
            </button>
          </div>
          <p data-testid="term-message" aria-live="polite" className="min-h-5 text-sm text-zinc-600 dark:text-zinc-300">
            {termMessage}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={textareaId} className="text-sm font-medium">
            AI로 보낼 글 (직접 고칠 수 있습니다)
          </label>
          <textarea
            id={textareaId}
            data-testid="review-text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={14}
            aria-invalid={overLimit}
            className="w-full resize-y rounded-md border border-zinc-400 bg-transparent px-3 py-2 text-sm leading-6 aria-[invalid=true]:border-red-600"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm" aria-live="polite">
            <span data-testid="review-count" className={overLimit ? "font-medium text-red-600" : "text-zinc-600 dark:text-zinc-300"}>
              {check.length.toLocaleString()} / {LIMITS.BEI_TEXT_MAX_CHARS.toLocaleString()}자
            </span>
            {!check.ok && (
              <span data-testid="review-error" role="alert" className="font-medium text-red-600">
                {check.message}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-300">
            [전화번호], [이메일], [가림]처럼 대괄호로 바뀐 자리가 가려진 부분입니다.
          </p>
        </div>

        {remainingSummary && (
          <div data-testid="remaining-warning" role="alert" className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100">
            <p>
              아직 가려지지 않은 개인정보가 있습니다: <strong>{remainingSummary}</strong>
            </p>
            <button
              type="button"
              data-testid="remask"
              onClick={() => onChange(maskPersonalInfo(value).text)}
              className="mt-2 rounded-md border border-amber-600 px-3 py-1.5 hover:bg-amber-100 dark:hover:bg-amber-900"
            >
              다시 자동으로 가리기
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            data-testid="review-reset"
            onClick={() => {
              onReset();
              setTermMessage("처음 자동으로 가린 결과로 되돌렸습니다.");
            }}
            className="rounded-md border border-zinc-400 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            처음 가림 결과로 되돌리기
          </button>
        </div>
      </section>

      <section aria-label="다음 단계" className="flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            data-testid="review-back"
            onClick={onBack}
            className="rounded-md border border-zinc-400 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ← 내용 다시 넣기
          </button>
          <button
            type="button"
            disabled={!check.ok || finding}
            onClick={onNext}
            data-testid="review-next"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {finding ? "경험을 찾는 중…" : "다음: 경험 고르기"}
          </button>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          누르면 위의 글을 AI 서비스로 보내 경험 후보를 찾습니다. 처음 한 번은 AI 전달 동의를 받습니다. (AI 요청 1회)
        </p>
        {findError && (
          <p data-testid="find-error" role="alert" className="text-sm font-medium text-red-600">
            {findError}
          </p>
        )}
      </section>
    </div>
  );
}
