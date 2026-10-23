"use client";
// 개발 중에만 쓰는 점검 화면의 본체입니다. (작업 15번: 토큰·질문 횟수 계산과 표시를 눈으로 확인)
// AI는 부르지 않습니다. 가짜 파일과 가짜 답변으로 차감 규칙만 확인합니다.
import { useState } from "react";
import AssistBudget from "@/components/AssistBudget";
import { canAsk, chargeQuestion, createBundleBudget, openFile } from "@/lib/literacy-budget";
import { estimateTokens } from "@/lib/tokens";

const FILES = [
  { id: "f1", name: "작은 파일", text: "가".repeat(600) },
  { id: "f2", name: "큰 파일", text: "나".repeat(9000) },
  { id: "f3", name: "영문 파일", text: "abcd".repeat(500) },
];
const FAKE_ANSWER = "다".repeat(300);

export default function BudgetCheck() {
  const [budget, setBudget] = useState(createBundleBudget);
  const [question, setQuestion] = useState("김도윤 대리의 숙박비 한도는 얼마인가요?");
  const [log, setLog] = useState<string[]>([]);
  const locked = !canAsk(budget).ok;

  function note(text: string) {
    setLog((prev) => [text, ...prev].slice(0, 8));
  }

  function handleOpen(id: string) {
    const file = FILES.find((f) => f.id === id);
    if (!file) return;
    const tokens = estimateTokens(file.text);
    const result = openFile(budget, id, tokens);
    setBudget(result.budget);
    note(result.firstOpen ? `${file.name}을 처음 열었습니다: -${result.charged}토큰` : `${file.name}은 이미 열었습니다: 차감 없음`);
  }

  function handleAsk(success: boolean) {
    if (locked) return;
    if (!success) {
      note("AI 호출이 실패했습니다: 차감 없음");
      return;
    }
    const result = chargeQuestion(budget, question, FAKE_ANSWER);
    setBudget(result.budget);
    note(`질문 1회: -${result.charged}토큰, 질문 -1`);
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">토큰·횟수 점검 (개발용)</h1>
      <AssistBudget budget={budget} />

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">파일 열기 (처음 열 때만 차감)</h2>
        <div className="flex flex-wrap gap-2">
          {FILES.map((file) => (
            <button
              key={file.id}
              type="button"
              data-testid={`open-${file.id}`}
              onClick={() => handleOpen(file.id)}
              className="rounded-md border border-zinc-400 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {file.name} ({estimateTokens(file.text).toLocaleString("ko-KR")}토큰)
              {budget.openedFileIds.includes(file.id) ? " ✓" : ""}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">질문하기 (가짜 답변 300자)</h2>
        <input
          data-testid="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={locked}
          className="rounded-md border border-zinc-400 bg-transparent px-3 py-2 text-sm disabled:opacity-40"
        />
        <p className="text-xs text-zinc-600 dark:text-zinc-300">
          질문 {estimateTokens(question)}토큰 + 답변 {estimateTokens(FAKE_ANSWER)}토큰 = {estimateTokens(question) + estimateTokens(FAKE_ANSWER)}토큰이 차감됩니다.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="ask-ok"
            onClick={() => handleAsk(true)}
            disabled={locked}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            보내기 (성공)
          </button>
          <button
            type="button"
            data-testid="ask-fail"
            onClick={() => handleAsk(false)}
            disabled={locked}
            className="rounded-md border border-zinc-400 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            보내기 (AI 실패)
          </button>
          <button
            type="button"
            data-testid="reset"
            onClick={() => {
              setBudget(createBundleBudget());
              setLog([]);
            }}
            className="rounded-md border border-zinc-400 px-3 py-1.5 text-sm"
          >
            처음으로
          </button>
        </div>
      </section>

      <ul data-testid="log" className="flex flex-col gap-1 text-xs text-zinc-700 dark:text-zinc-200">
        {log.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
      <p data-testid="used" className="text-xs text-zinc-600 dark:text-zinc-300">
        사용 내역: 파일 {budget.fileTokensUsed.toLocaleString("ko-KR")}토큰, 질문·답변 {budget.chatTokensUsed.toLocaleString("ko-KR")}토큰, 질문 {budget.questionsUsed}회
      </p>
    </main>
  );
}
