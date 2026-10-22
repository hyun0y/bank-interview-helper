// Design Ref: §3.5 채점 규칙 "형식 검사(제출 전)" — 서술형 일정표가 열 5개의 표이고 날짜·시간 칸이 정해진 모양인지 확인한다. (작업 19번)
// 브라우저(제출 전 안내)와 서버(채점 전 확인)가 같은 규칙을 쓰도록 순수 계산으로만 만들었다.

export type ScheduleCells = {
  date: string;
  time: string;
  title: string;
  place: string;
  attendees: string;
};

export type ScheduleColumnKey = keyof ScheduleCells;

export type ScheduleFormatError = {
  /** 몇 번째 줄인가 (0부터, 빈 줄을 포함해 센 자리) */
  row: number;
  column: ScheduleColumnKey;
  message: string;
};

const COLUMN_LABELS: Record<ScheduleColumnKey, string> = {
  date: "날짜",
  time: "시작-종료(KST)",
  title: "제목",
  place: "장소/형식",
  attendees: "참석자/대상",
};

/** 칸이 모두 비어 있는 줄은 "없는 줄"로 본다. */
export function isEmptyRow(row: ScheduleCells): boolean {
  return Object.values(row).every((cell) => cell.trim() === "");
}

function isRealDate(text: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** "09:30-10:30" 모양이고, 시각이 실제로 있고, 끝이 시작보다 늦은가. 띄어쓰기는 무시한다. */
function checkTime(text: string): string | null {
  const compact = text.replace(/\s+/g, "");
  const match = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(compact);
  if (!match) return "시작-종료는 09:30-10:30처럼 24시간 HH:MM-HH:MM으로 써 주세요.";
  const [sh, sm, eh, em] = match.slice(1).map(Number);
  if (sh > 23 || eh > 23 || sm > 59 || em > 59) return "시각이 올바르지 않습니다. (시 00~23, 분 00~59)";
  if (eh * 60 + em <= sh * 60 + sm) return "종료 시각은 시작 시각보다 늦어야 합니다.";
  return null;
}

/** 비교할 때 쓰는 시간 모양(띄어쓰기를 뺀 것) */
export function compactTime(text: string): string {
  return text.replace(/\s+/g, "");
}

/** 제목 비교용: 띄어쓰기·기호를 모두 없애고 소문자로 바꾼다. */
export function normalizeTitle(text: string): string {
  return text.replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();
}

/** 일정표 형식을 검사한다. 오류가 없으면 빈 목록. 아무것도 안 쓴 줄은 건너뛴다. */
export function checkScheduleFormat(rows: ScheduleCells[]): ScheduleFormatError[] {
  const errors: ScheduleFormatError[] = [];
  rows.forEach((row, index) => {
    if (isEmptyRow(row)) return;
    const date = row.date.trim();
    if (!date) errors.push({ row: index, column: "date", message: "날짜를 써 주세요." });
    else if (!isRealDate(date)) errors.push({ row: index, column: "date", message: "날짜는 2025-11-05처럼 YYYY-MM-DD로 써 주세요. (없는 날짜는 안 됩니다)" });

    if (!row.time.trim()) errors.push({ row: index, column: "time", message: "시작-종료 시간을 써 주세요." });
    else {
      const problem = checkTime(row.time);
      if (problem) errors.push({ row: index, column: "time", message: problem });
    }

    for (const key of ["title", "place", "attendees"] as const) {
      if (!row[key].trim()) errors.push({ row: index, column: key, message: `${COLUMN_LABELS[key]} 칸을 채워 주세요.` });
    }
  });
  return errors;
}

export function describeFormatError(error: ScheduleFormatError): string {
  return `${error.row + 1}번째 줄 · ${COLUMN_LABELS[error.column]}: ${error.message}`;
}
