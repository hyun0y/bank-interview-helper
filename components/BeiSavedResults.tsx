"use client";
// Design Ref: §2.1 화면 지도 `/bei/result` — 이 브라우저에 저장해 둔 BEI 결과의 목록과 보기, 삭제. (작업 11번)
// 저장한 결과는 서버에 있지 않고 이 브라우저에만 있다. (PRD 4번 공통 규칙)
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import BeiResultTabs from "@/components/BeiResultTabs";
import { isSavedBeiResults, type SavedBeiResult } from "@/lib/bei-saved";
import { LIMITS } from "@/lib/limits";
import { saveItem, STORAGE_KEYS } from "@/lib/storage";
import { useStoredValue } from "@/lib/use-stored-value";

// 서버에서 먼저 그릴 때는 저장 값을 알 수 없으므로, 브라우저에서 읽을 수 있게 된 뒤에 목록을 그린다. (깜빡임 방지)
const subscribeNothing = () => () => {};

function formatSavedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function BeiSavedResults() {
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const [saved] = useStoredValue<SavedBeiResult[]>(STORAGE_KEYS.beiResults, isSavedBeiResults);
  const [openId, setOpenId] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <p role="status" className="text-sm text-zinc-600 dark:text-zinc-300">
        저장한 결과를 불러오는 중입니다…
      </p>
    );
  }

  const list = saved ?? [];
  const opened = list.find((item) => item.id === openId);

  function remove(id: string) {
    saveItem(STORAGE_KEYS.beiResults, list.filter((item) => item.id !== id));
    if (openId === id) setOpenId(null);
  }

  if (opened) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 data-testid="saved-detail-title" className="text-lg font-bold">
            {opened.title}
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-300">저장한 시각 {formatSavedAt(opened.savedAt)}</p>
        </div>
        <BeiResultTabs
          items={opened.experiences.map((experience) => ({
            id: experience.id,
            title: experience.title,
            summary: experience.summary,
            result: { status: "done", questions: experience.questions },
          }))}
        />
        <div className="flex flex-wrap gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <button
            type="button"
            data-testid="saved-back"
            onClick={() => setOpenId(null)}
            className="rounded-md border border-zinc-400 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ← 저장한 결과 목록
          </button>
          <button
            type="button"
            data-testid="saved-delete-open"
            onClick={() => remove(opened.id)}
            className="rounded-md border border-red-400 px-4 py-2 text-sm text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950"
          >
            이 결과 삭제
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {list.length === 0 ? (
        <div data-testid="saved-empty" className="rounded-md border border-zinc-300 p-4 text-sm leading-6 dark:border-zinc-700">
          <p className="font-medium">저장한 결과가 없습니다.</p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-300">
            BEI 면접에서 질문과 모범 답변을 만든 뒤 [이 결과 저장]을 누르면 여기에 보관됩니다.
          </p>
        </div>
      ) : (
        <>
          <p data-testid="saved-count" className="text-sm font-medium">
            저장한 결과 {list.length}/{LIMITS.BEI_MAX_SAVED_RESULTS}개
          </p>
          <ul className="flex flex-col gap-3">
            {list.map((item) => (
              <li key={item.id} data-testid={`saved-${item.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
                <div>
                  <p className="font-bold">{item.title}</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    {formatSavedAt(item.savedAt)} 저장 · 경험 {item.experiences.length}개
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-testid={`saved-open-${item.id}`}
                    onClick={() => setOpenId(item.id)}
                    className="rounded-md border border-zinc-400 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    보기
                  </button>
                  <button
                    type="button"
                    data-testid={`saved-delete-${item.id}`}
                    onClick={() => remove(item.id)}
                    className="rounded-md border border-red-400 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="text-xs leading-5 text-zinc-600 dark:text-zinc-300">
        저장한 결과는 이 브라우저에만 있고 최대 {LIMITS.BEI_MAX_SAVED_RESULTS}개까지 보관합니다. 넘으면 가장 오래된 것부터 지웁니다. 자기소개서 원문과
        근거로 보여 주던 원문 문장은 저장하지 않습니다. 화면 맨 아래 &quot;내 저장 데이터 모두 삭제&quot;로 한꺼번에 지울 수도 있습니다.
      </p>
      <Link href="/bei" className="w-fit text-sm underline">
        새로 만들기 →
      </Link>
    </div>
  );
}
