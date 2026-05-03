import { NextRequest, NextResponse } from "next/server";
import { getApiMode, getUpstreamBaseUrl } from "@/lib/api-mode";
import { loadDashboardSummaryFixture } from "@/lib/fixture-loader";
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
    { event: "route_started", path: "/api/dashboard-summary", mode },
    "route started",
  );

  let response: NextResponse;
  if (mode === "offline") {
    response = NextResponse.json(loadDashboardSummaryFixture());
  } else {
    const upstream = `${getUpstreamBaseUrl()}/dashboard-summary${req.nextUrl.search}`;
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
      route: "/api/dashboard-summary",
      mode,
      status_code: String(response.status),
    })
    .inc();
  portalRequestDurationSeconds
    .labels({ route: "/api/dashboard-summary", mode })
    .observe(durationMs / 1000);
  log.info(
    {
      event: "route_completed",
      path: "/api/dashboard-summary",
      mode,
      status_code: response.status,
      duration_ms: durationMs,
    },
    "route completed",
  );
  return response;
}
