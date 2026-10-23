// Design Ref: §3.1 BEI 면접 [처리 1: 브라우저] — 연락처·주민번호·이메일 등을 AI로 보내기 전에 가린다. (PRD 7번)
// 이름·학교명처럼 형식이 정해지지 않은 정보는 자동으로 정확히 가리기 어렵다. 그래서
//   (1) 사용자가 직접 가리도록 안내하고, (2) 가릴 단어를 적으면 모두 바꿔 주는 도구(maskTerms)를 함께 준다.
// 순수한 글자 처리 함수만 있다. (브라우저·서버 어디서든 쓸 수 있고, 어디에도 저장하거나 보내지 않는다)

export type PersonalInfoKind = "resident-id" | "phone" | "email" | "birth-date" | "account";

export const PERSONAL_INFO_LABELS: Record<PersonalInfoKind, string> = {
  "resident-id": "주민등록번호",
  phone: "전화번호",
  email: "이메일",
  "birth-date": "생년월일",
  account: "계좌·카드번호",
};

/** 가린 자리에 대신 들어가는 글자 */
export const MASK_TOKENS: Record<PersonalInfoKind, string> = {
  "resident-id": "[주민번호]",
  phone: "[전화번호]",
  email: "[이메일]",
  "birth-date": "[생년월일]",
  account: "[계좌번호]",
};

/** 카드번호는 종류(account)는 계좌와 같이 세지만, 가린 자리에는 이 글자를 넣는다. */
const CARD_TOKEN = "[카드번호]";

/** 사용자가 직접 고른 단어(이름·학교명 등)를 가릴 때 대신 들어가는 글자 */
export const TERM_TOKEN = "[가림]";

export type PersonalInfoCounts = Record<PersonalInfoKind, number>;

// ── 전각(넓은) 글자 → 보통 글자 ──
// "０１０－１２３４" 처럼 전각 숫자·기호로 쓴 번호도 찾기 위해, 찾을 때만 쓰는 사본을 만든다.
// 글자 하나를 같은 길이의 글자 하나로만 바꾸므로(1:1), 사본에서 찾은 위치가 원문 위치와 정확히 같다.
// 그래서 실제로 가릴 때는 원문에서 그 위치만 바꾸고, 가리지 않은 부분은 원문 그대로 둔다.
// (NFKC 정규화는 ㈜·… 같은 글자까지 바꿔 버려서 쓰지 않는다)
const WIDE_CHARS = /[０-９‐-—−－＠．　]/g;

function toNarrowChar(ch: string): string {
  const code = ch.charCodeAt(0);
  if (code >= 0xff10 && code <= 0xff19) return String.fromCharCode(code - 0xfee0); // ０-９ → 0-9
  if (code === 0xff20) return "@"; // ＠
  if (code === 0xff0e) return "."; // ．
  if (code === 0x3000) return " "; // 전각 공백
  return "-"; // ‐ ‑ ‒ – — − － (여러 가지 대시) → 하이픈
}

function toNarrow(text: string): string {
  return text.replace(WIDE_CHARS, toNarrowChar);
}

/** 카드번호 검사(Luhn): 실제 카드번호는 이 계산을 통과한다. 아무 16자리 숫자는 대부분 통과하지 못한다. */
function passesLuhn(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let n = digits.charCodeAt(digits.length - 1 - i) - 48;
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return digits.length > 0 && sum % 10 === 0;
}

