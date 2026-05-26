import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET as anomaliesGET } from "@/app/api/anomalies/route";
import { GET as dashboardSummaryGET } from "@/app/api/dashboard-summary/route";
import { GET as departmentMetricsGET } from "@/app/api/department-metrics/route";
import { GET as dimStoresGET } from "@/app/api/dim-stores/route";
import { GET as healthGET } from "@/app/api/health/route";
import { GET as storeMetricsGET } from "@/app/api/store-metrics/route";

import {
  loadAnomaliesFixture,
  loadDashboardSummaryFixture,
  loadDepartmentMetricsFixture,
  loadDimStoresFixture,
  loadHealthFixture,
  loadStoreMetricsFixture,
} from "@/lib/fixture-loader";
import { registry } from "@/lib/metrics";

/**
 * Parameterized coverage for the six /api/* GET handlers that now route
 * through makeProxyRoute. The six previously-duplicated handler bodies
 * collapsed to a single factory, but only one of the six (store-metrics)
 * had an existing handler test. This file brings the remaining five
 * into coverage by exercising the four canonical behaviors per route:
 * offline serves the fixture, online success proxies the upstream,
 * online failure either falls back to the fixture with X-Data-Source:
 * fallback (the five data routes) or returns the structured 503 body
 * (the health route's onUpstreamFailure override), and x-request-id
 * is propagated to the response. A separate suite confirms the
 * portal_requests_total counter increments on each call.
 *
 * Mode and globalThis.fetch are mutated through vi.stubEnv /
 * vi.stubGlobal and reverted in afterEach. The handlers are imported
 * statically once at module evaluation so the heavy fixture graph
 * loads at collection time rather than per-test.
 */

interface RouteCase {
  name: string;
  GET: (req: NextRequest) => Promise<Response>;
  path: string;
  upstreamUrlMatch: string;
  loadFixture: () => unknown;
  hasFallback: boolean;
  fallbackBodyOverride?: { status: number; bodyMatch: (body: unknown) => void };
}

const ROUTES: RouteCase[] = [
  {
    name: "anomalies",
    GET: anomaliesGET,
    path: "/api/anomalies",
    upstreamUrlMatch: "/anomalies",
    loadFixture: loadAnomaliesFixture,
    hasFallback: true,
  },
  {
    name: "dashboard-summary",
    GET: dashboardSummaryGET,
    path: "/api/dashboard-summary",
    upstreamUrlMatch: "/dashboard-summary",
    loadFixture: loadDashboardSummaryFixture,
    hasFallback: true,
  },
  {
    name: "department-metrics",
    GET: departmentMetricsGET,
    path: "/api/department-metrics",
    upstreamUrlMatch: "/department-metrics",
    loadFixture: loadDepartmentMetricsFixture,
    hasFallback: true,
  },
  {
    name: "dim-stores",
    GET: dimStoresGET,
    path: "/api/dim-stores",
    upstreamUrlMatch: "/dim-stores",
    loadFixture: loadDimStoresFixture,
    hasFallback: true,
  },
  {
    name: "store-metrics",
    GET: storeMetricsGET,
    path: "/api/store-metrics",
    upstreamUrlMatch: "/store-metrics",
    loadFixture: loadStoreMetricsFixture,
    hasFallback: true,
  },
  {
    name: "health",
    GET: healthGET,
    path: "/api/health",
    upstreamUrlMatch: "/health",
    loadFixture: loadHealthFixture,
    hasFallback: false,
    fallbackBodyOverride: {
      status: 503,
      bodyMatch: (body) => {
        const b = body as Record<string, unknown>;
        expect(b.status).toBe("upstream_unreachable");
        expect(b.version).toBe("unknown");
        expect(b.grocery_pipeline).toEqual({ status: "unavailable" });
        expect(b.macro_pipeline).toEqual({ status: "unavailable" });
      },
    },
  },
];

