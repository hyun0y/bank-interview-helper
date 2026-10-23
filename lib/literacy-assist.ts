// Design Ref: §3.2 AI 리터러시 / §4 `/api/literacy/assist` — AI 어시스트가 답하는 규칙과 호출. (서버 전용)
// PRD 5번 규칙:
//  - 어시스트는 사용자가 "열어 본 파일"만 참고한다. (열지 않은 파일은 볼 수 없다)
//  - 묶음 A·C는 그 파일에 있는 내용만 근거로 답하고, 없으면 "파일에 없음"이라고 말한다.
//  - 파일이 없는 묶음 B는 일반 지식으로 답할 수 있다.
// 이 코드는 정답 파일(content/literacy/answers)을 읽지 않는다. 어시스트가 정답을 알 길이 없게 한 것이다.
import "server-only";
import { callAi, type Material } from "@/lib/ai";
import { bundleOfFile, findLiteracyFile } from "@/lib/literacy-content";
import type { BundleId } from "@/lib/literacy-types";

/** 한 번에 이어서 보내는 이전 대화의 최대 개수(질문·답변 합쳐서). 오래된 것은 버린다. */
export const ASSIST_HISTORY_MAX_MESSAGES = 6;
/** 이전 대화 한 개의 최대 글자 수. 이보다 길면 잘라서 보낸다. */
export const ASSIST_HISTORY_MAX_CHARS = 1500;
/** 한 번에 열어 둘 수 있는 파일 수의 상한 (가장 많은 묶음의 파일 수보다 넉넉하게) */
export const ASSIST_MAX_FILES = 10;

const COMMON_RULES = [
  "너는 모의 시험에서 응시자를 돕는 AI 어시스트다. 한국어로 쉽고 간결하게 답한다.",
  "질문한 것에만 답한다. 묻지 않은 항목까지 계산하거나 설명하지 않는다.",
  "답변은 12줄 이내로 쓰고, 계산이 필요하면 식을 단계별로 보여 준다. 한도나 조건이 있으면 계산 전에 규정을 다시 확인한다.",
  "숫자를 구하는 질문은 근거와 계산 과정을 먼저 쓰고, 결론(최종 숫자)은 마지막 줄에 한 번만 쓴다. 결론을 먼저 말하지 않는다.",
  "AI도 틀릴 수 있으므로 중요한 숫자와 날짜는 근거가 된 부분을 함께 알려 응시자가 직접 확인할 수 있게 한다.",
].join("\n");

function rulesFor(bundle: BundleId, hasOpenedFiles: boolean): string {
  if (bundle === "B") {
    return `${COMMON_RULES}\n이 묶음에는 파일이 없다. 생성형 AI에 관한 일반 지식으로 답해도 된다. 확실하지 않은 내용은 확실하지 않다고 말한다.`;
  }
  const fileRule = hasOpenedFiles
    ? "<자료> 태그 안의 파일 내용만 근거로 답한다. 파일에 없는 내용은 추측하거나 일반 지식으로 채우지 말고 \"파일에 없음\"이라고 답한다."
    : "응시자가 아직 열어 본 파일이 없어서 참고할 파일이 없다. 파일에 관한 질문에는 \"아직 열어 본 파일이 없습니다. 파일 목록에서 필요한 파일을 열어 주세요\"라고 안내한다. 파일 내용을 지어내지 않는다.";
  return [
    COMMON_RULES,
    fileRule,
    "응시자가 열지 않은 파일은 볼 수 없다. 열지 않은 파일의 내용을 안다고 말하거나 짐작해서 답하지 않는다.",
    "파일에서 찾은 내용은 어느 파일에서 찾았는지 파일 이름을 함께 말한다. <자료> 태그나 이름=\"...\" 같은 표기는 그대로 쓰지 말고 파일 이름만 말한다.",
    "질문에 필요한 내용이 열어 본 파일에 없으면 \"파일에 없음\"이라고 답하고, 응시자가 아직 열지 않은 다른 파일에 있을 수 있다는 점만 알려 준다. 그 파일의 내용을 짐작하지 않는다.",
  ].join("\n");
}

export type AssistTurn = { role: "user" | "assistant"; content: string };

export type ResolvedFiles = { ok: true; materials: Material[]; names: string[] } | { ok: false; message: string };

/** 열어 본 파일 번호를 검사하고 파일 내용을 서버 폴더에서 읽는다. 없는 번호이거나 다른 묶음의 파일이면 거부한다. */
export function resolveOpenedFiles(bundle: BundleId, fileIds: string[]): ResolvedFiles {
  const unique = [...new Set(fileIds)];
  if (bundle === "B") {
    return unique.length === 0 ? { ok: true, materials: [], names: [] } : { ok: false, message: "이 묶음에는 파일이 없습니다." };
  }
  const materials: Material[] = [];
  const names: string[] = [];
  for (const id of unique) {
    const file = findLiteracyFile(id);
    if (!file || bundleOfFile(id) !== bundle) return { ok: false, message: "열 수 없는 파일 번호가 들어 있습니다." };
    materials.push({ label: file.name, text: file.content });
    names.push(file.name);
  }
  return { ok: true, materials, names };
}

/** 이전 대화를 최근 것만, 길면 잘라서 보낸다. */
export function trimHistory(history: AssistTurn[]): AssistTurn[] {
  return history.slice(-ASSIST_HISTORY_MAX_MESSAGES).map((turn) => ({ role: turn.role, content: turn.content.slice(0, ASSIST_HISTORY_MAX_CHARS) }));
}

/** 질문 하나에 답한다. 실패하면 AiError를 던진다. (화면은 이때 질문 횟수·토큰을 차감하지 않는다) */
export async function answerAssistQuestion(input: {
  bundle: BundleId;
  question: string;
  materials: Material[];
  history: AssistTurn[];
}): Promise<string> {
  return callAi({
    instructions: rulesFor(input.bundle, input.materials.length > 0),
    materials: input.materials,
    history: trimHistory(input.history),
    userMessage: input.question,
    maxOutputTokens: 3000,
    tier: "fast",
  });
}
