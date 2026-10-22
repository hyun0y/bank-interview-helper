// 묶음 C 문제 (서술형 1개). 메신저·회의 전사·이메일·메모(c1~c4)를 취합해 월간 일정표를 만든다. 모두 가상 자료다.
// 정답 일정표는 ../answers/set-c.ts 에 따로 있다. 이 파일에는 정답이 드러나는 내용을 넣지 않는다.
import type { ScheduleQuestion } from "@/lib/literacy-types";

export const SET_C_QUESTION: ScheduleQuestion = {
  id: "c-1",
  prompt:
    "디지털안내개선TF의 2025년 11월 확정 일정을 일정표로 정리하세요. 제공된 메신저, 회의 전사, 이메일, 메모를 모두 확인하세요. 같은 일정의 내용이 서로 다르면 가장 나중에 확정된 내용을 따릅니다. 취소되었거나 아직 정해지지 않은 일정, 팀과 상관없는 개인 일정, 11월이 아닌 일정은 넣지 않습니다. 모든 시간은 한국 시간(KST)으로 적고, 날짜 순서로 정리하세요.",
  columns: [
    { key: "date", label: "날짜", format: "YYYY-MM-DD (예: 2025-11-05)" },
    { key: "time", label: "시작-종료(KST)", format: "24시간 HH:MM-HH:MM (예: 08:30-09:30)" },
    { key: "title", label: "제목", format: "일정 이름" },
    { key: "place", label: "장소/형식", format: "장소 이름 또는 화상" },
    { key: "attendees", label: "참석자/대상", format: "참석하는 사람이나 그룹" },
  ],
};
