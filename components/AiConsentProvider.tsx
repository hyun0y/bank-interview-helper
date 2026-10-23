"use client";
// Design Ref: §2.1 AI 전달 동의 창 — "입력한 내용이 AI 서비스로 전달됩니다"를 보여 주고 [동의하고 계속] / [취소]를 고르게 한다.
// 사용법: AI를 부르기 직전에 `const ok = await ensureConsent(); if (!ok) return;`
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { grantAiConsent, hasAiConsent } from "@/lib/consent";

type ConsentContextValue = { ensureConsent: () => Promise<boolean> };

const ConsentContext = createContext<ConsentContextValue | null>(null);

/** AI를 쓰기 전에 동의를 확인하는 함수를 돌려준다. 이미 동의했으면 창 없이 true, 처음이면 창을 띄운다. */
export function useEnsureAiConsent(): () => Promise<boolean> {
  const context = useContext(ConsentContext);
  if (!context) throw new Error("AiConsentProvider 안에서만 쓸 수 있습니다.");
  return context.ensureConsent;
}

export default function AiConsentProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // 창이 떠 있는 동안 기다리고 있는 요청들. 동의 창은 하나만 띄우고, 결과를 모두에게 알려 준다.
  const waiting = useRef<((agreed: boolean) => void)[]>([]);

  const finish = useCallback((agreed: boolean) => {
    if (agreed) grantAiConsent();
    const resolvers = waiting.current;
    waiting.current = [];
    resolvers.forEach((resolve) => resolve(agreed));
    setOpen(false);
  }, []);

  const ensureConsent = useCallback((): Promise<boolean> => {
    if (hasAiConsent()) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      waiting.current.push(resolve);
      setOpen(true);
    });
  }, []);

  // 브라우저 기본 대화상자(<dialog>)를 쓰면 Esc로 닫기·포커스 가두기가 기본으로 된다.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const value = useMemo(() => ({ ensureConsent }), [ensureConsent]);

  return (
    <ConsentContext.Provider value={value}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby="ai-consent-title"
        onClose={() => finish(false)} // Esc로 닫으면 취소로 본다. (이미 처리된 경우에는 아무 일도 하지 않는다)
        className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-lg border border-zinc-300 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      >
        <h2 id="ai-consent-title" className="text-lg font-bold">
          입력한 내용이 AI 서비스로 전달됩니다
        </h2>
        <div className="mt-3 space-y-2 text-sm leading-6">
          <p>이 앱은 입력한 내용(자기소개서, 질문 등)을 AI 서비스(OpenAI)로 보내 질문과 답변을 만듭니다.</p>
          <p>
            보낸 내용은 이 앱의 서버에 저장하지 않습니다. 다만 AI 서비스 쪽에서는 해당 서비스의 정책에 따라 처리될 수 있습니다.
            이름·연락처·학교명 같은 개인정보는 가리고 입력해 주세요.
          </p>
          <p>
            <Link href="/privacy" className="underline" onClick={() => finish(false)}>
              개인정보 안내
            </Link>
            에서 자세한 내용을 볼 수 있습니다.
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-zinc-400 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => finish(false)}
          >
            취소
          </button>
          <button
            type="button"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            onClick={() => finish(true)}
          >
            동의하고 계속
          </button>
        </div>
      </dialog>
    </ConsentContext.Provider>
  );
}
