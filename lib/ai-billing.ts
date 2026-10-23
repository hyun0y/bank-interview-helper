// Design Ref: §4 요청 상한 — 요청 1건이 AI 모델을 여러 번 부르면 그만큼 상한에서 더 센다. (서버 전용, CHECK.md 1번)
// 요청이 들어올 때 enforceRateLimit이 1건을 먼저 세고, 처리가 끝난 뒤 "추가로 부른 횟수"를 여기서 더한다.
import "server-only";
import { countAiCalls } from "@/lib/ai";
import { addRateLimitCost, getClientId } from "@/lib/rate-limit";

/**
 * AI를 부르는 처리를 감싼다. 처리 중 모델을 n번 불렀다면 요청 1건(이미 센 것)에 더해 n-1건을 더 센다.
 * 실패한 처리도 부른 만큼 센다. (비용이 이미 나갔으므로)
 */
export function withCostAccounting<T>(request: Request, work: () => Promise<T>): Promise<T> {
  const clientId = getClientId(request);
  return countAiCalls(work, (calls) => addRateLimitCost(clientId, calls - 1));
}
