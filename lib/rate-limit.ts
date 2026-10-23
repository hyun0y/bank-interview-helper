// Design Ref: §4 서버 API 설계 — AI를 부르는 API는 ① 요청 상한 확인부터 한다.
// Design Ref: §7 설계 결정 — 서버가 여러 개로 나뉘면 횟수가 정확히 세어지지 않으므로 "접속 주소별 대략적인 제한"으로 둔다.
//   (정확한 비용 보호는 OpenAI 계정의 월 사용 금액 한도가 맡는다.)
// Plan SC: AI를 부르는 요청만 세어 접속 주소별 1시간 100회, 한도를 넘으면 안내한다. 실패한 요청도 센다.
import "server-only";
import { normalizeClientAddress } from "@/lib/client-id";
import { LIMITS } from "@/lib/limits";

type RateLimitConfig = { max: number; windowMs: number };

function readPositiveInt(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * 기본값은 limits.ts의 값(1시간 100회)이다.
 * 점검할 때만 환경 변수 AI_RATE_LIMIT_MAX, AI_RATE_LIMIT_WINDOW_SECONDS로 바꿔 볼 수 있다.
 */
export function getRateLimitConfig(): RateLimitConfig {
  return {
    max: readPositiveInt("AI_RATE_LIMIT_MAX", LIMITS.AI_REQUESTS_PER_WINDOW),
    windowMs: readPositiveInt("AI_RATE_LIMIT_WINDOW_SECONDS", LIMITS.AI_WINDOW_SECONDS) * 1000,
  };
}

/** 기억해 둘 접속 주소의 최대 수. 넘으면 가장 오래 쓰지 않은 주소부터 잊는다. (메모리가 끝없이 늘지 않게) */
const MAX_TRACKED_CLIENTS = 10_000;

// 개발 서버가 코드를 다시 불러와도 기록이 사라지지 않게 globalThis에 둔다.
const globalForLimit = globalThis as unknown as { __aiRateLimitHits?: Map<string, number[]> };
const hits: Map<string, number[]> = (globalForLimit.__aiRateLimitHits ??= new Map());

/**
 * 접속 주소를 알아낸다. Vercel 같은 배포 환경은 x-forwarded-for 맨 앞 값이 실제 접속 주소다.
 * IPv6는 같은 /64 안의 주소를 한 사용자로 묶는다. (주소만 바꿔 상한을 피하지 못하게, CHECK.md 1번)
 */
export function getClientId(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return normalizeClientAddress(forwarded || request.headers.get("x-real-ip")?.trim() || "unknown");
}

export type RateLimitResult =
  | { allowed: true; limit: number; remaining: number }
  | { allowed: false; limit: number; retryAfterSeconds: number };

function sweep(now: number, windowMs: number) {
  for (const [key, times] of hits) {
    if (times.length === 0 || times[times.length - 1] <= now - windowMs) hits.delete(key);
  }
  // 그래도 많으면 가장 오래 쓰지 않은 주소부터 지운다. (Map은 넣은 순서를 기억한다)
  for (const key of hits.keys()) {
    if (hits.size <= MAX_TRACKED_CLIENTS) break;
    hits.delete(key);
  }
}

/**
 * 요청 1건을 센다. 허용되면 기록하고, 한도를 넘으면 기록하지 않고 언제 다시 가능한지 알려 준다.
 * AI 호출 "전에" 부르므로, 호출이 실패해도 이미 센 것으로 남는다. (비용 보호가 목적)
 */
export function consumeRateLimit(clientId: string, now: number = Date.now()): RateLimitResult {
  const { max, windowMs } = getRateLimitConfig();

  const times = hits.get(clientId) ?? [];
  while (times.length > 0 && times[0] <= now - windowMs) times.shift();

  if (times.length >= max) {
    hits.delete(clientId);
    hits.set(clientId, times);
    return { allowed: false, limit: max, retryAfterSeconds: Math.max(1, Math.ceil((times[0] + windowMs - now) / 1000)) };
  }

  times.push(now);
  hits.delete(clientId); // 다시 넣어 "가장 최근에 쓴 주소"로 맨 뒤에 둔다.
  hits.set(clientId, times);
  if (hits.size > MAX_TRACKED_CLIENTS) sweep(now, windowMs);
  return { allowed: true, limit: max, remaining: max - times.length };
}

/** 한 요청이 몇 번까지 추가로 셀 수 있는지의 상한. (이상한 값이 와도 기록이 끝없이 늘지 않게) */
const MAX_EXTRA_COST = 10;

/**
 * 이미 센 요청 1건에 더해, AI를 추가로 부른 만큼 더 센다. 한도를 넘어도 거절하지 않고 기록만 한다.
 * (이미 처리를 마친 요청이므로, 다음 요청부터 한도가 줄어든 것으로 적용된다)
 */
export function addRateLimitCost(clientId: string, extra: number, now: number = Date.now()): void {
  const count = Math.min(MAX_EXTRA_COST, Math.max(0, Math.floor(extra)));
  if (count === 0) return;
  const { windowMs } = getRateLimitConfig();
  const times = hits.get(clientId) ?? [];
  while (times.length > 0 && times[0] <= now - windowMs) times.shift();
  for (let i = 0; i < count; i++) times.push(now);
  hits.delete(clientId);
  hits.set(clientId, times);
  if (hits.size > MAX_TRACKED_CLIENTS) sweep(now, windowMs);
}

function describeWait(seconds: number): string {
  if (seconds < 60) return `${seconds}초`;
  return `${Math.ceil(seconds / 60)}분`;
}

/**
 * AI를 부르는 API의 맨 앞에서 부른다.
 * - 한도 안이면 null을 돌려준다. (계속 진행)
 * - 한도를 넘으면 429 응답을 돌려준다. 이 응답을 그대로 반환하면 된다.
 */
export function enforceRateLimit(request: Request): Response | null {
  const result = consumeRateLimit(getClientId(request));
  if (result.allowed) return null;

  return Response.json(
    {
      error: {
        code: "rate_limited",
        message: `AI 요청이 너무 많습니다. ${describeWait(result.retryAfterSeconds)} 뒤에 다시 시도해 주세요.`,
      },
      retryAfterSeconds: result.retryAfterSeconds,
      limit: result.limit,
    },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
}
