// Design Ref: §4 서버 API 설계 `/api/literacy/set` — 문제·파일 목록(파일별 토큰 수)을 돌려준다. 세트는 1개뿐이고 정답은 넣지 않는다.
// AI를 부르지 않으므로 요청 상한은 걸지 않는다.
import { buildPublicSet } from "@/lib/literacy-content";

export async function POST() {
  return Response.json(buildPublicSet());
}
