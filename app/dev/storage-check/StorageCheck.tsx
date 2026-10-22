"use client";
// 개발 중에만 쓰는 점검 화면의 본체입니다. (작업 3번: 브라우저 저장 도구가 동작하는지 눈으로 확인)
import { useState } from "react";
import ClearDataButton from "@/components/ClearDataButton";
import StorageNotice from "@/components/StorageNotice";
import { DEV_STORAGE_KEY, removeItem } from "@/lib/storage";
import { useStorageStatus, useStoredValue } from "@/lib/use-stored-value";

type Note = { text: string };

// validate 함수는 컴포넌트 밖에 만든다. (useStoredValue 설명 참고)
function isNote(value: unknown): value is Note {
  return typeof value === "object" && value !== null && typeof (value as Note).text === "string";
}

export default function StorageCheck() {
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");
  const [saved, save] = useStoredValue<Note>(DEV_STORAGE_KEY, isNote);
  const status = useStorageStatus();

  function handleSave() {
    const result = save({ text: draft });
    if (!result.ok) setMessage("저장하지 못했습니다. (값을 글자로 바꿀 수 없음)");
    else if (result.persisted) setMessage("브라우저에 저장했습니다.");
    else setMessage(`저장되지 않았습니다. 이 화면에서만 유지됩니다. (이유: ${result.reason})`);
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">저장 도구 점검 (개발용)</h1>
      <StorageNotice />

      <label className="flex flex-col gap-1 text-sm">
        저장할 글
        <input
          data-testid="draft"
          className="rounded-md border border-zinc-400 bg-transparent px-3 py-2"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="아무 글이나 적고 [저장]을 누르세요"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="save"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-white dark:bg-zinc-100 dark:text-zinc-900"
          onClick={handleSave}
        >
          저장
        </button>
        <button
          type="button"
          data-testid="remove-one"
          className="rounded-md border border-zinc-400 px-3 py-1.5"
          onClick={() => removeItem(DEV_STORAGE_KEY)}
        >
          이 칸만 지우기
        </button>
      </div>

      <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
        <dt>저장 상태</dt>
        <dd data-testid="status">{status === "persistent" ? "브라우저에 저장됨" : "이 화면에서만 유지(저장 안 됨)"}</dd>
        <dt>불러온 값</dt>
        <dd data-testid="loaded">{saved ? saved.text : "(없음)"}</dd>
        <dt>안내</dt>
        <dd data-testid="message">{message || "-"}</dd>
      </dl>

      <ClearDataButton />
    </main>
  );
}
