"use client";
// Design Ref: §2.3 BEI 입력 `/bei` — ①내용 넣기 → ②개인정보 확인 → ③경험 고르기를 이어 주는 부품.
// 글은 이 화면의 상태(메모리)에만 둔다. 저장하지 않고, ②가 끝나기 전에는 서버로도 보내지 않는다. (PRD 7번)
// ③으로 넘어갈 때 처음 한 번 AI 전달 동의를 받고, 가린 글을 /api/bei/split으로 보내 경험 후보를 찾는다.
import { useRef, useState } from "react";
import BeiExperiencePicker from "@/components/BeiExperiencePicker";
import BeiInput from "@/components/BeiInput";
import BeiPrivacyReview from "@/components/BeiPrivacyReview";
import { useEnsureAiConsent } from "@/components/AiConsentProvider";
import type { ExperienceCandidate, SplitResponse } from "@/lib/bei-types";
import { LIMITS } from "@/lib/limits";
import { maskPersonalInfo, type PersonalInfoCounts } from "@/lib/masking";

type Step = "input" | "review" | "pick";

export default function BeiFlow() {
  const ensureConsent = useEnsureAiConsent();
  const [step, setStep] = useState<Step>("input");
  const [inputText, setInputText] = useState("");
  // ②에서 사용자가 고치고 있는 글(자동으로 가린 뒤의 글)
  const [reviewText, setReviewText] = useState("");
  const [autoCounts, setAutoCounts] = useState<PersonalInfoCounts | null>(null);
  // ③ 경험 후보와 사용자가 고른 것
  const [candidates, setCandidates] = useState<ExperienceCandidate[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);
  // 같은 글로 다시 [다음]을 눌렀을 때 AI를 또 부르지 않도록 마지막 결과를 기억해 둔다. (불필요한 AI 요청·비용 방지)
  const lastSplit = useRef<{ text: string; candidates: ExperienceCandidate[] } | null>(null);

  function goToReview() {
    const masked = maskPersonalInfo(inputText);
    setReviewText(masked.text);
    setAutoCounts(masked.counts);
    setFindError(null);
    setStep("review");
  }

  async function findCandidates() {
    setFindError(null);
    const text = reviewText.trim();

    if (lastSplit.current?.text === text) {
      setCandidates(lastSplit.current.candidates);
      setStep("pick");
      return;
    }

    // 처음 AI를 쓰기 직전에 한 번만 동의를 받는다. 동의하지 않으면 AI를 부르지 않는다.
    const agreed = await ensureConsent();
    if (!agreed) {
      setFindError("AI 전달에 동의하지 않아 경험을 찾지 않았습니다. 동의하면 다음으로 넘어갈 수 있습니다.");
      return;
    }

    setFinding(true);
    try {
      const response = await fetch("/api/bei/split", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = (data as { error?: { message?: string } } | null)?.error?.message;
        setFindError(message ?? "경험을 찾지 못했습니다. 다시 시도해 주세요.");
        return;
      }
      const found = (data as SplitResponse | null)?.candidates;
      if (!Array.isArray(found)) {
        setFindError("경험을 찾지 못했습니다. 다시 시도해 주세요.");
        return;
      }
      lastSplit.current = { text, candidates: found };
      setCandidates(found);
      setSelected([]);
      setStep("pick");
    } catch {
      setFindError("서버와 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      setFinding(false);
    }
  }

  function toggleCandidate(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      return current.length >= LIMITS.BEI_MAX_SELECTED ? current : [...current, id];
    });
  }

  if (step === "pick") {
    return <BeiExperiencePicker candidates={candidates} selected={selected} onToggle={toggleCandidate} onBack={() => setStep("review")} />;
  }

  if (step === "review" && autoCounts) {
    return (
      <BeiPrivacyReview
        value={reviewText}
        onChange={setReviewText}
        autoCounts={autoCounts}
        onReset={() => setReviewText(maskPersonalInfo(inputText).text)}
        onBack={() => setStep("input")}
        onNext={findCandidates}
        finding={finding}
        findError={findError}
      />
    );
  }

  return <BeiInput text={inputText} onTextChange={setInputText} onNext={goToReview} />;
}
