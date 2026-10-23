"use client";
// 개발 중에만 쓰는 점검 화면의 본체입니다. (작업 4번: AI 전달 동의 창이 제대로 동작하는지 눈으로 확인)
import { useState } from "react";
import { useEnsureAiConsent } from "@/components/AiConsentProvider";
import ConsentStatus from "@/components/ConsentStatus";

export default function ConsentCheck() {
  const ensureConsent = useEnsureAiConsent();
  const [result, setResult] = useState("(아직 누르지 않음)");

  async function handleClick() {
    // 실제 화면에서는 AI를 부르기 직전에 이 두 줄을 쓴다.
    const agreed = await ensureConsent();
    setResult(agreed ? "동의함: 여기서 AI를 부르면 됩니다." : "동의하지 않음: AI를 부르지 않습니다.");
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">AI 전달 동의 점검 (개발용)</h1>
      <button
        type="button"
        data-testid="ai-button"
        className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
        onClick={handleClick}
      >
        AI 쓰기 (가짜 버튼)
      </button>
      <p data-testid="result">{result}</p>
      <ConsentStatus />
    </main>
  );
}
