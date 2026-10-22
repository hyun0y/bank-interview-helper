// Design Ref: §3.4 브라우저에 저장하는 것 `bei-results` — BEI 결과(질문·답변)를 최대 5개까지 이 브라우저에 저장한다. (작업 11번)
// PRD 7번: 자기소개서 원문은 저장하지 않는다. 질문·꼬리 질문·모범 답변·평가 기준 같은 "분석 결과"만 저장하고,
//   답변의 근거로 보여 주던 원문 문장(evidence)은 저장하지 않는다. (경험 원문 구간도 저장하지 않는다)
// 순수한 자료 처리 함수만 있다. (저장·불러오기는 lib/storage.ts가 한다)
import type { BeiAnswer, BeiQuestion, ExperienceCandidate } from "@/lib/bei-types";
import { LIMITS } from "@/lib/limits";

export type SavedExperience = {
  id: string;
  title: string;
  summary: string;
  questions: BeiQuestion[];
};

export type SavedBeiResult = {
  id: string;
  /** 저장한 시각(ISO) */
  savedAt: string;
  title: string;
  experiences: SavedExperience[];
};

/** 답변에서 원문 문장을 뺀다. 확인 결과(근거 확인됨/안 됨)와 문장 개수만 남긴다. */
function stripOriginalText(answer: BeiAnswer): BeiAnswer {
  return { ...answer, evidence: [], evidenceOmitted: true, evidenceCount: answer.evidenceCount ?? answer.evidence.length };
}

export type DoneExperience = { candidate: ExperienceCandidate; questions: BeiQuestion[] };

function two(value: number): string {
  return String(value).padStart(2, "0");
}

/** 저장 목록에서 알아보기 쉬운 이름: "10월 22일 15:30 · 첫 경험 제목 외 2개" */
export function makeSavedTitle(savedAt: Date, experienceTitles: string[]): string {
  const when = `${savedAt.getMonth() + 1}월 ${savedAt.getDate()}일 ${two(savedAt.getHours())}:${two(savedAt.getMinutes())}`;
  const first = experienceTitles[0] ?? "BEI 결과";
  const rest = experienceTitles.length - 1;
  return rest > 0 ? `${when} · ${first} 외 ${rest}개` : `${when} · ${first}`;
}

/** 화면에 있는 결과를 저장용 모양으로 바꾼다. 만들어진 경험이 하나도 없으면 null */
export function buildSavedResult(done: DoneExperience[], now: Date = new Date(), id: string = `r${now.getTime()}`): SavedBeiResult | null {
  if (done.length === 0) return null;
  return {
    id,
    savedAt: now.toISOString(),
    title: makeSavedTitle(
      now,
      done.map((item) => item.candidate.title),
    ),
    experiences: done.map((item) => ({
      id: item.candidate.id,
      title: item.candidate.title,
      summary: item.candidate.summary,
      questions: item.questions.map((question) => ({ ...question, answer: stripOriginalText(question.answer) })),
    })),
  };
}

/** 새 결과를 맨 앞에 넣고, 최대 개수를 넘으면 가장 오래된 것부터 버린다. */
export function addSavedResult(list: SavedBeiResult[], added: SavedBeiResult): SavedBeiResult[] {
  return [added, ...list.filter((item) => item.id !== added.id)].slice(0, LIMITS.BEI_MAX_SAVED_RESULTS);
}

// ---------------------------------------------------------------------------
// 브라우저에서 불러온 값이 약속한 모양인지 확인한다. (저장 값은 사용자가 직접 고칠 수 있으므로, 화면을 그리기 전에 확인한다)
// ---------------------------------------------------------------------------
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFollowUp(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.question === "string" &&
    typeof value.answerDirection === "string" &&
    typeof value.missingInfo === "boolean"
  );
}

function isAnswer(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.text === "string" &&
    typeof value.length === "number" &&
    typeof value.lengthOk === "boolean" &&
    Array.isArray(value.criteria) &&
    value.criteria.every((item) => isRecord(item) && typeof item.id === "string" && typeof item.reason === "string") &&
    Array.isArray(value.evidence) &&
    (value.evidenceStatus === "verified" || value.evidenceStatus === "unverified") &&
    typeof value.needsSupplement === "boolean"
  );
}

function isQuestion(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.question === "string" &&
    isAnswer(value.answer) &&
    Array.isArray(value.followUps) &&
    value.followUps.every(isFollowUp)
  );
}

function isExperience(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.summary === "string" &&
    Array.isArray(value.questions) &&
    value.questions.every(isQuestion)
  );
}

/** 저장 값 전체가 SavedBeiResult[]인지 확인한다. 하나라도 어긋나면 false (화면은 "저장된 결과 없음"으로 처리한다) */
export function isSavedBeiResults(value: unknown): value is SavedBeiResult[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        typeof item.savedAt === "string" &&
        typeof item.title === "string" &&
        Array.isArray(item.experiences) &&
        item.experiences.every(isExperience),
    )
  );
}
