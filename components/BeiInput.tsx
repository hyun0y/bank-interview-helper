"use client";
// Design Ref: §2.3 BEI 입력 `/bei` ① 내용 넣기 — 글 붙여넣기 칸 + PDF·워드 올리기.
//   HWP·글자를 읽을 수 없는 파일 안내, 1만 자 초과 시 다음 단계로 못 감.
// 자기소개서 원본은 이 화면의 상태(메모리)에만 있다. 저장하지 않고 서버로도 보내지 않는다. (PRD 7번)
// ②개인정보 확인은 작업 7번, ③경험 고르기는 작업 8번에서 이어서 만든다.
import { useId, useRef, useState, type ChangeEvent } from "react";
import { checkTextLength, extractTextFromFile, normalizeText } from "@/lib/file-text";
import { LIMITS } from "@/lib/limits";

type FileNote = { name: string; ok: boolean; message: string };

export default function BeiInput() {
  const [text, setText] = useState("");
  const [notes, setNotes] = useState<FileNote[]>([]);
  const [reading, setReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaId = useId();
  const fileHelpId = useId();

  const check = checkTextLength(text);
  const overLimit = !check.ok && check.reason === "too_long";

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // 같은 파일을 다시 고를 수 있게 비운다.
    if (files.length === 0) return;

    setReading(true);
    const nextNotes: FileNote[] = [];
    const pieces: string[] = [];
    for (const file of files) {
      const result = await extractTextFromFile(file);
      if (result.ok) {
        pieces.push(result.text);
        nextNotes.push({ name: file.name, ok: true, message: `글자 ${result.text.length.toLocaleString()}자를 읽었습니다.` });
      } else {
        nextNotes.push({ name: file.name, ok: false, message: result.message });
      }
    }
    // 읽은 글은 아래 칸의 기존 글 뒤에 이어 붙인다. (자기소개서와 경험 정리 파일을 함께 쓸 수 있게)
    if (pieces.length > 0) setText((current) => normalizeText([current, ...pieces].filter(Boolean).join("\n\n")));
    setNotes(nextNotes);
    setReading(false);
  }

  function handleClear() {
    setText("");
    setNotes([]);
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="bei-step1" className="flex flex-col gap-4">
        <h2 id="bei-step1" className="text-lg font-bold">
          ① 내용 넣기
        </h2>

        <div className="flex flex-col gap-2">
          <label htmlFor={textareaId} className="text-sm font-medium">
            자기소개서·경험 글 붙여넣기
          </label>
          <textarea
            id={textareaId}
            data-testid="bei-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            aria-invalid={overLimit}
            aria-describedby={`${textareaId}-count`}
            placeholder="자기소개서나 경험을 정리한 글을 여기에 붙여넣어 주세요."
            className="w-full resize-y rounded-md border border-zinc-400 bg-transparent px-3 py-2 text-sm leading-6 aria-[invalid=true]:border-red-600"
          />
          <div id={`${textareaId}-count`} className="flex flex-wrap items-center justify-between gap-2 text-sm" aria-live="polite">
            <span data-testid="bei-count" className={overLimit ? "font-medium text-red-600" : "text-zinc-600 dark:text-zinc-300"}>
              {check.length.toLocaleString()} / {LIMITS.BEI_TEXT_MAX_CHARS.toLocaleString()}자
            </span>
            {overLimit && (
              <span data-testid="bei-error" role="alert" className="font-medium text-red-600">
                {check.message}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">또는 파일 올리기 (PDF · 워드)</span>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              data-testid="bei-file"
              aria-describedby={fileHelpId}
              onChange={handleFiles}
              disabled={reading}
              className="text-sm file:mr-3 file:rounded-md file:border file:border-zinc-400 file:bg-transparent file:px-3 file:py-1.5 file:text-sm hover:file:bg-zinc-100 dark:hover:file:bg-zinc-800"
            />
            {reading && (
              <span role="status" className="text-sm text-zinc-600 dark:text-zinc-300">
                글자를 읽는 중입니다…
              </span>
            )}
          </div>
          <p id={fileHelpId} className="text-xs leading-5 text-zinc-600 dark:text-zinc-300">
            파일은 5MB까지 올릴 수 있고, 읽은 글자가 위 칸에 이어 붙습니다. 파일 자체는 저장하거나 서버로 보내지 않습니다.
            <br />※ HWP는 PDF나 워드로 저장해 올려 주세요.
          </p>
          {notes.length > 0 && (
            <ul data-testid="bei-file-notes" className="flex flex-col gap-1 text-sm" aria-live="polite">
              {notes.map((note, index) => (
                <li key={`${note.name}-${index}`} className={note.ok ? "text-zinc-700 dark:text-zinc-200" : "font-medium text-red-600"}>
                  {note.name}: {note.message}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleClear}
            disabled={text.length === 0 && notes.length === 0}
            className="rounded-md border border-zinc-400 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
          >
            내용 비우기
          </button>
        </div>
      </section>

      <section aria-label="다음 단계" className="flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <button
          type="button"
          disabled
          data-testid="bei-next"
          data-ready={check.ok}
          className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          다음: 개인정보 확인
        </button>
        <p className="text-sm text-zinc-600 dark:text-zinc-300" data-testid="bei-next-hint">
          {check.ok
            ? "입력이 확인되었습니다. 개인정보 확인 단계는 곧 이어서 만들어집니다."
            : check.message}
        </p>
      </section>
    </div>
  );
}
