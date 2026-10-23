"use client";
// Design Ref: §2.6 시험 결과 `/literacy/result` — 100점 만점 점수, 문제별 O/X 표시, 정답과 해설, 묶음별 토큰·횟수 사용 내역을 위에서 아래로 보여 준다. (작업 19번)
// 결과는 서버가 아니라 이 브라우저에 저장된 것을 읽는다.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { isExamResult, type ExamResult } from "@/lib/exam-result";
import type { BundleId, QuestionGrade } from "@/lib/literacy-types";
import { removeItem, STORAGE_KEYS } from "@/lib/storage";
import { useStoredValue } from "@/lib/use-stored-value";

// 서버에서 먼저 그릴 때는 저장 값을 알 수 없으므로, 브라우저에서 읽을 수 있게 된 뒤에 그린다. (깜빡임 방지)
const subscribeNothing = () => () => {};

const BUNDLE_TITLES: Record<BundleId, string> = {
  A: "묶음 A · 출장비 정산 (주관식)",
  B: "묶음 B · 생성형 AI 개념 (객관식)",
  C: "묶음 C · 일정표 작성 (서술형)",
};

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Mark({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span
      aria-label={ok ? "정답" : "오답"}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${ok ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"}`}
    >
      {label ?? (ok ? "O" : "X")}
    </span>
  );
}

function QuestionRow({ q }: { q: QuestionGrade }) {
  return (
    <li data-testid={`result-q-${q.number}`} className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
      <div className="flex items-start gap-3">
        <Mark ok={q.correct} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">
            문제 {q.number} <span className="font-normal text-zinc-500 dark:text-zinc-400">· {formatScore(q.earned)} / {q.points}점</span>
          </p>
          <p className="mt-1 text-sm leading-6">{q.prompt}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-zinc-500 dark:text-zinc-400">내 답</dt>
            <dd data-testid={`result-user-${q.number}`} className="break-words">
              {q.userAnswer.trim() === "" ? <span className="text-zinc-500">(답하지 않음)</span> : q.userAnswer}
            </dd>
            <dt className="text-zinc-500 dark:text-zinc-400">정답</dt>
            <dd data-testid={`result-correct-${q.number}`} className="break-words font-medium">
              {q.correctAnswer}
            </dd>
          </dl>
          <p className="mt-2 rounded-md bg-zinc-50 p-3 text-sm leading-6 dark:bg-zinc-900">
            <span className="font-bold">해설 </span>
            {q.explanation}
          </p>
        </div>
      </div>
    </li>
  );
}

function Report({ result }: { result: ExamResult }) {
  const router = useRouter();
  const { grade, usage } = result;
  const schedule = grade.schedule;

  function retake() {
    removeItem(STORAGE_KEYS.examResult);
    removeItem(STORAGE_KEYS.examState);
    router.push("/literacy/exam");
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="result-score" className="rounded-lg border border-zinc-300 p-5 dark:border-zinc-700">
        <h2 id="result-score" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          총점 <span className="text-xs">({formatDate(result.gradedAt)} 채점)</span>
        </h2>
        <p className="mt-1 text-4xl font-bold tabular-nums">
          <span data-testid="result-total">{formatScore(grade.total)}</span>
          <span className="text-xl font-normal text-zinc-500"> / {grade.max}점</span>
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-3">
          {(["A", "B", "C"] as const).map((id) => (
            <li key={id} data-testid={`result-bundle-${id}`} className="rounded-md bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900">
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">{BUNDLE_TITLES[id]}</span>
              <span className="font-bold tabular-nums">
                {formatScore(grade.bundleScores[id].earned)} / {grade.bundleScores[id].max}점
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="result-marks" className="flex flex-col gap-3">
        <h2 id="result-marks" className="text-lg font-bold">
          문제별 결과
        </h2>
        <ol data-testid="result-marks" className="flex flex-wrap gap-2">
          {grade.questions.map((q) => (
            <li key={q.id} className="flex flex-col items-center gap-1 text-xs">
              <span>{q.number}번</span>
              <Mark ok={q.correct} />
            </li>
          ))}
          <li className="flex flex-col items-center gap-1 text-xs">
            <span>{schedule.number}번</span>
            <Mark ok={schedule.earned >= schedule.points} label={formatScore(schedule.earned)} />
          </li>
        </ol>
      </section>

      <section aria-labelledby="result-detail" className="flex flex-col gap-4">
        <h2 id="result-detail" className="text-lg font-bold">
          정답과 해설
        </h2>
        {(["A", "B"] as const).map((id) => (
          <div key={id} className="flex flex-col gap-3">
            <h3 className="text-sm font-bold">{BUNDLE_TITLES[id]}</h3>
            <ul className="flex flex-col gap-3">
              {grade.questions
                .filter((q) => q.bundle === id)
                .map((q) => (
                  <QuestionRow key={q.id} q={q} />
                ))}
            </ul>
          </div>
        ))}

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold">{BUNDLE_TITLES.C}</h3>
          <div data-testid="result-schedule" className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
            <p className="text-sm font-bold">
              문제 {schedule.number} <span className="font-normal text-zinc-500 dark:text-zinc-400">· {formatScore(schedule.earned)} / {schedule.points}점</span>
            </p>
            <p className="mt-1 text-sm leading-6">{schedule.prompt}</p>
            <p data-testid="result-schedule-summary" className="mt-3 text-sm">
              (맞은 줄 {schedule.correctRows}개 − 틀린 줄 {schedule.wrongRows}개) = {Math.max(0, schedule.correctRows - schedule.wrongRows)}줄, ÷ 정답 {schedule.answerRowCount}줄 × {schedule.points}점 = <b>{formatScore(schedule.earned)}점</b>
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">날짜·시작-종료·제목이 모두 맞아야 맞은 줄입니다. 장소/형식·참석자/대상은 점수에 넣지 않습니다.</p>

            <h4 className="mt-4 text-sm font-bold">내가 제출한 일정표</h4>
            {schedule.submitted.length === 0 ? (
              <p className="mt-1 text-sm text-zinc-500">(제출한 줄이 없습니다)</p>
            ) : (
              <div className="mt-1 overflow-x-auto">
                <table data-testid="result-submitted-table" className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs text-zinc-500 dark:text-zinc-400">
                      <th className="py-1 pr-2">결과</th>
                      <th className="py-1 pr-2">날짜</th>
                      <th className="py-1 pr-2">시작-종료</th>
                      <th className="py-1 pr-2">제목</th>
                      <th className="py-1 pr-2">장소/형식</th>
                      <th className="py-1">참석자/대상</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.submitted.map((item, i) => (
                      <tr key={i} data-testid={`result-submitted-${i}`} className="border-t border-zinc-200 align-top dark:border-zinc-800">
                        <td className="py-1.5 pr-2">
                          <Mark ok={item.status === "correct"} />
                        </td>
                        <td className="py-1.5 pr-2">{item.row.date}</td>
                        <td className="py-1.5 pr-2">{item.row.time}</td>
                        <td className="py-1.5 pr-2">{item.row.title}</td>
                        <td className="py-1.5 pr-2">{item.row.place}</td>
                        <td className="py-1.5">{item.row.attendees}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h4 className="mt-4 text-sm font-bold">정답 일정표와 해설</h4>
            <ol className="mt-2 flex flex-col gap-2">
              {schedule.answerRows.map((row, i) => (
                <li key={i} data-testid={`result-answer-row-${i}`} className="rounded-md bg-zinc-50 p-3 text-sm leading-6 dark:bg-zinc-900">
                  <p className="font-medium">
                    {row.date} · {row.time} · {row.title}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    장소/형식 {row.place} · 참석자/대상 {row.attendees}
                  </p>
                  <p className="mt-1 text-xs">{row.reason}</p>
                </li>
              ))}
            </ol>

            <h4 className="mt-4 text-sm font-bold">일정표에 넣지 않는 항목</h4>
            <ul className="mt-1 list-disc pl-5 text-sm leading-6">
              {schedule.excluded.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="result-usage" className="flex flex-col gap-3">
        <h2 id="result-usage" className="text-lg font-bold">
          토큰·질문 횟수 사용 내역
        </h2>
        <div className="overflow-x-auto">
          <table data-testid="result-usage" className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 dark:text-zinc-400">
                <th className="py-1 pr-3">묶음</th>
                <th className="py-1 pr-3">열어 본 파일</th>
                <th className="py-1 pr-3">파일 토큰</th>
                <th className="py-1 pr-3">질문·답변 토큰</th>
                <th className="py-1 pr-3">남은 토큰</th>
                <th className="py-1">질문 횟수</th>
              </tr>
            </thead>
            <tbody>
              {(["A", "B", "C"] as const).map((id) => {
                const u = usage[id];
                return (
                  <tr key={id} data-testid={`usage-${id}`} className="border-t border-zinc-200 tabular-nums dark:border-zinc-800">
                    <td className="py-1.5 pr-3 font-medium">묶음 {id}</td>
                    <td className="py-1.5 pr-3">{u.openedFileCount}개</td>
                    <td className="py-1.5 pr-3">{u.fileTokensUsed.toLocaleString("ko-KR")}</td>
                    <td className="py-1.5 pr-3">{u.chatTokensUsed.toLocaleString("ko-KR")}</td>
                    <td className="py-1.5 pr-3">
                      {u.tokensLeft.toLocaleString("ko-KR")} / {u.tokenLimit.toLocaleString("ko-KR")}
                    </td>
                    <td className="py-1.5">
                      {u.questionsUsed} / {u.questionLimit}회
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">토큰 수는 글자 수로 어림한 값입니다.</p>
      </section>

      <div className="flex flex-wrap gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <button type="button" data-testid="retake" onClick={retake} className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
          시험 다시 풀기
        </button>
        <Link href="/" className="rounded-md border border-zinc-400 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
          처음 화면으로
        </Link>
      </div>
    </div>
  );
}

export default function ExamResultView() {
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const [result] = useStoredValue<ExamResult>(STORAGE_KEYS.examResult, isExamResult);

  if (!hydrated) {
    return (
      <p role="status" className="text-sm text-zinc-600 dark:text-zinc-300">
        결과를 불러오는 중입니다…
      </p>
    );
  }
  if (!result) {
    return (
      <div data-testid="result-empty" className="rounded-md border border-zinc-300 p-4 text-sm leading-6 dark:border-zinc-700">
        <p className="font-medium">채점 결과가 없습니다.</p>
        <p className="mt-1 text-zinc-600 dark:text-zinc-300">시험을 제출하면 이 화면에서 점수와 정답·해설을 볼 수 있습니다.</p>
        <Link href="/literacy/exam" className="mt-3 inline-block underline">
          시험 보러 가기 →
        </Link>
      </div>
    );
  }
  return <Report result={result} />;
}