// 번호 사이 구분: "-" 또는 "." (앞뒤에 공백 한 칸씩 허용), 또는 공백 한 칸. 없어도 된다.
// 예: 010-1234-5678, 010 - 1234 - 5678, 02 . 123 . 4567, 010 1234 5678
const SEP = String.raw`(?:\s?[-.]\s?|\s)?`;
// 생년월일·계좌 키워드는 "[생년월일]"처럼 이미 가린 자리 안의 글자는 세지 않는다. (다시 검사해도 결과가 같도록)
// 키워드와 숫자 사이에는 숫자·줄바꿈이 아닌 글자 8자까지만 허용한다.
const BIRTH_KEYWORD = String.raw`(?<=(?<!\[)(?:생년월일|생일|출생|생년)[^0-9\n]{0,8})`;
const ACCOUNT_KEYWORD = String.raw`(?<=(?<!\[)(?:계좌번호|계좌|입금|송금)[^0-9\n]{0,8})`;
// 날짜의 월·일 (한 자리도 허용)
const MONTH = String.raw`(?:0?[1-9]|1[0-2])`;
const DAY = String.raw`(?:0?[1-9]|[12]\d|3[01])`;
// 이메일을 바꿔 쓴 표기: [at] (at) {at}, [dot] (dot) {dot} — 괄호로 감싼 것만 인정한다. (영어 문장의 at은 건드리지 않는다)
const AT_WORD = String.raw`\s?[[({]\s?at\s?[\])}]\s?`;
const DOT_WORD = String.raw`\s?[[({]\s?dot\s?[\])}]\s?`;

type Rule = {
  kind: PersonalInfoKind;
  pattern: RegExp;
  /** 가린 자리에 넣을 글자 (없으면 MASK_TOKENS[kind]) */
  token?: string;
  /** 찾은 글자를 정말 가릴지 한 번 더 확인 (예: 카드번호 Luhn 검사) */
  accept?: (found: string) => boolean;
};

// 가리는 규칙. 위에서부터 차례로 적용한다. (긴 숫자 안의 일부만 잘라 가리지 않도록 앞뒤에 숫자가 붙어 있으면 건너뛴다)
// 순서: 이메일 → 주민번호 → 생년월일 → 카드번호 → 전화 → 계좌 → 대표번호
//   - 주민번호를 먼저 가려야 생년월일·계좌로 잘못 세지 않는다.
//   - 카드번호(4-4-4-4)를 전화보다 먼저 가려야 일부가 전화번호로 잘려 가려지지 않는다.
//   - 계좌는 "입금 후 연락 010-…"처럼 키워드 뒤의 전화번호를 계좌로 세지 않도록 전화 다음에 둔다.
//   - 대표번호(1588-1234) 규칙은 넓게 잡히므로 계좌 다음에 둔다.
const RULES: Rule[] = [
  {
    // 맨 앞 (?<!…): 아이디 글자 덩어리의 맨 앞에서만 찾기 시작한다. 결과는 같고, 숫자·영문 1만 자 같은 긴 덩어리에서도 느려지지 않는다.
    // (전각 숫자를 보통 숫자로 바꿔 찾게 되면서 긴 전각 숫자 글에서도 이 규칙이 느려지지 않아야 해서 함께 고쳤다)
    kind: "email",
    pattern: /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
  },
  {
    // 바꿔 쓴 이메일: name [at] example.com, name(at)example(dot)com, name@example[dot]com
    // 보통 이메일은 위 규칙에서 이미 가렸으므로 여기서는 [at]·[dot] 표기가 있는 것만 남아 있다.
    // 앞쪽(아이디 부분)은 글자 덩어리의 맨 앞에서만 시작해, 긴 글에서도 느려지지 않게 한다.
    kind: "email",
    pattern: new RegExp(
      String.raw`(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+(?:@|${AT_WORD})[A-Za-z0-9-]+(?:(?:\.|${DOT_WORD})[A-Za-z0-9-]+)*(?:\.|${DOT_WORD})[A-Za-z]{2,}`,
      "gi",
    ),
    accept: (found) => /[[({]\s?(?:at|dot)\s?[\])}]/i.test(found),
  },
  {
    // 주민등록번호·외국인등록번호: 생년월일 6자리(월·일이 올바른 값) + 뒤 7자리(첫 숫자 1~8)
    // 가운데 하이픈 앞뒤 공백(900101 - 1234567)과 en dash(–, 하이픈으로 바꿔서 찾음)도 인정한다.
    kind: "resident-id",
    pattern: /(?<!\d)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])(?: ?- ?| )?[1-8]\d{6}(?!\d)/g,
  },
  {
    // 생년월일: 날짜 모양은 경험 날짜로도 흔히 쓰므로, 앞 8자 안에 "생년월일·생일·출생·생년"이 있을 때만 가린다.
    // 1999.01.01, 1999-01-01, 1999/1/1, 99.01.01, 1999년 1월 1일, 19990101, 990101
    kind: "birth-date",
    pattern: new RegExp(
      String.raw`(?<!\d)${BIRTH_KEYWORD}(?:(?:19|20)?\d{2}\s?[./-]\s?${MONTH}\s?[./-]\s?${DAY}|(?:19|20)?\d{2}\s?년\s?${MONTH}\s?월\s?${DAY}\s?일|(?:19|20)?\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01]))(?!\d)`,
      "g",
    ),
  },
  {
    // 카드번호: 4-4-4-4 (구분: 하이픈 또는 공백). Luhn 검사를 통과할 때만 가린다.
    kind: "account",
    token: CARD_TOKEN,
    pattern: /(?<!\d-?)\d{4}(?:(?: ?- ?| )\d{4}){3}(?!-?\d)/g,
    accept: passesLuhn,
  },
  {
    // 국제 표기: +82 10-1234-5678, +82 (0)2-123-4567, +82 10 - 1234 - 5678
    kind: "phone",
    pattern: new RegExp(
      String.raw`(?<![\d+])\+82${SEP}\(?0?\)?(?:10|1[16789]|2|[3-6][1-5]|70)(?:\)|${SEP})\d{3,4}${SEP}\d{4}(?!\d)`,
      "g",
    ),
  },
  {
    // 휴대폰·일반 전화: 010-1234-5678, 01012345678, 02-123-4567, (031) 123-4567, 070-…, 010 - 1234 - 5678
    kind: "phone",
    pattern: new RegExp(String.raw`(?<!\d)\(?0(?:10|1[16789]|2|[3-6][1-5]|70)\)?${SEP}\d{3,4}${SEP}\d{4}(?!\d)`, "g"),
  },
  {
    // 계좌번호: 앞 8자 안에 "계좌·계좌번호·입금·송금"이 있고, 숫자 10~14자리(하이픈 포함 가능)일 때만 가린다.
    // 쉼표가 이어지거나 뒤에 "원"이 붙으면 금액으로 보고 가리지 않는다.
    kind: "account",
    pattern: new RegExp(String.raw`(?<!\d-?)${ACCOUNT_KEYWORD}\d(?:-?\d){9,13}(?![-,]?\d)(?!\s?원)`, "g"),
  },
  {
    // 대표번호: 1588-1234 (구분 기호가 있을 때만)
    kind: "phone",
    pattern: /(?<!\d)1[5-8]\d{2}[-.\s]\d{4}(?!\d)/g,
  },
];

