"use client";
// Design Ref: §2.4 BEI 결과 (nice) — 면접관 음성 읽기의 속도 조절과 안내. 한국어 목소리가 없으면 읽기 기능 대신 안내문만 보여 준다. (작업 20번)
import { RATE_MAX, RATE_MIN, RATE_STEP, formatRate } from "@/lib/speech";
import type { SpeechControls } from "@/lib/use-speech";

export default function VoiceBar({ speech }: { speech: SpeechControls }) {
  if (speech.status === "checking") return null;

  if (speech.status === "unsupported") {
    return (
      <p data-testid="voice-unsupported" role="status" className="text-xs text-zinc-600 dark:text-zinc-300">
        이 브라우저에서는 음성을 지원하지 않습니다.
      </p>
    );
  }

  return (
    <div data-testid="voice-bar" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
      <span className="font-medium">🔊 면접관 음성</span>
      <label className="flex items-center gap-2 text-xs">
        읽는 속도
        <input
          type="range"
          data-testid="voice-rate"
          min={RATE_MIN}
          max={RATE_MAX}
          step={RATE_STEP}
          value={speech.rate}
          onChange={(event) => speech.setRate(Number(event.target.value))}
          aria-valuetext={formatRate(speech.rate)}
          className="w-32"
        />
        <span data-testid="voice-rate-text" className="w-10 tabular-nums">
          {formatRate(speech.rate)}
        </span>
      </label>
      <button
        type="button"
        data-testid="voice-stop"
        onClick={speech.stop}
        disabled={speech.speakingKey === null}
        className="rounded-md border border-zinc-400 px-2.5 py-1 text-xs hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
      >
        ■ 멈추기
      </button>
    </div>
  );
}
