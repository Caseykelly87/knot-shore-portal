/**
 * Prometheus metrics for the portal.
 *
 * Exports a custom registry (not the prom-client global) and three
 * application metrics:
 *
 * - portalRequestsTotal: per-request counter labeled by route, mode,
 *   status_code. Increments on every /api/* request the portal handles.
 *   Lets operators see request rates broken down by mode (offline vs
 *   online) and outcome.
 *
 * - portalRequestDurationSeconds: per-request latency histogram labeled
 *   by route and mode. Default histogram buckets are suitable for HTTP
 *   latency in the millisecond-to-second range. Pairs with the existing
 *   route_completed log event's duration_ms field.
 *
 * - portalUpstreamUnreachableTotal: counter that increments only when
 *   the /api/health route in online mode can't reach the upstream API.
 *   Pairs with the upstream_unreachable log event.
 *
 * Default Node.js process metrics (memory, GC, event loop lag, fd count,
 * etc.) are also collected on the same registry, useful for spotting
 * deployment problems independent of HTTP traffic.
 *
 * Singleton across bundle copies
 * ------------------------------
 * Next.js bundles each /api/* route handler into its own webpack chunk,
 * and in development mode each chunk gets its own compiled copy of this
 * module. To make every route share the same Registry instance (so
 * increments from /api/health are visible to /api/metrics), the
 * registry and metric objects are cached on globalThis. Subsequent
 * imports reuse the cached instances rather than creating new ones.
 */

import {
  Registry,
  Counter,
  Histogram,
  collectDefaultMetrics,
} from "prom-client";

type PortalMetrics = {
  registry: Registry;
  portalRequestsTotal: Counter<"route" | "mode" | "status_code">;
  portalRequestDurationSeconds: Histogram<"route" | "mode">;
  portalUpstreamUnreachableTotal: Counter<string>;
};

const globalForMetrics = globalThis as unknown as {
  __portalMetrics?: PortalMetrics;
};

function buildMetrics(): PortalMetrics {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  const portalRequestsTotal = new Counter({
    name: "portal_requests_total",
    help: "Total /api/* requests handled by the portal, labeled by route, mode, and status code.",
    labelNames: ["route", "mode", "status_code"] as const,
    registers: [registry],
  });

  const portalRequestDurationSeconds = new Histogram({
    name: "portal_request_duration_seconds",
    help: "Latency of /api/* requests in seconds, labeled by route and mode.",
    labelNames: ["route", "mode"] as const,
    registers: [registry],
  });

  const portalUpstreamUnreachableTotal = new Counter({
    name: "portal_upstream_unreachable_total",
    help: "Total times the portal failed to reach the upstream api in online mode.",
    registers: [registry],
  });

  return {
    registry,
    portalRequestsTotal,
    portalRequestDurationSeconds,
    portalUpstreamUnreachableTotal,
  };
}

const metrics: PortalMetrics =
  globalForMetrics.__portalMetrics ?? buildMetrics();
if (!globalForMetrics.__portalMetrics) {
  globalForMetrics.__portalMetrics = metrics;
}

export const registry = metrics.registry;
export const portalRequestsTotal = metrics.portalRequestsTotal;
export const portalRequestDurationSeconds = metrics.portalRequestDurationSeconds;
export const portalUpstreamUnreachableTotal = metrics.portalUpstreamUnreachableTotal;
