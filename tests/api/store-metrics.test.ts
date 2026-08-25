import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/store-metrics/route";
import { loadStoreMetricsFixture } from "@/lib/fixture-loader";

/**
 * The route handler is imported statically, once, at module evaluation.
 * It reads API_MODE and API_BASE_URL only at request time (inside GET),
 * so there is no need to re-import it per test — and re-importing it was
 * the source of a cross-test race. The dynamic import pulled the route's
 * transitive fixture graph (including the multi-megabyte department
 * metrics JSON) inside the test body; under parallel file execution
 * that import could exceed the 5s test timeout, and a timed-out test's
 * continuation still ran GET() against process.env / globalThis.fetch
 * that a sibling test had since reassigned. A static import moves the
 * cost to collection time, so no test times out and no continuation
 * leaks across tests.
 *
 * Environment and fetch are mutated through vi.stubEnv / vi.stubGlobal
 * and reverted in afterEach, rather than reassigning process.env and
 * globalThis.fetch wholesale, so each test is self-contained.
 */
describe("store-metrics route handler", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("serves the store-metrics fixture verbatim when API_MODE is offline", async () => {
    vi.stubEnv("API_MODE", "offline");
    const req = new NextRequest("http://localhost/api/store-metrics");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    // Offline mode returns the bundled fixture unchanged — same total,
    // same row count, same canonical anchor row.
    expect(data).toEqual(loadStoreMetricsFixture());
    expect(data.total).toBe(5848);
    expect(res.headers.get("X-Data-Source")).toBeNull();
  });

  it("returns upstream body when API_MODE is online and upstream succeeds", async () => {
    vi.stubEnv("API_MODE", "online");
    vi.stubEnv("API_BASE_URL", "http://upstream.test");
    const upstreamBody = { total: 1, limit: 1, offset: 0, items: [{ marker: "from-upstream" }] };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(upstreamBody), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const req = new NextRequest("http://localhost/api/store-metrics");
    const res = await GET(req);
    const data = await res.json();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain("http://upstream.test/store-metrics");
    expect(res.status).toBe(200);
    expect(data).toEqual(upstreamBody);
    expect(res.headers.get("X-Data-Source")).toBeNull();
  });

  it("falls back to the fixture with X-Data-Source: fallback when upstream fetch fails", async () => {
    vi.stubEnv("API_MODE", "online");
    vi.stubEnv("API_BASE_URL", "http://upstream.test");
    const fetchMock = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    vi.stubGlobal("fetch", fetchMock);

    const req = new NextRequest("http://localhost/api/store-metrics");
    const res = await GET(req);
    const data = await res.json();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("fallback");
    // The fallback body is the bundled fixture, identical to offline mode.
    expect(data).toEqual(loadStoreMetricsFixture());
  });
});
