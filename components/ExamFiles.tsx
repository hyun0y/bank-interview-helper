"use client";
// Design Ref: §2.5 시험 화면 — 파일 목록(파일마다 토큰 수)과 파일 내용 보기. 처음 열 때만 토큰이 차감된다. (작업 16번)
import type { PublicFile } from "@/lib/literacy-types";

type Props = {
  files: PublicFile[];
  /** 지금까지 연 파일 번호 */
  openedIds: string[];
  /** 지금 내용을 보고 있는 파일 번호 */
  viewingId: string | null;
  /** 내용을 보고 있는 파일의 글 */
  viewingContent: string | null;
  loadingId: string | null;
  message: string | null;
  onOpen: (fileId: string) => void;
  onClose: () => void;
};

export default function ExamFiles({ files, openedIds, viewingId, viewingContent, loadingId, message, onOpen, onClose }: Props) {
  if (files.length === 0) return null;
  const viewing = files.find((file) => file.id === viewingId);

  return (
    <section aria-labelledby="exam-files" className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <h3 id="exam-files" className="text-sm font-bold">
        파일 목록
      </h3>
      <p className="text-xs leading-5 text-zinc-600 dark:text-zinc-300">눌러서 내용을 봅니다. 처음 열 때 파일의 토큰 수만큼 차감되고, 다시 열면 차감되지 않습니다.</p>
      <ul className="flex flex-col gap-2">
        {files.map((file) => {
          const opened = openedIds.includes(file.id);
          const selected = file.id === viewingId;
          return (
            <li key={file.id}>
              <button
                type="button"
                data-testid={`file-${file.id}`}
                onClick={() => onOpen(file.id)}
                disabled={loadingId !== null}
                aria-pressed={selected}
                className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm disabled:opacity-60 ${selected ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"}`}
              >
                <span>
                  📄 {file.name}
                  {opened && <span className="ml-2 text-xs text-zinc-500">열어 봄</span>}
                </span>
                <span data-testid={`file-tokens-${file.id}`} className="shrink-0 text-xs tabular-nums text-zinc-600 dark:text-zinc-300">
                  {loadingId === file.id ? "불러오는 중…" : `${file.tokens.toLocaleString("ko-KR")}토큰`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {message && (
        <p data-testid="file-message" role="status" className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
          {message}
        </p>
      )}

      {viewing && viewingContent !== null && (
        <div data-testid="file-viewer" className="rounded-md border border-zinc-300 p-3 dark:border-zinc-700">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold">{viewing.name}</p>
            <button type="button" data-testid="file-close" onClick={onClose} className="rounded-md border border-zinc-400 px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800">
              닫기
            </button>
          </div>
          <pre data-testid="file-content" className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words text-sm leading-6">
            {viewingContent}
          </pre>
        </div>
      )}
    </section>
  );
}