describe("proxy route handlers (parameterized)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe.each(ROUTES)("$name", (route) => {
    it("serves the bundled fixture verbatim when API_MODE is offline", async () => {
      vi.stubEnv("API_MODE", "offline");
      const req = new NextRequest(`http://localhost${route.path}`);
      const res = await route.GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(route.loadFixture());
      expect(res.headers.get("X-Data-Source")).toBeNull();
    });

    it("proxies the upstream response when API_MODE is online and upstream succeeds", async () => {
      vi.stubEnv("API_MODE", "online");
      vi.stubEnv("API_BASE_URL", "http://upstream.test");
      const upstreamBody = { proxied: true, route: route.name };
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(upstreamBody), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const req = new NextRequest(`http://localhost${route.path}`);
      const res = await route.GET(req);
      const data = await res.json();

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock.mock.calls[0][0]).toContain(
        `http://upstream.test${route.upstreamUrlMatch}`,
      );
      expect(res.status).toBe(200);
      expect(data).toEqual(upstreamBody);
      expect(res.headers.get("X-Data-Source")).toBeNull();
    });

    if (route.hasFallback) {
      it("falls back to the fixture with X-Data-Source: fallback when upstream is unreachable", async () => {
        vi.stubEnv("API_MODE", "online");
        vi.stubEnv("API_BASE_URL", "http://upstream.test");
        const fetchMock = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
        vi.stubGlobal("fetch", fetchMock);

        const req = new NextRequest(`http://localhost${route.path}`);
        const res = await route.GET(req);
        const data = await res.json();

        expect(fetchMock).toHaveBeenCalledOnce();
        expect(res.status).toBe(200);
        expect(res.headers.get("X-Data-Source")).toBe("fallback");
        expect(data).toEqual(route.loadFixture());
      });
    } else {
      it("returns the structured upstream_unreachable body when the upstream is unreachable", async () => {
        vi.stubEnv("API_MODE", "online");
        vi.stubEnv("API_BASE_URL", "http://upstream.test");
        const fetchMock = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
        vi.stubGlobal("fetch", fetchMock);

        const req = new NextRequest(`http://localhost${route.path}`);
        const res = await route.GET(req);
        const data = await res.json();

        expect(fetchMock).toHaveBeenCalledOnce();
        expect(res.status).toBe(route.fallbackBodyOverride!.status);
        // The override body is operational signal, not fixture data,
        // so the X-Data-Source: fallback header is not set.
        expect(res.headers.get("X-Data-Source")).toBeNull();
        route.fallbackBodyOverride!.bodyMatch(data);
      });
    }

    it("propagates the incoming x-request-id to the response", async () => {
      vi.stubEnv("API_MODE", "offline");
      const incoming = "test-request-id-1234";
      const req = new NextRequest(`http://localhost${route.path}`, {
        headers: { "x-request-id": incoming },
      });
      const res = await route.GET(req);

      expect(res.headers.get("x-request-id")).toBe(incoming);
    });

    it("mints an x-request-id when the incoming request has none", async () => {
      vi.stubEnv("API_MODE", "offline");
      const req = new NextRequest(`http://localhost${route.path}`);
      const res = await route.GET(req);

      const minted = res.headers.get("x-request-id");
      expect(minted).toBeTruthy();
      expect(minted).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe("metrics counter", () => {
    it("increments portal_requests_total for the route on each call", async () => {
      vi.stubEnv("API_MODE", "offline");
      // Snapshot the counter for /api/anomalies in offline mode, hit the
      // route, and confirm the labeled count increased by one. The metrics
      // singleton is shared across tests, so the assertion is on delta
      // rather than absolute value.
      const before = await readCounter(
        registry,
        "portal_requests_total",
        { route: "/api/anomalies", mode: "offline", status_code: "200" },
      );

      const req = new NextRequest("http://localhost/api/anomalies");
      await anomaliesGET(req);

      const after = await readCounter(
        registry,
        "portal_requests_total",
        { route: "/api/anomalies", mode: "offline", status_code: "200" },
      );

      expect(after - before).toBe(1);
    });
  });
});

async function readCounter(
  registry: import("prom-client").Registry,
  name: string,
  labels: Record<string, string>,
): Promise<number> {
  const metric = await registry.getSingleMetric(name)?.get();
  if (!metric) return 0;
  // prom-client's get() returns { values: [{value, labels}, ...] }
  // for counters. Find the matching label set or return 0.
  const match = metric.values.find((v) =>
    Object.entries(labels).every(([k, val]) => (v.labels as Record<string, string>)[k] === val),
  );
  return match?.value ?? 0;
}
