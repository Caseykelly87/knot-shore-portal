import { NextRequest, NextResponse } from "next/server";
import { getApiMode, getUpstreamBaseUrl } from "@/lib/api-mode";
import { loadAnomaliesFixture } from "@/lib/fixture-loader";
import { getRequestLogger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const incoming = req.headers.get("x-request-id");
  const requestId = incoming ?? crypto.randomUUID();
  const log = getRequestLogger(requestId);

  const mode = getApiMode();
  const start = Date.now();
  log.info(
    { event: "route_started", path: "/api/anomalies", mode },
    "route started",
  );

  let response: NextResponse;
  if (mode === "offline") {
    response = NextResponse.json(loadAnomaliesFixture());
  } else {
    const upstream = `${getUpstreamBaseUrl()}/anomalies${req.nextUrl.search}`;
    const res = await fetch(upstream, {
      cache: "no-store",
      headers: { "x-request-id": requestId },
    });
    const data = await res.json();
    response = NextResponse.json(data, { status: res.status });
  }

  response.headers.set("x-request-id", requestId);
  log.info(
    {
      event: "route_completed",
      path: "/api/anomalies",
      mode,
      status_code: response.status,
      duration_ms: Date.now() - start,
    },
    "route completed",
  );
  return response;
}
