"use client";
// Design Ref: §2.1 AI 전달 동의 창 — 어느 영역이든 처음 AI를 쓰기 직전에 한 번만 묻고, 동의 여부를 브라우저에 저장한다.
// 동의하지 않으면 AI를 부르는 버튼이 동작하지 않는다. (부르는 쪽에서 ensureConsent()의 결과를 확인한다)
import { loadItem, removeItem, saveItem, STORAGE_KEYS } from "@/lib/storage";
import { useStoredValue } from "@/lib/use-stored-value";

type Consent = { agreed: true };

// useStoredValue에 넘기는 검사 함수는 컴포넌트 밖에 만들어 둔다.
function isConsent(value: unknown): value is Consent {
  return typeof value === "object" && value !== null && (value as Consent).agreed === true;
}

/** 지금 동의한 상태인가 (이벤트 처리 중에 확인할 때 쓴다) */
export function hasAiConsent(): boolean {
  return loadItem(STORAGE_KEYS.consent, isConsent) !== null;
}

/** 동의를 기록한다. */
export function grantAiConsent(): void {
  saveItem(STORAGE_KEYS.consent, { agreed: true });
}

/** 동의를 철회한다. (다음에 AI를 쓸 때 다시 묻는다) */
export function revokeAiConsent(): void {
  removeItem(STORAGE_KEYS.consent);
}

/** 화면에서 동의 여부를 보여 줄 때 쓴다. 동의하면 true */
export function useAiConsent(): boolean {
  const [consent] = useStoredValue<Consent>(STORAGE_KEYS.consent, isConsent);
  return consent !== null;
}
