// Design Ref: §2.1 화면 지도 `/literacy/exam` — 문제를 풀고 AI 어시스트와 대화하는 시험 화면. (작업 16번)
import type { Metadata } from "next";
import ExamScreen from "@/components/ExamScreen";

export const metadata: Metadata = {
  title: "모의 시험 | 은행 면접도우미 A to Z",
};

export default function ExamPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-xl font-bold">AI 리터러시 모의 시험</h1>
      <ExamScreen />
    </main>
  );
}
