import { NextRequest, NextResponse } from "next/server";
import { getApiMode, getUpstreamBaseUrl } from "@/lib/api-mode";
import { loadAnomaliesFixture } from "@/lib/fixture-loader";
import { getRequestLogger } from "@/lib/logger";
import {
  portalRequestsTotal,
  portalRequestDurationSeconds,
  portalUpstreamUnreachableTotal,
} from "@/lib/metrics";

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
    try {
      const res = await fetch(upstream, {
        cache: "no-store",
        headers: { "x-request-id": requestId },
      });
      const data = await res.json();
      response = NextResponse.json(data, { status: res.status });
    } catch (err) {
      log.error(
        {
          event: "upstream_unreachable",
          path: "/api/anomalies",
          error: err instanceof Error ? err.message : String(err),
        },
        "upstream unreachable",
      );
      portalUpstreamUnreachableTotal.inc();
      response = NextResponse.json(loadAnomaliesFixture());
      response.headers.set("X-Data-Source", "fallback");
    }
  }

  response.headers.set("x-request-id", requestId);
  const durationMs = Date.now() - start;
  portalRequestsTotal
    .labels({
      route: "/api/anomalies",
      mode,
      status_code: String(response.status),
    })
    .inc();
  portalRequestDurationSeconds
    .labels({ route: "/api/anomalies", mode })
    .observe(durationMs / 1000);
  log.info(
    {
      event: "route_completed",
      path: "/api/anomalies",
      mode,
      status_code: response.status,
      duration_ms: durationMs,
    },
    "route completed",
  );
  return response;
}
