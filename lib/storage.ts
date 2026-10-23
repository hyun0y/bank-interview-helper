// Design Ref: §3.4 브라우저에 저장하는 것 / §6 폴더 구조 — 저장·불러오기·전체 삭제를 이 파일 한 곳에서 한다. (브라우저 전용)
// Plan SC: 저장이 막힌 브라우저(시크릿 모드 등)에서도 그 화면에서는 동작하고, "저장되지 않습니다"를 알릴 수 있다.
// 서버에는 아무것도 보내지 않는다. 이 파일은 서버에서 불러도 오류 없이 "저장 불가"로 동작한다.

/** 이 앱이 저장하는 칸 이름. (DESIGN 3.4) 새 칸이 필요하면 여기에 추가한다. */
export const STORAGE_KEYS = {
  beiResults: "bei-results",
  examState: "exam-state",
  examResult: "exam-result",
  consent: "consent",
} as const;

/** 점검용 화면에서만 쓰는 칸 이름 */
export const DEV_STORAGE_KEY = "dev-check";

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS] | typeof DEV_STORAGE_KEY;

/** 이 앱의 칸에만 붙이는 이름표. "모두 삭제"가 다른 사이트·다른 앱의 저장 값을 지우지 않게 한다. */
const PREFIX = "bank-interview:";
const ENVELOPE_VERSION = 1;

type Envelope = { v: number; savedAt: string; data: unknown };

// 저장이 막힌 브라우저에서는 이 메모리 보관함을 대신 쓴다. 화면을 벗어나면(새로고침·닫기) 사라진다.
const memory = new Map<string, string>();
const listeners = new Set<() => void>();
let availability: boolean | null = null;

function notify() {
  for (const listener of listeners) listener();
}

function checkAvailability(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probe = `${PREFIX}__probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/** 이 브라우저가 저장을 허용하는가. (시크릿 모드·저장 차단 설정이면 false) */
export function isStorageAvailable(): boolean {
  availability ??= checkAvailability();
  return availability;
}

export type StorageStatus = "persistent" | "memory-only";

/** persistent: 브라우저에 저장됨 / memory-only: 이 화면에서만 유지됨(저장되지 않음) */
export function getStorageStatus(): StorageStatus {
  return isStorageAvailable() ? "persistent" : "memory-only";
}

export type SaveResult =
  | { ok: true; persisted: true }
  | { ok: true; persisted: false; reason: "unavailable" | "quota" }
  | { ok: false; reason: "serialize" };

/**
 * 값을 저장한다.
 * - 정상: 브라우저에 저장하고 { persisted: true }
 * - 저장이 막혔거나 공간이 부족하면: 이 화면의 메모리에만 두고 { persisted: false }로 알려 준다. (화면은 계속 동작)
 */
export function saveItem(key: StorageKey, value: unknown): SaveResult {
  let raw: string;
  try {
    const envelope: Envelope = { v: ENVELOPE_VERSION, savedAt: new Date().toISOString(), data: value };
    raw = JSON.stringify(envelope);
  } catch {
    return { ok: false, reason: "serialize" };
  }

  const fullKey = PREFIX + key;
  if (!isStorageAvailable()) {
    memory.set(fullKey, raw);
    notify();
    return { ok: true, persisted: false, reason: "unavailable" };
  }

  try {
    window.localStorage.setItem(fullKey, raw);
    memory.delete(fullKey);
    notify();
    return { ok: true, persisted: true };
  } catch (err) {
    // 저장 공간이 가득 찬 경우(QuotaExceededError)와 그 밖의 차단을 구분한다.
    const isQuota = err instanceof DOMException && (err.name === "QuotaExceededError" || err.code === 22);
    if (!isQuota) availability = false;
    memory.set(fullKey, raw);
    notify();
    return { ok: true, persisted: false, reason: isQuota ? "quota" : "unavailable" };
  }
}

/** 저장된 글자를 그대로 읽는다. 없으면 null. (화면 갱신 확인용으로 hook에서도 쓴다) */
export function readRaw(key: StorageKey): string | null {
  const fullKey = PREFIX + key;
  if (isStorageAvailable()) {
    try {
      const stored = window.localStorage.getItem(fullKey);
      if (stored !== null) return stored;
    } catch {
      availability = false;
    }
  }
  return memory.get(fullKey) ?? null;
}

/** 글자를 값으로 바꾼다. 형식이 맞지 않거나 검사에 통과하지 못하면 null */
export function parseStored<T>(raw: string | null, validate?: (value: unknown) => value is T): T | null {
  if (raw === null) return null;
  try {
    const envelope = JSON.parse(raw) as Partial<Envelope> | null;
    if (!envelope || envelope.v !== ENVELOPE_VERSION || !("data" in envelope)) return null;
    if (validate && !validate(envelope.data)) return null;
    return envelope.data as T;
  } catch {
    return null;
  }
}

/** 저장된 값을 불러온다. 없거나 망가졌거나 `validate`를 통과하지 못하면 null (오류를 던지지 않는다) */
export function loadItem<T>(key: StorageKey, validate?: (value: unknown) => value is T): T | null {
  return parseStored(readRaw(key), validate);
}

/** 한 칸을 지운다. */
export function removeItem(key: StorageKey): void {
  const fullKey = PREFIX + key;
  memory.delete(fullKey);
  if (isStorageAvailable()) {
    try {
      window.localStorage.removeItem(fullKey);
    } catch {
      availability = false;
    }
  }
  notify();
}

/**
 * "내 저장 데이터 모두 삭제": 이 앱이 저장한 칸만 모두 지운다.
 * 다른 사이트나 다른 앱의 저장 값은 건드리지 않는다. 지운 칸 수를 돌려준다.
 */
export function clearAllData(): { removed: number } {
  const targets = new Set<string>(memory.keys());
  if (typeof window !== "undefined") {
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const name = window.localStorage.key(i);
        if (name?.startsWith(PREFIX) && name !== `${PREFIX}__probe`) targets.add(name);
      }
      for (const name of targets) window.localStorage.removeItem(name);
    } catch {
      availability = false;
    }
  }
  memory.clear();
  notify();
  return { removed: targets.size };
}

/** 저장 값이 바뀔 때 알림을 받는다. (같은 화면의 변경 + 다른 탭의 변경). 해제 함수를 돌려준다. */
export function subscribeStorage(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(PREFIX)) listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}
