// Design Ref: §2.1 화면 지도 `/bei/result` — 저장해 둔 BEI 결과를 다시 본다. (작업 11번)
import type { Metadata } from "next";
import BeiSavedResults from "@/components/BeiSavedResults";

export const metadata: Metadata = {
  title: "저장한 BEI 결과 | 은행 면접도우미 A to Z",
};

export default function BeiResultPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">저장한 BEI 결과</h1>
        <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">이 브라우저에 저장해 둔 질문과 모범 답변을 다시 볼 수 있습니다.</p>
      </div>
      <BeiSavedResults />
    </main>
  );
}
