// Design Ref: §2.1 화면 지도 — 모든 화면 맨 위의 헤더 (앱 이름, 처음으로 가기)
import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-base font-bold tracking-tight">
          은행 면접도우미 A to Z
        </Link>
        <nav aria-label="주요 이동" className="text-sm">
          <Link href="/" className="rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            처음으로
          </Link>
        </nav>
      </div>
    </header>
  );
}
