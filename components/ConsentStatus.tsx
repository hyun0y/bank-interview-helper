"use client";
// Design Ref: §2.1 — 개인정보 안내 화면에서 AI 전달 동의 여부를 보여 주고, 철회할 수 있게 한다.
import { revokeAiConsent, useAiConsent } from "@/lib/consent";

export default function ConsentStatus() {
  const consented = useAiConsent();

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span>
        AI 전달 동의: <strong>{consented ? "동의함" : "아직 동의하지 않음"}</strong>
      </span>
      {consented && (
        <button
          type="button"
          className="rounded-md border border-zinc-400 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={revokeAiConsent}
        >
          동의 철회
        </button>
      )}
    </div>
  );
}
