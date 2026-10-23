"use client";
// Design Ref: §3.4 — 저장이 막힌 브라우저(시크릿 모드 등)에서는 "저장되지 않습니다"를 알리고, 그 화면에서만 동작한다.
import { useStorageStatus } from "@/lib/use-stored-value";

/** 저장이 되지 않는 브라우저에서만 보이는 안내문. 저장이 되면 아무것도 그리지 않는다. */
export default function StorageNotice() {
  const status = useStorageStatus();
  if (status === "persistent") return null;

  return (
    <div
      role="status"
      className="rounded-md border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100"
    >
      이 브라우저에서는 저장되지 않습니다. 지금 화면을 보는 동안만 결과가 유지되고, 새로고침하거나 창을 닫으면 사라집니다.
      (시크릿 모드이거나 저장이 차단된 설정일 수 있습니다.)
    </div>
  );
}
