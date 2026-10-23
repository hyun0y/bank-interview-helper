// Design Ref: §2.1 화면 지도 `/literacy/result` — 점수·정답·해설·사용 내역을 본다. (작업 19번)
import type { Metadata } from "next";
import ExamResultView from "@/components/ExamResultView";

export const metadata: Metadata = {
  title: "시험 결과 | 은행 면접도우미 A to Z",
};

export default function LiteracyResultPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">AI 리터러시 모의 시험 결과</h1>
        <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">이 브라우저에 저장된 채점 결과입니다. 서버에는 저장되지 않습니다.</p>
      </div>
      <ExamResultView />
    </main>
  );
}
