"use client";
// Design Ref: §2.5 시험 화면 — 같은 시험 화면을 두 탭에서 동시에 쓰면 서로의 답을 덮어쓰므로, 한 탭만 쓰게 하고 다른 탭은 읽기만 되게 한다. (작업 18번)
// 브라우저의 Web Locks 기능으로 "이 시험 화면을 쓰는 탭"을 하나만 정한다. 탭을 닫으면 자동으로 풀린다.
// Web Locks를 지원하지 않는 브라우저에서는 확인하지 못하므로 그냥 쓸 수 있게 둔다.
import { useCallback, useEffect, useState } from "react";

const LOCK_NAME = "bank-interview:exam-tab";

export type ExamTabStatus = "checking" | "owner" | "other";

/** 개발 서버가 효과를 두 번 실행해도(이전 잠금이 풀리기 전에) 다른 탭으로 잘못 판단하지 않도록, 못 잡으면 잠깐 뒤 한 번 더 확인한다. */
const RECHECK_DELAY_MS = 250;

/** 이 탭이 시험 화면을 쓸 수 있는지 알려 준다. owner면 쓸 수 있고, other면 다른 탭이 쓰는 중이다. */
export function useExamTabLock(): { status: ExamTabStatus; retry: () => void } {
  const [status, setStatus] = useState<ExamTabStatus>("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("locks" in navigator)) {
      void Promise.resolve().then(() => setStatus("owner"));
      return;
    }

    let cancelled = false;
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let timer: ReturnType<typeof setTimeout> | undefined;

    function tryAcquire(isRecheck: boolean) {
      navigator.locks
        .request(LOCK_NAME, { ifAvailable: true }, (lock) => {
          if (cancelled) return undefined;
          if (!lock) {
            if (isRecheck) setStatus("other");
            else timer = setTimeout(() => !cancelled && tryAcquire(true), RECHECK_DELAY_MS);
            return undefined;
          }
          setStatus("owner");
          return held; // 이 탭이 닫히거나 화면을 떠날 때까지 잠금을 쥐고 있는다.
        })
        .catch(() => {
          if (!cancelled) setStatus("owner");
        });
    }

    tryAcquire(false);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      release();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setStatus("checking");
    setAttempt((n) => n + 1);
  }, []);

  return { status, retry };
}
