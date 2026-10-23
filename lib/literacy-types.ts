// Design Ref: §3 AI 리터러시 문제 세트 — 문제(브라우저에 내려가도 되는 부분)와 정답·해설(서버에만 두는 부분)을 따로 정의한다. (작업 12번)

/** 객관식(O/X)에서 고를 수 있는 답 */
export type OxChoice = "O" | "X";

/** 묶음 B 문제 — 정답이 없어서 브라우저로 내려보내도 되는 부분 */
export type OxQuestion = {
  /** 문제 번호표. 정답과 이어 주는 열쇠 (예: "b1") */
  id: string;
  /** 지문. O인지 X인지 판단할 문장 */
  statement: string;
};

/** 묶음 B 정답·해설 — 서버에서만 읽고, 제출 뒤 채점 결과로만 보여 준다. */
export type OxAnswer = {
  id: string;
  answer: OxChoice;
  /** 왜 그 답인지 쉬운 말로 풀어 쓴 해설 */
  explanation: string;
};
