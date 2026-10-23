// Design Ref: §4 요청 상한 — 같은 사람이 접속 주소(IP)만 바꿔 상한을 피하지 못하게, 주소를 "묶음 단위"로 정리한다. (CHECK.md 1번)
// IPv6는 한 사람이 같은 /64 안에서 주소를 수없이 만들 수 있으므로 앞 4칸(/64)만 같은 사용자로 센다.
// 서버 전용이 아닌 순수 계산이라 점검하기 쉽다.

const MAX_KEY_CHARS = 64;

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function isIpv4(text: string): boolean {
  const match = IPV4.exec(text);
  return match !== null && match.slice(1).every((part) => Number(part) <= 255);
}

/** IPv6 글자를 8칸(각 0~65535)으로 펼친다. 올바르지 않으면 null */
function expandIpv6(text: string): number[] | null {
  let source = text;
  // 끝이 IPv4 모양이면(::ffff:1.2.3.4) 16진수 두 칸으로 바꾼다.
  const lastColon = source.lastIndexOf(":");
  const tail = source.slice(lastColon + 1);
  if (tail.includes(".")) {
    if (!isIpv4(tail)) return null;
    const [a, b, c, d] = tail.split(".").map(Number);
    source = `${source.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const doubleParts = source.split("::");
  if (doubleParts.length > 2) return null;
  const toGroups = (part: string) => (part === "" ? [] : part.split(":"));
  const head = toGroups(doubleParts[0]);
  const rest = doubleParts.length === 2 ? toGroups(doubleParts[1]) : [];
  const missing = 8 - head.length - rest.length;
  if (doubleParts.length === 2 ? missing < 1 : missing !== 0) return null;
  const groups = [...head, ...Array<string>(doubleParts.length === 2 ? missing : 0).fill("0"), ...rest];
  if (groups.length !== 8) return null;
  const numbers = groups.map((group) => (/^[0-9a-f]{1,4}$/i.test(group) ? parseInt(group, 16) : NaN));
  return numbers.some(Number.isNaN) ? null : numbers;
}

/**
 * 접속 주소를 요청 상한을 세는 열쇠로 바꾼다.
 *  - IPv4: 그대로 (포트가 붙어 있으면 뗀다)
 *  - IPv4가 들어 있는 IPv6(::ffff:1.2.3.4): IPv4로 본다
 *  - IPv6: 앞 4칸(/64)이 같으면 같은 열쇠 (예: "2001:db8:1:2::/64")
 *  - 모양을 알 수 없는 값: 소문자로 바꾸고 64자까지만 쓴다 (메모리가 끝없이 늘지 않게)
 */
export function normalizeClientAddress(raw: string): string {
  let text = raw.trim().toLowerCase();
  if (text === "") return "unknown";

  const bracket = /^\[([^\]]+)\](?::\d+)?$/.exec(text);
  if (bracket) text = bracket[1];
  text = text.replace(/%.*$/, ""); // 인터페이스 이름(zone id) 제거

  const withPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(text);
  if (withPort) text = withPort[1];

  if (isIpv4(text)) return text;

  if (text.includes(":")) {
    const groups = expandIpv6(text);
    if (groups) {
      // ::ffff:a.b.c.d (IPv4-mapped)는 IPv4 사용자로 본다.
      if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) {
        return `${groups[6] >> 8}.${groups[6] & 255}.${groups[7] >> 8}.${groups[7] & 255}`;
      }
      return `${groups.slice(0, 4).map((g) => g.toString(16)).join(":")}::/64`;
    }
  }
  return text.slice(0, MAX_KEY_CHARS);
}
