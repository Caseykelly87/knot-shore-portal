import { NextRequest, NextResponse } from "next/server";
import { getApiMode, getUpstreamBaseUrl } from "@/lib/api-mode";
import { loadDimStoresFixture } from "@/lib/fixture-loader";
import { getRequestLogger } from "@/lib/logger";
import {
  portalRequestsTotal,
  portalRequestDurationSeconds,
} from "@/lib/metrics";

export async function GET(req: NextRequest) {
  const incoming = req.headers.get("x-request-id");
  const requestId = incoming ?? crypto.randomUUID();
  const log = getRequestLogger(requestId);

  const mode = getApiMode();
  const start = Date.now();
  log.info(
    { event: "route_started", path: "/api/dim-stores", mode },
    "route started",
  );

  let response: NextResponse;
  if (mode === "offline") {
    response = NextResponse.json(loadDimStoresFixture());
  } else {
    const upstream = `${getUpstreamBaseUrl()}/dim-stores${req.nextUrl.search}`;
    const res = await fetch(upstream, {
      cache: "no-store",
      headers: { "x-request-id": requestId },
    });
    const data = await res.json();
    response = NextResponse.json(data, { status: res.status });
  }

  response.headers.set("x-request-id", requestId);
  const durationMs = Date.now() - start;
  portalRequestsTotal
    .labels({
      route: "/api/dim-stores",
      mode,
      status_code: String(response.status),
    })
    .inc();
  portalRequestDurationSeconds
    .labels({ route: "/api/dim-stores", mode })
    .observe(durationMs / 1000);
  log.info(
    {
      event: "route_completed",
      path: "/api/dim-stores",
      mode,
      status_code: response.status,
      duration_ms: durationMs,
    },
    "route completed",
  );
  return response;
}
