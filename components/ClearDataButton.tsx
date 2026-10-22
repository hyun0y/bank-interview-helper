"use client";
// Design Ref: §2.1 화면 지도 — 모든 화면 맨 아래에 "내 저장 데이터 모두 삭제" 버튼을 둔다. (화면 틀에 붙이는 것은 작업 4번)
// 실수로 누르는 것을 막기 위해 한 번 더 확인한 뒤 지운다.
import { useState } from "react";
import { clearAllData } from "@/lib/storage";

type Step = { kind: "idle" } | { kind: "confirm" } | { kind: "done"; removed: number };

export default function ClearDataButton() {
  const [step, setStep] = useState<Step>({ kind: "idle" });

  if (step.kind === "confirm") {
    return (
      <div role="alertdialog" aria-label="저장 데이터 삭제 확인" className="flex flex-wrap items-center gap-2 text-sm">
        <span>저장한 결과와 시험 진행, 동의 기록이 모두 사라집니다. 지울까요?</span>
        <button
          type="button"
          className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700"
          onClick={() => setStep({ kind: "done", removed: clearAllData().removed })}
        >
          삭제
        </button>
        <button
          type="button"
          className="rounded-md border border-zinc-400 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={() => setStep({ kind: "idle" })}
        >
          취소
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button
        type="button"
        className="rounded-md border border-zinc-400 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        onClick={() => setStep({ kind: "confirm" })}
      >
        내 저장 데이터 모두 삭제
      </button>
      {step.kind === "done" && (
        <span role="status">
          {step.removed > 0 ? `저장 데이터 ${step.removed}건을 삭제했습니다.` : "삭제할 저장 데이터가 없습니다."}
        </span>
      )}
    </div>
  );
}
