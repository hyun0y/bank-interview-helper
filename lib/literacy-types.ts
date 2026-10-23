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

/** 묶음 A·C의 파일 한 개 (가상 자료). 서버 폴더에만 있고, 열어 본 것만 브라우저로 내려간다. */
export type LiteracyFile = {
  /** 파일 번호표 (예: "a1") */
  id: string;
  /** 파일 목록에 보이는 이름 */
  name: string;
  /** 파일 내용 (글) */
  content: string;
};

/** 묶음 A 문제 — 단답형 주관식. 정답이 없어서 브라우저로 내려보내도 되는 부분 */
export type ShortQuestion = {
  id: string;
  /** 문제 지문 */
  prompt: string;
  /** 답을 어떤 모양으로 쓰는지 안내 (예: 숫자만, 쉼표 없이) */
  format: string;
};

/** 묶음 A 정답·해설 — 서버에서만 읽는다. */
export type ShortAnswer = {
  id: string;
  /** 정답. 띄어쓰기를 뺀 뒤 똑같은지 비교한다. */
  answer: string;
  /** 정답으로 함께 인정하는 다른 표기 (선택) */
  accepted?: string[];
  /** 계산 과정을 쉬운 말로 풀어 쓴 해설 */
  explanation: string;
};

/** 묶음 C 표의 한 칸(열) 설명 */
export type ScheduleColumn = {
  key: "date" | "time" | "title" | "place" | "attendees";
  label: string;
  /** 칸에 어떤 모양으로 쓰는지 안내 */
  format: string;
};

/** 묶음 C 문제 — 서술형(일정표 작성). 정답이 없어서 브라우저로 내려보내도 되는 부분 */
export type ScheduleQuestion = {
  id: string;
  prompt: string;
  columns: ScheduleColumn[];
};

/** 묶음 C 정답 일정표의 한 줄 */
export type ScheduleAnswerRow = {
  /** YYYY-MM-DD */
  date: string;
  /** 24시간 "HH:MM-HH:MM" (한국 시간) */
  time: string;
  /** 정답 제목과, 함께 인정하는 다른 표현들 (띄어쓰기·기호는 비교할 때 무시) */
  titles: string[];
  /** 장소/형식. 칸이 채워졌는지만 보고 점수에는 넣지 않는다. */
  place: string;
  /** 참석자/대상. 칸이 채워졌는지만 보고 점수에는 넣지 않는다. */
  attendees: string;
  /** 이 줄이 이렇게 정해진 이유 (해설) */
  reason: string;
};

/** 묶음 C 정답·해설 — 서버에서만 읽는다. */
export type ScheduleAnswer = {
  id: string;
  rows: ScheduleAnswerRow[];
  /** 일정표에 넣지 않는 항목과 그 이유 (해설) */
  excluded: string[];
};

// ---- 브라우저로 내려가는 "문제 세트" 모양 (정답은 절대 넣지 않는다) ----

export type BundleId = "A" | "B" | "C";

/** 파일 목록에 보이는 정보. 내용은 처음 열 때 따로 받는다. */
export type PublicFile = { id: string; name: string; tokens: number };

export type PublicBundle = {
  id: BundleId;
  title: string;
  description: string;
  /** 문제 하나당 배점 */
  points: number;
  files: PublicFile[];
};

export type PublicQuestion = {
  /** 시험 전체에서의 번호 (1~10) */
  number: number;
  bundle: BundleId;
  id: string;
  kind: "short" | "ox" | "schedule";
  points: number;
  prompt: string;
  /** 단답형: 답을 쓰는 모양 안내 */
  format?: string;
  /** 서술형: 표의 칸 설명 */
  columns?: ScheduleColumn[];
};

export type LiteracySet = {
  bundles: PublicBundle[];
  questions: PublicQuestion[];
};
