// Design Ref: §3.1 BEI 면접 [처리 1: 브라우저] — 글자 읽기는 브라우저 안에서 한다. 원본 파일은 서버로 보내지 않는다.
//   (Vercel 요청 크기 한도와 개인정보를 모두 피하려는 설계 결정: DESIGN §7)
// PRD 5번 BEI 규칙: PDF·docx를 5MB까지 받고, HWP·글자를 읽을 수 없는 파일은 안내 문구를 보여 준다.
// 브라우저 전용 파일이다. 서버에서 부르지 않는다.
import { LIMITS } from "@/lib/limits";

export type FileTextProblem = "too_large" | "hwp" | "unsupported" | "unreadable";

export type FileTextResult =
  | { ok: true; text: string; kind: "pdf" | "docx" }
  | { ok: false; problem: FileTextProblem; message: string };

/** 사용자에게 그대로 보여 주는 안내 문구 (PRD 문구) */
export const FILE_MESSAGES = {
  tooLarge: "파일이 5MB를 넘습니다. 더 작은 파일을 올리거나 텍스트로 붙여넣어 주세요.",
  hwp: "HWP 파일은 읽을 수 없습니다. PDF나 워드로 저장해 올려 주세요.",
  unsupported: "PDF 또는 워드(docx) 파일만 올릴 수 있습니다. 다른 형식은 텍스트로 붙여넣어 주세요.",
  unreadable: "글자를 읽을 수 없습니다. 텍스트로 붙여넣어 주세요.",
} as const;

/** 글자를 읽을 수 없는 파일(스캔 이미지 등)로 볼 기준: 읽어 낸 글자가 이보다 적으면 실패로 본다. */
const MIN_READABLE_CHARS = 20;

function fail(problem: FileTextProblem, message: string): FileTextResult {
  return { ok: false, problem, message };
}

/** 줄바꿈을 통일하고 불필요한 빈 줄·공백을 정리한다. */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

async function readPdf(data: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // 작업자 스크립트와 한글 글꼴 매핑표는 npm install 때 public/pdfjs로 복사된다. (scripts/copy-pdfjs.mjs)
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data), cMapUrl: "/pdfjs/cmaps/", cMapPacked: true });
  try {
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      let pageText = "";
      for (const item of content.items) {
        if ("str" in item) pageText += item.str + (item.hasEOL ? "\n" : "");
      }
      pages.push(pageText);
    }
    return pages.join("\n\n");
  } finally {
    await loadingTask.destroy();
  }
}

async function readDocx(data: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: data });
  return result.value;
}

/**
 * 파일에서 글자를 읽는다. 원본은 어디에도 저장하거나 보내지 않는다.
 * 실패하면 사용자에게 보여 줄 안내 문구를 함께 돌려준다.
 */
export async function extractTextFromFile(file: File): Promise<FileTextResult> {
  const ext = extensionOf(file.name);

  if (ext === "hwp" || ext === "hwpx") return fail("hwp", FILE_MESSAGES.hwp);
  if (ext !== "pdf" && ext !== "docx") return fail("unsupported", FILE_MESSAGES.unsupported);
  if (file.size > LIMITS.BEI_FILE_MAX_BYTES) return fail("too_large", FILE_MESSAGES.tooLarge);

  try {
    const data = await file.arrayBuffer();
    const text = normalizeText(ext === "pdf" ? await readPdf(data) : await readDocx(data));
    // 스캔 이미지·암호가 걸린 파일·망가진 파일은 글자를 거의 읽어 내지 못한다.
    if (text.length < MIN_READABLE_CHARS) return fail("unreadable", FILE_MESSAGES.unreadable);
    return { ok: true, text, kind: ext };
  } catch {
    // 암호가 걸렸거나 형식이 망가진 파일은 모두 "읽을 수 없음"으로 안내한다. (파일 내용은 기록하지 않는다)
    return fail("unreadable", FILE_MESSAGES.unreadable);
  }
}

// ---------------------------------------------------------------------------
// 글자 수 검사 (붙여넣은 글·파일에서 읽은 글 모두 같은 기준)
// ---------------------------------------------------------------------------

export type TextLengthCheck =
  | { ok: true; length: number }
  | { ok: false; length: number; reason: "empty" | "too_long"; message: string };

/** 1만 자(PRD)를 넘으면 진행을 막는다. 몇 자인지 함께 알려 준다. */
export function checkTextLength(text: string): TextLengthCheck {
  const length = text.trim().length;
  if (length === 0) return { ok: false, length, reason: "empty", message: "내용을 입력하거나 파일을 올려 주세요." };
  if (length > LIMITS.BEI_TEXT_MAX_CHARS) {
    return {
      ok: false,
      length,
      reason: "too_long",
      message: `1만 자 이내로 줄여 주세요. (지금 ${length.toLocaleString()}자)`,
    };
  }
  return { ok: true, length };
}
