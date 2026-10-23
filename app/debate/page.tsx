// Design Ref: §2.1 화면 지도 `/debate` — 토론 주제 목록. 주제를 고른다. (작업 22번)
import type { Metadata } from "next";
import Link from "next/link";
import { DEBATE_TOPICS } from "@/content/debate/topics";
import { DEBATE_CATEGORY_LABELS, type DebateCategory } from "@/lib/debate-types";

export const metadata: Metadata = {
  title: "토론 면접 | 은행 면접도우미 A to Z",
};

const CATEGORIES: DebateCategory[] = ["finance", "general"];

export default function DebatePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">토론 면접</h1>
        <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          주제를 고르고 찬성 또는 반대 입장을 정하면, 그 입장의 의견과 반대 입장의 논거, 생각지 못한 관점을 보여 줍니다. 토론 결과는 저장하지 않습니다.
        </p>
      </div>

      {CATEGORIES.map((category) => (
        <section key={category} aria-labelledby={`debate-${category}`} className="flex flex-col gap-3">
          <h2 id={`debate-${category}`} className="text-lg font-bold">
            {DEBATE_CATEGORY_LABELS[category]} 주제
          </h2>
          <ul className="flex flex-col gap-2">
            {DEBATE_TOPICS.filter((topic) => topic.category === category).map((topic) => (
              <li key={topic.id}>
                <Link
                  href={`/debate/${topic.id}`}
                  data-testid={`topic-${topic.id}`}
                  className="block rounded-lg border border-zinc-300 px-4 py-3 text-sm leading-6 transition-colors hover:border-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-100 dark:hover:bg-zinc-900"
                >
                  {topic.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
