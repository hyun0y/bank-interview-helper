"use client";
// Design Ref: §2.4 BEI 결과 (nice) — 질문 옆의 [읽어 주기] 버튼. 음성을 쓸 수 있을 때만 보인다. (작업 20번)
import type { SpeechControls } from "@/lib/use-speech";

type Props = {
  speech: SpeechControls;
  /** 읽는 중인지 구분하는 열쇠 (질문마다 다르게) */
  speakKey: string;
  text: string;
  label: string;
};

export default function SpeakButton({ speech, speakKey, text, label }: Props) {
  if (speech.status !== "ready") return null;
  const speaking = speech.speakingKey === speakKey;
  return (
    <button
      type="button"
      data-testid={`speak-${speakKey}`}
      aria-pressed={speaking}
      aria-label={speaking ? `${label} 읽기 멈추기` : `${label} 읽어 주기`}
      onClick={() => speech.speak(speakKey, text)}
      className={`shrink-0 rounded-md border px-2 py-0.5 text-xs ${speaking ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "border-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
    >
      {speaking ? "■ 멈추기" : "▶ 읽어 주기"}
    </button>
  );
}
