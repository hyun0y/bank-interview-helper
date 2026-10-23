// Design Ref: §2.2 시작 화면 — 준비할 면접을 고른다. (BEI / AI 리터러시 / 토론)
import Link from "next/link";
import { AREAS, type Area } from "@/lib/areas";

function AreaCard({ area }: { area: Area }) {
  const body = (
    <>
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{area.subtitle}</span>
      <span className="mt-1 text-xl font-bold">{area.title}</span>
      <span className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{area.description}</span>
    </>
  );
  const base = "flex w-full flex-col rounded-lg border p-5 text-left";

  if (!area.ready) {
    // 아직 화면이 만들어지지 않은 영역은 누를 수 없게 두고 "준비 중"을 표시한다.
    return (
      <div
        aria-disabled="true"
        className={`${base} border-zinc-200 bg-zinc-50 opacity-70 dark:border-zinc-800 dark:bg-zinc-900`}
      >
        {body}
        <span className="mt-3 inline-block w-fit rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
          준비 중
        </span>
      </div>
    );
  }

  return (
    <Link
      href={area.href}
      className={`${base} border-zinc-300 transition-colors hover:border-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-100 dark:hover:bg-zinc-900`}
    >
      {body}
    </Link>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">은행 면접도우미 A to Z</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-300">준비할 면접을 골라 주세요.</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {AREAS.map((area) => (
          <li key={area.id} className="flex">
            <AreaCard area={area} />
          </li>
        ))}
      </ul>
    </main>
  );
}
