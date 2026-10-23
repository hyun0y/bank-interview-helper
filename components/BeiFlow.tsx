"use client";
// Design Ref: §2.3 BEI 입력 `/bei` — ①내용 넣기 → ②개인정보 확인 → ③경험 고르기(작업 8번)를 이어 주는 부품.
// 글은 이 화면의 상태(메모리)에만 둔다. 저장하지 않고, ②가 끝나기 전에는 서버로도 보내지 않는다. (PRD 7번)
import { useState } from "react";
import BeiInput from "@/components/BeiInput";
import BeiPrivacyReview from "@/components/BeiPrivacyReview";
import { maskPersonalInfo, type PersonalInfoCounts } from "@/lib/masking";

type Step = "input" | "review";

export default function BeiFlow() {
  const [step, setStep] = useState<Step>("input");
  const [inputText, setInputText] = useState("");
  // ②에서 사용자가 고치고 있는 글(자동으로 가린 뒤의 글)
  const [reviewText, setReviewText] = useState("");
  const [autoCounts, setAutoCounts] = useState<PersonalInfoCounts | null>(null);

  function goToReview() {
    const masked = maskPersonalInfo(inputText);
    setReviewText(masked.text);
    setAutoCounts(masked.counts);
    setStep("review");
  }

  if (step === "review" && autoCounts) {
    return (
      <BeiPrivacyReview
        value={reviewText}
        onChange={setReviewText}
        autoCounts={autoCounts}
        onReset={() => setReviewText(maskPersonalInfo(inputText).text)}
        onBack={() => setStep("input")}
      />
    );
  }

  return <BeiInput text={inputText} onTextChange={setInputText} onNext={goToReview} />;
}
