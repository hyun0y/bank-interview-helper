"use client";
// Design Ref: §3.4 — 화면에서 저장 값을 읽고 바꾸는 부품. 저장 값이 바뀌면 화면이 자동으로 다시 그려진다.
// 서버에서 먼저 그릴 때는 저장 값이 없다고 보고(null), 브라우저에서 다시 읽는다. (서버·브라우저 화면이 어긋나는 오류 방지)
import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  getStorageStatus,
  parseStored,
  readRaw,
  saveItem,
  subscribeStorage,
  type SaveResult,
  type StorageKey,
  type StorageStatus,
} from "@/lib/storage";

/** 이 브라우저가 저장을 허용하는지 알려 준다. 서버에서 그릴 때는 "persistent"로 가정한다. */
export function useStorageStatus(): StorageStatus {
  return useSyncExternalStore(subscribeStorage, getStorageStatus, () => "persistent");
}

/**
 * 저장 칸 하나를 읽고 바꾸는 hook. [값, 저장하는 함수]
 * `validate`는 파일 맨 위(컴포넌트 밖)에 만든 함수를 넘겨야 한다. (렌더링마다 새로 만들면 매번 다시 읽는다)
 */
export function useStoredValue<T>(
  key: StorageKey,
  validate?: (value: unknown) => value is T,
): [T | null, (value: T) => SaveResult] {
  // 같은 글자면 같은 결과를 돌려줘야 화면이 끝없이 다시 그려지지 않는다.
  const raw = useSyncExternalStore(
    subscribeStorage,
    () => readRaw(key),
    () => null,
  );
  const value = useMemo(() => parseStored(raw, validate), [raw, validate]);
  const save = useCallback((next: T) => saveItem(key, next), [key]);
  return [value, save];
}
