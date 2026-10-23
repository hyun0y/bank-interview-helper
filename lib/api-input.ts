// Design Ref: §4 서버 API 설계 — 모든 AI 호출 API는 ② 입력 검사(zod, 질문 길이·요청 크기)를 거친다.
// Plan SC: 질문 길이 상한(1,000자)과 요청 크기 제한이 동작한다.
import { z, type ZodType } from "zod";
import { LIMITS } from "@/lib/limits";
import { isJsonContentType } from "@/lib/request-guard";

/** AI 어시스트 질문: 비어 있지 않고 1,000자 이하 */
export const questionSchema = z
  .string("질문을 입력해 주세요.")
  .trim()
  .min(1, "질문을 입력해 주세요.")
  .max(LIMITS.QUESTION_MAX_CHARS, `질문은 ${LIMITS.QUESTION_MAX_CHARS.toLocaleString()}자 이내로 입력해 주세요.`);

type ReadResult<T> = { ok: true; data: T } | { ok: false; response: Response };

function fail(status: number, code: string, message: string, extra?: object): { ok: false; response: Response } {
  return { ok: false, response: Response.json({ error: { code, message, ...extra } }, { status }) };
}

/** 요청 본문을 최대 크기까지만 읽는다. 넘으면 읽기를 멈추고 null을 돌려준다. */
async function readLimitedText(request: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;

  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

/**
 * 요청 본문(JSON)을 읽고 약속한 모양인지 검사한다.
 * - Content-Type이 application/json이 아니면 415 (CHECK.md 2번: 브라우저가 사전 확인 없이 보낼 수 있는 text/plain 요청을 거른다)
 * - 너무 크면 413, JSON이 아니면 400, 모양이 다르면 400(어느 칸이 틀렸는지 포함)
 */
export async function readJsonBody<T>(request: Request, schema: ZodType<T>): Promise<ReadResult<T>> {
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return fail(415, "unsupported_media_type", "JSON 형식(application/json)으로 보내 주세요.");
  }

  const text = await readLimitedText(request, LIMITS.REQUEST_BODY_MAX_BYTES);
  if (text === null) {
    return fail(413, "body_too_large", "보내는 내용이 너무 큽니다. 내용을 줄여 주세요.");
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return fail(400, "invalid_json", "요청 형식이 올바르지 않습니다.");
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const { fieldErrors, formErrors } = z.flattenError(parsed.error);
    return fail(400, "invalid_input", "입력 내용이 올바르지 않습니다.", { fieldErrors, formErrors });
  }
  return { ok: true, data: parsed.data };
}
