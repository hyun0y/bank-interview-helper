// Design Ref: §2.1 화면 지도 `/bei` — BEI 입력. (작업 6번: ① 내용 넣기)
import type { Metadata } from "next";
import BeiFlow from "@/components/BeiFlow";

export const metadata: Metadata = {
  title: "BEI 면접 | 은행 면접도우미 A to Z",
};

export default function BeiPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">BEI 면접</h1>
        <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          자기소개서나 경험을 넣으면, 그 경험에 맞는 질문과 꼬리 질문, 1분 모범 답변을 만들어 드립니다.
        </p>
      </div>
      <BeiFlow />
    </main>
  );
}
