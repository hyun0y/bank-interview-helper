// Design Ref: §4 서버 API 설계 `/api/literacy/set`·`/api/literacy/file` — 서버 폴더(content/)의 가상 자료를 읽는다. (서버 코드에서만 부른다)
// 이 파일은 정답 파일(content/literacy/answers)을 읽지 않는다. 브라우저로 나가는 값에 정답이 섞일 길 자체를 없애려는 것이다.
import { SET_A_FILES } from "@/content/literacy/files/set-a";
import { SET_C_FILES } from "@/content/literacy/files/set-c";
import { SET_A_QUESTIONS } from "@/content/literacy/questions/set-a";
import { SET_B_QUESTIONS } from "@/content/literacy/questions/set-b";
import { SET_C_QUESTION } from "@/content/literacy/questions/set-c";
import type { LiteracyFile, LiteracySet, PublicBundle, PublicFile, PublicQuestion } from "@/lib/literacy-types";
import { estimateTokens } from "@/lib/tokens";

/** 문제 하나당 배점 (PRD 5번: 객관식 5점, 주관식 10점, 서술형 25점 = 100점) */
const POINTS = { A: 10, B: 5, C: 25 } as const;

const ALL_FILES: LiteracyFile[] = [...SET_A_FILES, ...SET_C_FILES];

function toPublicFile(file: LiteracyFile): PublicFile {
  return { id: file.id, name: file.name, tokens: estimateTokens(file.content) };
}

/** 문제·파일 목록(파일별 토큰 수 포함). 정답과 파일 내용은 들어 있지 않다. */
export function buildPublicSet(): LiteracySet {
  const bundles: PublicBundle[] = [
    {
      id: "A",
      title: "묶음 A · 출장비 정산",
      description: "출장비 정산 규정과 사원별 정산서를 보고 짧게 답합니다. (주관식 6문제)",
      points: POINTS.A,
      files: SET_A_FILES.map(toPublicFile),
    },
    {
      id: "B",
      title: "묶음 B · 생성형 AI 개념",
      description: "문장이 맞으면 O, 틀리면 X를 고릅니다. (객관식 3문제, 파일 없음)",
      points: POINTS.B,
      files: [],
    },
    {
      id: "C",
      title: "묶음 C · 일정표 작성",
      description: "메신저·회의 전사·이메일·메모를 모아 월간 일정표를 만듭니다. (서술형 1문제)",
      points: POINTS.C,
      files: SET_C_FILES.map(toPublicFile),
    },
  ];

  const questions: PublicQuestion[] = [];
  for (const q of SET_A_QUESTIONS) {
    questions.push({ number: questions.length + 1, bundle: "A", id: q.id, kind: "short", points: POINTS.A, prompt: q.prompt, format: q.format });
  }
  for (const q of SET_B_QUESTIONS) {
    questions.push({ number: questions.length + 1, bundle: "B", id: q.id, kind: "ox", points: POINTS.B, prompt: q.statement });
  }
  questions.push({
    number: questions.length + 1,
    bundle: "C",
    id: SET_C_QUESTION.id,
    kind: "schedule",
    points: POINTS.C,
    prompt: SET_C_QUESTION.prompt,
    columns: SET_C_QUESTION.columns,
  });
  return { bundles, questions };
}

/** 파일 번호로 파일을 찾는다. 없으면 undefined */
export function findLiteracyFile(id: string): LiteracyFile | undefined {
  return ALL_FILES.find((file) => file.id === id);
}

/** 어느 묶음의 파일인가. 파일이 없으면 undefined */
export function bundleOfFile(id: string): "A" | "C" | undefined {
  if (SET_A_FILES.some((file) => file.id === id)) return "A";
  if (SET_C_FILES.some((file) => file.id === id)) return "C";
  return undefined;
}
