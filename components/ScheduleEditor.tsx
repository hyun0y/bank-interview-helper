"use client";
// Design Ref: §2.5 시험 화면 — 묶음 C(서술형)의 5칸 표(날짜 · 시작-종료(KST) · 제목 · 장소/형식 · 참석자/대상) 입력 부품. (작업 16번)
// 표 형식 검사("형식 오류" 안내)는 제출·채점을 만드는 19번에서 붙인다.
import type { ScheduleColumn } from "@/lib/literacy-types";
import { emptyScheduleRow, type ScheduleRowInput } from "@/lib/literacy-exam";

type Props = {
  columns: ScheduleColumn[];
  rows: ScheduleRowInput[];
  onChange: (rows: ScheduleRowInput[]) => void;
  disabled?: boolean;
};

export default function ScheduleEditor({ columns, rows, onChange, disabled = false }: Props) {
  function setCell(rowIndex: number, key: ScheduleColumn["key"], value: string) {
    onChange(rows.map((row, i) => (i === rowIndex ? { ...row, [key]: value } : row)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <caption className="sr-only">일정표 입력</caption>
          <thead>
            <tr>
              <th scope="col" className="w-8 border-b border-zinc-300 px-1 py-2 text-left font-medium dark:border-zinc-700">
                #
              </th>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="border-b border-zinc-300 px-1 py-2 text-left font-medium dark:border-zinc-700">
                  {column.label}
                </th>
              ))}
              <th scope="col" className="w-14 border-b border-zinc-300 dark:border-zinc-700">
                <span className="sr-only">줄 지우기</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} data-testid={`schedule-row-${rowIndex}`}>
                <td className="px-1 py-1 text-zinc-500">{rowIndex + 1}</td>
                {columns.map((column) => (
                  <td key={column.key} className="px-1 py-1">
                    <input
                      data-testid={`schedule-${rowIndex}-${column.key}`}
                      aria-label={`${rowIndex + 1}번째 줄 ${column.label}`}
                      value={row[column.key]}
                      onChange={(e) => setCell(rowIndex, column.key, e.target.value)}
                      disabled={disabled}
                      placeholder={column.key === "date" ? "2025-11-05" : column.key === "time" ? "08:30-09:30" : ""}
                      className="w-full rounded-md border border-zinc-400 bg-transparent px-2 py-1.5 disabled:opacity-50"
                    />
                  </td>
                ))}
                <td className="px-1 py-1">
                  <button
                    type="button"
                    data-testid={`schedule-remove-${rowIndex}`}
                    onClick={() => onChange(rows.filter((_, i) => i !== rowIndex))}
                    disabled={disabled || rows.length <= 1}
                    className="rounded-md border border-zinc-400 px-2 py-1 text-xs hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
                  >
                    지우기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="schedule-add"
          onClick={() => onChange([...rows, emptyScheduleRow()])}
          disabled={disabled}
          className="rounded-md border border-zinc-400 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
        >
          + 줄 추가
        </button>
        <ul className="text-xs leading-5 text-zinc-600 dark:text-zinc-300">
          {columns.map((column) => (
            <li key={column.key}>
              <span className="font-medium">{column.label}</span>: {column.format}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
