import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("store-metrics route handler", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns fixture data when API_MODE is offline", async () => {
    process.env.API_MODE = "offline";
    const { GET } = await import("@/app/api/store-metrics/route");
    const req = new Request("http://localhost/api/store-metrics") as never;
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveProperty("total");
    expect(data).toHaveProperty("items");
    expect(Array.isArray(data.items)).toBe(true);
  });

  it("returns fixture data when API_MODE is unset", async () => {
    delete process.env.API_MODE;
    const { GET } = await import("@/app/api/store-metrics/route");
    const req = new Request("http://localhost/api/store-metrics") as never;
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveProperty("items");
  });
});
