import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

describe("store-metrics route handler", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns fixture data when API_MODE is offline", async () => {
    process.env.API_MODE = "offline";
    const { GET } = await import("@/app/api/store-metrics/route");
    const req = new NextRequest("http://localhost/api/store-metrics");
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveProperty("total");
    expect(data).toHaveProperty("items");
    expect(Array.isArray(data.items)).toBe(true);
    expect(res.headers.get("X-Data-Source")).toBeNull();
  });

  it("returns upstream body when API_MODE is online and upstream succeeds", async () => {
    process.env.API_MODE = "online";
    process.env.API_BASE_URL = "http://upstream.test";
    const upstreamBody = { total: 1, limit: 1, offset: 0, items: [{ marker: "from-upstream" }] };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(upstreamBody), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const { GET } = await import("@/app/api/store-metrics/route");
    const req = new NextRequest("http://localhost/api/store-metrics");
    const res = await GET(req);
    const data = await res.json();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain("http://upstream.test/store-metrics");
    expect(res.status).toBe(200);
    expect(data).toEqual(upstreamBody);
    expect(res.headers.get("X-Data-Source")).toBeNull();
  });

  it("falls back to fixture with X-Data-Source: fallback when upstream fetch fails", async () => {
    process.env.API_MODE = "online";
    process.env.API_BASE_URL = "http://upstream.test";
    const fetchMock = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    globalThis.fetch = fetchMock as typeof fetch;

    const { GET } = await import("@/app/api/store-metrics/route");
    const req = new NextRequest("http://localhost/api/store-metrics");
    const res = await GET(req);
    const data = await res.json();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("fallback");
    expect(data).toHaveProperty("total");
    expect(data).toHaveProperty("items");
    expect(Array.isArray(data.items)).toBe(true);
  });
});
