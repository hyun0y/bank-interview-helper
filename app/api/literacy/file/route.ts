// Design Ref: §4 서버 API 설계 `/api/literacy/file` — 파일 번호를 받아 그 파일의 내용을 돌려준다. 서버 폴더의 가상 자료만 읽는다.
import { z } from "zod";
import { readJsonBody } from "@/lib/api-input";
import { findLiteracyFile } from "@/lib/literacy-content";

const bodySchema = z.object({
  fileId: z.string("파일 번호를 보내 주세요.").trim().min(1, "파일 번호를 보내 주세요.").max(20, "파일 번호가 올바르지 않습니다."),
});

export async function POST(request: Request) {
  const body = await readJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  const file = findLiteracyFile(body.data.fileId);
  if (!file) return Response.json({ error: { code: "not_found", message: "없는 파일입니다." } }, { status: 404 });
  return Response.json({ id: file.id, name: file.name, content: file.content });
}
