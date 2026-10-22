// Design Ref: §4 서버 API 설계 `/api/literacy/grade` — 제출한 답 10개를 채점해 점수·정답·해설을 돌려준다. AI를 부르지 않는다.
// 서술형 일정표는 채점 전에 형식을 검사하고, 틀리면 "형식 오류"로 돌려보낸다. (점수·정답은 내려가지 않는다)
import { z } from "zod";
import { readJsonBody } from "@/lib/api-input";
import { gradeExam } from "@/lib/literacy-grade";
import { checkScheduleFormat } from "@/lib/schedule-format";

const MAX_ANSWER_CHARS = 2000;
const MAX_CELL_CHARS = 500;

const bodySchema = z.object({
  text: z.record(z.string().max(40), z.string().max(MAX_ANSWER_CHARS)).refine((value) => Object.keys(value).length <= 20, "답이 너무 많습니다."),
  schedule: z
    .array(
      z.object({
        date: z.string().max(MAX_CELL_CHARS),
        time: z.string().max(MAX_CELL_CHARS),
        title: z.string().max(MAX_CELL_CHARS),
        place: z.string().max(MAX_CELL_CHARS),
        attendees: z.string().max(MAX_CELL_CHARS),
      }),
    )
    .max(60, "일정표 줄이 너무 많습니다."),
});

export async function POST(request: Request) {
  const body = await readJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  const errors = checkScheduleFormat(body.data.schedule);
  if (errors.length > 0) {
    return Response.json({ error: { code: "schedule_format", message: "일정표 형식 오류가 있습니다. 고친 뒤 다시 제출해 주세요.", errors } }, { status: 400 });
  }

  return Response.json(gradeExam(body.data));
}
