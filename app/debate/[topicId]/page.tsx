// Design Ref: §2.1 화면 지도 `/debate/[topicId]` — 입장을 고르고 의견을 본다. (작업 22번)
// 페이지의 params는 Promise라서 await로 받는다. (Next.js 16)
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DebateRoom from "@/components/DebateRoom";
import { DEBATE_TOPICS } from "@/content/debate/topics";

export const metadata: Metadata = {
  title: "토론 | 은행 면접도우미 A to Z",
};

// 주제 목록은 정해져 있으므로 미리 만들어 둔다. 목록에 없는 주소는 404가 된다.
export function generateStaticParams() {
  return DEBATE_TOPICS.map((topic) => ({ topicId: topic.id }));
}

export default async function DebateTopicPage({ params }: PageProps<"/debate/[topicId]">) {
  const { topicId } = await params;
  const topic = DEBATE_TOPICS.find((item) => item.id === topicId);
  if (!topic) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/debate" className="w-fit text-sm underline">
        ← 주제 목록
      </Link>
      <DebateRoom topic={topic} />
    </main>
  );
}
