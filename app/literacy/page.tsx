// Design Ref: §2.1 화면 지도 `/literacy` — AI 리터러시 안내. 시험 규칙(토큰·횟수·배점)을 읽고 시작한다. (작업 16번)
import type { Metadata } from "next";
import Link from "next/link";
import { LIMITS } from "@/lib/limits";

export const metadata: Metadata = {
  title: "AI 리터러시 면접 | 은행 면접도우미 A to Z",
};

export default function LiteracyPage() {
  const tokens = LIMITS.LITERACY_BUNDLE_TOKENS.toLocaleString("ko-KR");
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">AI 리터러시 면접: 모의 시험</h1>
        <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          여러 파일을 읽고 AI 어시스트에게 물어 가며 푸는 10문제 연습 시험입니다. 모든 문제와 파일은 연습용 가상 자료입니다.
        </p>
      </div>

      <section aria-labelledby="rule-set" className="flex flex-col gap-2">
        <h2 id="rule-set" className="text-lg font-bold">
          문제 구성과 배점 (100점)
        </h2>
        <ul className="list-disc pl-5 text-sm leading-7">
          <li>묶음 A: 출장비 정산 규정과 사원별 정산서를 보고 짧게 답하는 주관식 6문제 (문제당 10점)</li>
          <li>묶음 B: 생성형 AI 개념을 묻는 객관식 O/X 3문제 (문제당 5점)</li>
          <li>묶음 C: 메신저·회의 전사·이메일·메모를 모아 월간 일정표를 만드는 서술형 1문제 (25점)</li>
          <li>10문제를 한 번에 제출합니다. 제출하기 전에는 묶음 사이를 자유롭게 오갈 수 있습니다.</li>
        </ul>
      </section>

      <section aria-labelledby="rule-limit" className="flex flex-col gap-2">
        <h2 id="rule-limit" className="text-lg font-bold">
          AI 어시스트와 토큰
        </h2>
        <ul className="list-disc pl-5 text-sm leading-7">
          <li>
            묶음마다 토큰 {tokens}개, 질문 {LIMITS.LITERACY_BUNDLE_QUESTIONS}회까지 쓸 수 있고, 남은 양이 화면에 항상 보입니다.
          </li>
          <li>파일은 처음 열 때 파일의 토큰 수만큼 차감됩니다. 같은 파일을 다시 열어도 차감되지 않습니다.</li>
          <li>내가 보낸 질문과 AI의 답변도 글자 수로 어림해 차감됩니다. (토큰 수는 어림값입니다)</li>
          <li>어시스트는 내가 열어 본 파일만 참고합니다. 묶음 A·C는 파일에 있는 내용만 근거로 답합니다.</li>
          <li>토큰이나 질문 횟수가 다 떨어지면 그 묶음의 AI 어시스트만 멈춥니다. 답 입력과 제출은 계속할 수 있습니다.</li>
        </ul>
      </section>

      <section aria-labelledby="rule-store" className="flex flex-col gap-2">
        <h2 id="rule-store" className="text-lg font-bold">
          저장에 대해
        </h2>
        <p className="text-sm leading-7">
          입력한 답과 남은 토큰·횟수는 이 브라우저에만 저장됩니다. 서버에는 저장하지 않습니다. 브라우저 저장을 지우거나 시크릿 모드·다른 브라우저를 쓰면 처음 상태로 돌아갈 수
          있습니다.
        </p>
      </section>

      <Link
        href="/literacy/exam"
        data-testid="exam-start"
        className="w-fit rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        시험 시작
      </Link>
    </main>
  );
}
