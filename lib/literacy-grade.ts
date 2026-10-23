// Design Ref: §3.5 채점 규칙 / §4 `/api/literacy/grade` — 제출한 답 10개를 정답과 비교해 점수·정답·해설을 만든다. (서버 전용)
// 정답 파일(content/literacy/answers)을 읽는 곳은 이 파일 한 곳뿐이다. 브라우저는 제출한 뒤에만 이 결과를 받는다.
import "server-only";
import { SET_A_ANSWERS } from "@/content/literacy/answers/set-a";
import { SET_B_ANSWERS } from "@/content/literacy/answers/set-b";
import { SET_C_ANSWER } from "@/content/literacy/answers/set-c";
import { gradeSchedule, isOxCorrect, isShortCorrect, roundScore } from "@/lib/grading";
import { buildPublicSet } from "@/lib/literacy-content";
import type { BundleId, GradeResponse, QuestionGrade } from "@/lib/literacy-types";
import type { ScheduleCells } from "@/lib/schedule-format";

export type GradeInput = {
  /** 객관식·단답형 답. 문제 번호표 → 답 */
  text: Record<string, string>;
  /** 서술형 일정표 (형식 검사를 통과한 것) */
  schedule: ScheduleCells[];
};

export function gradeExam(input: GradeInput): GradeResponse {
  const set = buildPublicSet();
  const questions: QuestionGrade[] = [];

  for (const q of set.questions) {
    if (q.kind === "short") {
      const key = SET_A_ANSWERS.find((a) => a.id === q.id)!;
      const userAnswer = input.text[q.id] ?? "";
      const correct = isShortCorrect(userAnswer, key.answer, key.accepted);
      questions.push({ id: q.id, number: q.number, bundle: q.bundle, kind: "short", prompt: q.prompt, points: q.points, earned: correct ? q.points : 0, correct, userAnswer, correctAnswer: key.answer, explanation: key.explanation });
    } else if (q.kind === "ox") {
      const key = SET_B_ANSWERS.find((a) => a.id === q.id)!;
      const userAnswer = input.text[q.id] ?? "";
      const correct = isOxCorrect(userAnswer, key.answer);
      questions.push({ id: q.id, number: q.number, bundle: q.bundle, kind: "ox", prompt: q.prompt, points: q.points, earned: correct ? q.points : 0, correct, userAnswer, correctAnswer: key.answer, explanation: key.explanation });
    }
  }

  const essay = set.questions.find((q) => q.kind === "schedule")!;
  const result = gradeSchedule(input.schedule, SET_C_ANSWER.rows, essay.points);
  const schedule = {
    id: essay.id,
    number: essay.number,
    prompt: essay.prompt,
    points: essay.points,
    earned: result.earned,
    correctRows: result.correctRows,
    wrongRows: result.wrongRows,
    answerRowCount: result.answerRowCount,
    submitted: result.rows.map((r) => ({ row: { ...r.row }, status: r.status })),
    answerRows: SET_C_ANSWER.rows.map((r) => ({ date: r.date, time: r.time, title: r.titles[0], place: r.place, attendees: r.attendees, reason: r.reason })),
    excluded: SET_C_ANSWER.excluded,
  };

  const bundleScores = { A: { earned: 0, max: 0 }, B: { earned: 0, max: 0 }, C: { earned: schedule.earned, max: schedule.points } } as Record<BundleId, { earned: number; max: number }>;
  for (const q of questions) {
    bundleScores[q.bundle].earned += q.earned;
    bundleScores[q.bundle].max += q.points;
  }
  const total = roundScore(questions.reduce((sum, q) => sum + q.earned, 0) + schedule.earned);
  const max = questions.reduce((sum, q) => sum + q.points, 0) + schedule.points;
  return { total, max, bundleScores, questions, schedule };
}
