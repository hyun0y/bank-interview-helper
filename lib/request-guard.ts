// Design Ref: §8 보안 — 다른 사이트가 방문자 브라우저를 이용해 이 앱의 AI 주소를 대신 부르는 것을 막는다. (CHECK.md 2번)
// 브라우저가 다른 사이트에서 보내는 요청은 항상 Origin(어느 사이트에서 왔는지)과 Sec-Fetch-Site 머리말을 달고 있다.
// 응답을 읽지 못하더라도 비용은 나가므로, AI를 부르기 "전에" 같은 사이트의 요청인지 확인한다.
// 브라우저가 아닌 도구(curl 등)는 머리말이 없을 수 있어 통과시킨다. 그쪽은 요청 수 상한과 OpenAI 월 한도가 막는다.
// 순수 계산이라 점검하기 쉽다. (서버 전용 기능을 쓰지 않는다)

type OriginHeaders = {
  origin: string | null;
  secFetchSite: string | null;
  host: string | null;
  forwardedHost: string | null;
};

/** 이 요청이 같은 사이트(이 앱의 화면)에서 온 것으로 볼 수 있는가 */
export function isSameSiteRequest({ origin, secFetchSite, host, forwardedHost }: OriginHeaders): boolean {
  // 브라우저가 "다른 사이트/같은 사이트의 다른 주소에서 왔다"고 직접 알려 주면 거절한다.
  const site = secFetchSite?.trim().toLowerCase();
  if (site && site !== "same-origin" && site !== "none") return false;

  if (origin !== null) {
    const myHost = (forwardedHost?.split(",")[0] ?? host ?? "").trim().toLowerCase();
    let originHost: string;
    try {
      originHost = new URL(origin).host.toLowerCase();
    } catch {
      return false; // "null"(샌드박스 안의 화면) 등 알 수 없는 값
    }
    if (myHost === "" || originHost !== myHost) return false;
  }
  return true;
}

/** 같은 사이트가 아니면 403 응답을, 맞으면 null을 돌려준다. AI를 부르는 API의 맨 앞에서 부른다. */
export function enforceSameSite(request: Request): Response | null {
  const ok = isSameSiteRequest({
    origin: request.headers.get("origin"),
    secFetchSite: request.headers.get("sec-fetch-site"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
  });
  if (ok) return null;
  return Response.json({ error: { code: "forbidden_origin", message: "허용되지 않은 요청입니다. 이 앱의 화면에서 보내 주세요." }, charged: false }, { status: 403 });
}

/** 본문이 JSON이라고 밝힌 요청인가. (application/json 또는 application/json; charset=utf-8) */
export function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const mediaType = contentType.split(";")[0].trim().toLowerCase();
  return mediaType === "application/json";
}
