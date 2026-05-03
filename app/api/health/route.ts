import { NextRequest, NextResponse } from "next/server";
import { getApiMode, getUpstreamBaseUrl } from "@/lib/api-mode";
import { loadHealthFixture } from "@/lib/fixture-loader";
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
  log.info({ event: "route_started", path: "/api/health", mode }, "route started");

  let response: NextResponse;
  if (mode === "offline") {
    response = NextResponse.json(loadHealthFixture());
  } else {
    try {
      const res = await fetch(`${getUpstreamBaseUrl()}/health`, {
        cache: "no-store",
        headers: { "x-request-id": requestId },
      });
      const data = await res.json();
      response = NextResponse.json(data, { status: res.status });
    } catch (err) {
      log.error(
        {
          event: "upstream_unreachable",
          path: "/api/health",
          error: err instanceof Error ? err.message : String(err),
        },
        "upstream unreachable",
      );
      portalUpstreamUnreachableTotal.inc();
      response = NextResponse.json(
        { status: "upstream_unreachable", data_source: "live" },
        { status: 503 },
      );
    }
  }

  response.headers.set("x-request-id", requestId);
  const durationMs = Date.now() - start;
  portalRequestsTotal
    .labels({
      route: "/api/health",
      mode,
      status_code: String(response.status),
    })
    .inc();
  portalRequestDurationSeconds
    .labels({ route: "/api/health", mode })
    .observe(durationMs / 1000);
  log.info(
    {
      event: "route_completed",
      path: "/api/health",
      mode,
      status_code: response.status,
      duration_ms: durationMs,
    },
    "route completed",
  );
  return response;
}
