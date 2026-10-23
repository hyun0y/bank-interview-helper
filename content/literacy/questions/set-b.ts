// 묶음 B 문제 (객관식 O/X 3개, 파일 없음). 생성형 AI 개념을 묻는 가상 연습 문제이며 실제 시험 문제를 옮기지 않았다.
// 정답은 ../answers/set-b.ts 에 따로 있다. 이 파일에는 정답이 드러나는 내용을 넣지 않는다.
import type { OxQuestion } from "@/lib/literacy-types";

export const SET_B_QUESTIONS: OxQuestion[] = [
  {
    id: "b1",
    statement:
      "생성형 AI에서 '온도(temperature)' 설정 값을 높이면, 같은 질문을 여러 번 해도 매번 조금씩 다른 표현의 답이 나올 가능성이 커진다.",
  },
  {
    id: "b2",
    statement:
      "생성형 AI가 자신 있고 자연스러운 말투로 답했다면, 그 내용은 사실로 확인된 것이므로 따로 출처를 확인하지 않고 업무 보고서에 그대로 써도 된다.",
  },
  {
    id: "b3",
    statement:
      "생성형 AI가 글을 처리하는 단위인 '토큰'은 언제나 글자 한 개와 같으므로, 글자 수만 세면 실제 사용한 토큰 수를 정확히 알 수 있다.",
  },
];
