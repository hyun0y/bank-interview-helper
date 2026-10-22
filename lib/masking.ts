// Design Ref: §3.1 BEI 면접 [처리 1: 브라우저] — 연락처·주민번호·이메일을 AI로 보내기 전에 가린다. (PRD 7번)
// 이름·학교명처럼 형식이 정해지지 않은 정보는 자동으로 정확히 가리기 어렵다. 그래서
//   (1) 사용자가 직접 가리도록 안내하고, (2) 가릴 단어를 적으면 모두 바꿔 주는 도구(maskTerms)를 함께 준다.
// 순수한 글자 처리 함수만 있다. (브라우저·서버 어디서든 쓸 수 있고, 어디에도 저장하거나 보내지 않는다)

export type PersonalInfoKind = "resident-id" | "phone" | "email";

export const PERSONAL_INFO_LABELS: Record<PersonalInfoKind, string> = {
  "resident-id": "주민등록번호",
  phone: "전화번호",
  email: "이메일",
};

/** 가린 자리에 대신 들어가는 글자 */
export const MASK_TOKENS: Record<PersonalInfoKind, string> = {
  "resident-id": "[주민번호]",
  phone: "[전화번호]",
  email: "[이메일]",
};

/** 사용자가 직접 고른 단어(이름·학교명 등)를 가릴 때 대신 들어가는 글자 */
export const TERM_TOKEN = "[가림]";

export type PersonalInfoCounts = Record<PersonalInfoKind, number>;

// 가리는 규칙. 위에서부터 차례로 적용한다. (긴 숫자 안의 일부만 잘라 가리지 않도록 앞뒤에 숫자가 붙어 있으면 건너뛴다)
const RULES: { kind: PersonalInfoKind; pattern: RegExp }[] = [
  {
    kind: "email",
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
  },
  {
    // 주민등록번호·외국인등록번호: 생년월일 6자리(월·일이 올바른 값) + 뒤 7자리(첫 숫자 1~8)
    kind: "resident-id",
    pattern: /(?<!\d)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[ -]?[1-8]\d{6}(?!\d)/g,
  },
  {
    // 국제 표기: +82 10-1234-5678, +82 (0)2-123-4567
    kind: "phone",
    pattern: /(?<![\d+])\+82[-.\s]?\(?0?\)?(?:10|1[16789]|2|[3-6][1-5]|70)[-.\s)]?\d{3,4}[-.\s]?\d{4}(?!\d)/g,
  },
  {
    // 휴대폰·일반 전화: 010-1234-5678, 01012345678, 02-123-4567, (031) 123-4567, 070-…
    kind: "phone",
    pattern: /(?<!\d)\(?0(?:10|1[16789]|2|[3-6][1-5]|70)\)?[-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)/g,
  },
  {
    // 대표번호: 1588-1234 (구분 기호가 있을 때만)
    kind: "phone",
    pattern: /(?<!\d)1[5-8]\d{2}[-.\s]\d{4}(?!\d)/g,
  },
];

function emptyCounts(): PersonalInfoCounts {
  return { "resident-id": 0, phone: 0, email: 0 };
}

export type MaskResult = { text: string; counts: PersonalInfoCounts; total: number };

/** 연락처·주민번호·이메일을 찾아 가린 글과, 종류별로 몇 건 가렸는지를 돌려준다. */
export function maskPersonalInfo(text: string): MaskResult {
  const counts = emptyCounts();
  let result = text;
  for (const { kind, pattern } of RULES) {
    result = result.replace(pattern, () => {
      counts[kind] += 1;
      return MASK_TOKENS[kind];
    });
  }
  return { text: result, counts, total: counts["resident-id"] + counts.phone + counts.email };
}

/** 아직 가려지지 않은 개인정보가 몇 건 남아 있는지만 센다. (글은 바꾸지 않는다) */
export function countPersonalInfo(text: string): PersonalInfoCounts {
  return maskPersonalInfo(text).counts;
}

export type TermMaskResult = { text: string; replaced: number };

/**
 * 사용자가 적은 단어(이름·학교명 등)를 글 전체에서 찾아 [가림]으로 바꾼다.
 * 정규식이 아니라 글자 그대로 찾으며, 한 글자짜리 단어는 오작동이 크므로 무시한다.
 */
export function maskTerms(text: string, terms: string[]): TermMaskResult {
  const cleaned = [...new Set(terms.map((term) => term.trim()).filter((term) => term.length >= 2))];
  // 긴 단어부터 바꿔야 "서울대학교"와 "서울대"가 함께 있을 때 일부만 남지 않는다.
  cleaned.sort((a, b) => b.length - a.length);

  let replaced = 0;
  let result = text;
  for (const term of cleaned) {
    const parts = result.split(term);
    if (parts.length > 1) {
      replaced += parts.length - 1;
      result = parts.join(TERM_TOKEN);
    }
  }
  return { text: result, replaced };
}
