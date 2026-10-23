"use client";
// Design Ref: §2.4 BEI 결과 (nice) — 질문을 한국어 음성으로 읽어 주는 hook. 브라우저 내장 음성 기능만 쓴다. (작업 20번)
// 한국어 목소리가 없거나 음성 기능이 없는 브라우저에서는 status가 "unsupported"가 되고, 화면은 읽기 버튼을 숨기고 안내문을 보여 준다.
// 목소리 목록은 브라우저가 늦게 채워 주는 경우가 있어서, 잠깐(1.5초) 기다려도 한국어 목소리가 없을 때 "지원 안 함"으로 판단한다.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { RATE_DEFAULT, clampRate, isKoreanVoice, pickKoreanVoice, toSpeakableText } from "@/lib/speech";

export type SpeechStatus = "checking" | "ready" | "unsupported";

const VOICE_WAIT_MS = 1500;

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return null;
  return window.speechSynthesis;
}

function subscribeVoices(callback: () => void): () => void {
  const synth = getSynth();
  if (!synth) return () => {};
  synth.addEventListener("voiceschanged", callback);
  return () => synth.removeEventListener("voiceschanged", callback);
}

// 같은 값이면 같은 결과를 돌려줘야 화면이 끝없이 다시 그려지지 않으므로, 글자(true/false)로 비교한다.
const hasKoreanVoiceSnapshot = (): boolean => getSynth()?.getVoices().some(isKoreanVoice) ?? false;
const hydratedSnapshot = () => true;
const subscribeNothing = () => () => {};

export function useSpeech() {
  const hydrated = useSyncExternalStore(subscribeNothing, hydratedSnapshot, () => false);
  const hasKoreanVoice = useSyncExternalStore(subscribeVoices, hasKoreanVoiceSnapshot, () => false);
  const [waited, setWaited] = useState(false);
  const [rate, setRateState] = useState(RATE_DEFAULT);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const currentKey = useRef<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), VOICE_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  // 화면을 떠나거나 다른 화면으로 바뀌면 읽던 것을 멈춘다.
  useEffect(() => {
    return () => {
      getSynth()?.cancel();
    };
  }, []);

  const status: SpeechStatus = !hydrated ? "checking" : hasKoreanVoice ? "ready" : waited || !getSynth() ? "unsupported" : "checking";

  const stop = useCallback(() => {
    currentKey.current = null;
    setSpeakingKey(null);
    getSynth()?.cancel();
  }, []);

  /** 글을 읽는다. 이미 읽고 있던 것은 멈추고, 같은 열쇠를 다시 누르면 멈춘다. */
  const speak = useCallback(
    (key: string, text: string) => {
      const synth = getSynth();
      const spoken = toSpeakableText(text);
      if (!synth || !spoken) return;
      if (currentKey.current === key) {
        stop();
        return;
      }
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(spoken);
      utterance.lang = "ko-KR";
      utterance.rate = rate;
      const voice = pickKoreanVoice(synth.getVoices());
      if (voice) utterance.voice = voice;
      const finish = () => {
        if (currentKey.current === key) {
          currentKey.current = null;
          setSpeakingKey(null);
        }
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      currentKey.current = key;
      setSpeakingKey(key);
      synth.speak(utterance);
    },
    [rate, stop],
  );

  const setRate = useCallback((value: number) => setRateState(clampRate(value)), []);

  return { status, rate, setRate, speakingKey, speak, stop };
}

export type SpeechControls = ReturnType<typeof useSpeech>;
