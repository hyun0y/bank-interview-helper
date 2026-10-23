// Design Ref: §2.1 화면 지도 — 모든 화면 맨 아래: "내 저장 데이터 모두 삭제" 버튼과 개인정보 안내 링크
import Link from "next/link";
import ClearDataButton from "@/components/ClearDataButton";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-5 text-sm sm:flex-row sm:items-center sm:justify-between">
        <ClearDataButton />
        <Link href="/privacy" className="underline">
          개인정보 안내
        </Link>
      </div>
    </footer>
  );
}