function emptyCounts(): PersonalInfoCounts {
  return { "resident-id": 0, phone: 0, email: 0, "birth-date": 0, account: 0 };
}

export type MaskResult = { text: string; counts: PersonalInfoCounts; total: number };

/** 연락처·주민번호·이메일·생년월일·계좌/카드번호를 찾아 가린 글과, 종류별로 몇 건 가렸는지를 돌려준다. */
export function maskPersonalInfo(text: string): MaskResult {
  const counts = emptyCounts();
  // original: 사용자에게 돌려줄 글(원문 + 가린 자리), search: 찾기용 사본(전각을 보통 글자로 바꾼 것)
  // 두 글은 길이가 항상 같고, 같은 위치를 같은 가림 글자로 바꾼다.
  let original = text;
  let search = toNarrow(text);
  for (const { kind, pattern, token, accept } of RULES) {
    const mask = token ?? MASK_TOKENS[kind];
    let nextOriginal = "";
    let nextSearch = "";
    let last = 0;
    for (const match of search.matchAll(pattern)) {
      if (accept && !accept(match[0])) continue;
      const start = match.index;
      nextOriginal += original.slice(last, start) + mask;
      nextSearch += search.slice(last, start) + mask;
      last = start + match[0].length;
      counts[kind] += 1;
    }
    if (last > 0) {
      original = nextOriginal + original.slice(last);
      search = nextSearch + search.slice(last);
    }
  }
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return { text: original, counts, total };
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
