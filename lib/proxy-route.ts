/**
 * Shared factory for the portal's /api/* GET handlers.
 *
 * Each /api/* route does the same work: read x-request-id (or mint one),
 * read API_MODE, log route_started, branch on mode, serve the fixture
 * in offline mode or proxy the upstream in online mode (falling back
 * to the fixture and setting X-Data-Source: fallback when the upstream
 * is unreachable), set x-request-id on the response, increment the two
 * prom-client metrics, and log route_completed.
 *
 * makeProxyRoute returns a GET handler that does exactly that. Each
 * route file becomes a single call to this factory with its path,
 * upstream path, and fixture loader.
 *
 * The /api/health route doesn't degrade to the bundled fixture when
 * the upstream is unreachable — health is operational signal, not data
 * that should be silently substituted. Routes that need the alternative
 * pass `onUpstreamFailure` to override the default fallback body and
 * status; the X-Data-Source: fallback header is suppressed in that case
 * because the overridden body isn't fixture content.
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiMode, getUpstreamBaseUrl } from "@/lib/api-mode";
import { getRequestLogger } from "@/lib/logger";
import {
  portalRequestsTotal,
  portalRequestDurationSeconds,
  portalUpstreamUnreachableTotal,
} from "@/lib/metrics";

export interface ProxyRouteConfig<T> {
  path: string;
  upstreamPath: string;
  loadFixture: () => T;
  onUpstreamFailure?: { body: unknown; status: number };
}

export function makeProxyRoute<T>(
  config: ProxyRouteConfig<T>,
): (req: NextRequest) => Promise<NextResponse> {
  const { path, upstreamPath, loadFixture, onUpstreamFailure } = config;

  return async function GET(req: NextRequest): Promise<NextResponse> {
    const incoming = req.headers.get("x-request-id");
    const requestId = incoming ?? crypto.randomUUID();
    const log = getRequestLogger(requestId);

    const mode = getApiMode();
    const start = Date.now();
    log.info({ event: "route_started", path, mode }, "route started");

    let response: NextResponse;
    if (mode === "offline") {
      response = NextResponse.json(loadFixture());
    } else {
      const upstream = `${getUpstreamBaseUrl()}${upstreamPath}${req.nextUrl.search}`;
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
            path,
            error: err instanceof Error ? err.message : String(err),
          },
          "upstream unreachable",
        );
        portalUpstreamUnreachableTotal.inc();
        if (onUpstreamFailure) {
          response = NextResponse.json(onUpstreamFailure.body, {
            status: onUpstreamFailure.status,
          });
        } else {
          response = NextResponse.json(loadFixture());
          response.headers.set("X-Data-Source", "fallback");
        }
      }
    }

    response.headers.set("x-request-id", requestId);
    const durationMs = Date.now() - start;
    portalRequestsTotal
      .labels({
        route: path,
        mode,
        status_code: String(response.status),
      })
      .inc();
    portalRequestDurationSeconds
      .labels({ route: path, mode })
      .observe(durationMs / 1000);
    log.info(
      {
        event: "route_completed",
        path,
        mode,
        status_code: response.status,
        duration_ms: durationMs,
      },
      "route completed",
    );
    return response;
  };
}
