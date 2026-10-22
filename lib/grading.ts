// Design Ref: §3.5 채점 규칙 — 객관식·단답형·서술형을 정답과 비교해 점수를 계산한다. (작업 19번)
// 정답을 인자로 받는 순수 계산이라 정답 파일을 직접 읽지 않는다. (정답을 읽는 곳은 서버의 lib/literacy-grade.ts 한 곳뿐)
import { compactTime, isEmptyRow, normalizeTitle, type ScheduleCells } from "@/lib/schedule-format";
import type { ScheduleAnswerRow } from "@/lib/literacy-types";

/** 단답형 비교용: 앞뒤·중간의 띄어쓰기를 모두 없앤다. 그 밖의 글자는 그대로 둔다. (이름 목록은 쉼표와 순서까지 같아야 한다) */
export function normalizeShortAnswer(text: string): string {
  return text.replace(/\s+/g, "");
}

/** 단답형이 맞는가: 띄어쓰기를 뺀 뒤 정답(또는 함께 인정하는 표기)과 똑같으면 맞다. */
export function isShortCorrect(userAnswer: string, answer: string, accepted: string[] = []): boolean {
  const normalized = normalizeShortAnswer(userAnswer);
  if (normalized === "") return false;
  return [answer, ...accepted].some((candidate) => normalizeShortAnswer(candidate) === normalized);
}

/** 객관식(O/X)이 맞는가 */
export function isOxCorrect(userAnswer: string, answer: "O" | "X"): boolean {
  return userAnswer.trim().toUpperCase() === answer;
}

export type ScheduleRowResult = {
  row: ScheduleCells;
  status: "correct" | "wrong";
};

export type ScheduleGradeResult = {
  /** 점수 (소수 첫째 자리까지) */
  earned: number;
  correctRows: number;
  wrongRows: number;
  answerRowCount: number;
  rows: ScheduleRowResult[];
};

/** 점수를 소수 첫째 자리까지 반올림한다. */
export function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * 서술형 일정표 채점.
 *  - 제출한 줄의 날짜 + 시작-종료 + 제목이 정답의 어떤 줄과 모두 같으면 "맞은 줄"이다. (제목은 띄어쓰기·기호를 무시하고 허용 표현 목록과 비교)
 *  - 정답의 한 줄은 한 번만 맞은 것으로 센다. 같은 줄을 또 쓰거나 정답에 없는 줄은 "틀린 줄"이다.
 *  - 장소/형식·참석자/대상은 점수에 넣지 않는다.
 *  - 점수 = 배점 × max(0, 맞은 줄 − 틀린 줄) ÷ 정답 줄 수
 */
export function gradeSchedule(submitted: ScheduleCells[], answerRows: ScheduleAnswerRow[], points: number): ScheduleGradeResult {
  const used = new Set<number>();
  const rows: ScheduleRowResult[] = [];
  for (const row of submitted) {
    if (isEmptyRow(row)) continue;
    const title = normalizeTitle(row.title);
    const matchIndex = answerRows.findIndex(
      (answer, index) =>
        !used.has(index) &&
        answer.date === row.date.trim() &&
        answer.time === compactTime(row.time) &&
        answer.titles.some((candidate) => normalizeTitle(candidate) === title),
    );
    if (matchIndex >= 0) {
      used.add(matchIndex);
      rows.push({ row, status: "correct" });
    } else {
      rows.push({ row, status: "wrong" });
    }
  }
  const correctRows = used.size;
  const wrongRows = rows.length - correctRows;
  const earned = answerRows.length === 0 ? 0 : roundScore((points * Math.max(0, correctRows - wrongRows)) / answerRows.length);
  return { earned, correctRows, wrongRows, answerRowCount: answerRows.length, rows };
}
