import { describe, it, expect, afterEach, vi } from "vitest";

// getBaseUrl() calls headers(), which returns null on Vercel's prerender
// path — the fault that crashed /about/detection-quality in demo mode
// (TypeError: Cannot read properties of null (reading 'get')). In offline
// mode this fetcher must never reach getBaseUrl; force it to throw so a
// regression back to unconditional self-fetching fails loudly here. The
// page test mocks fetchDetectionQuality wholesale and never exercises
// this branch, which is why the original crash slipped past a green suite.
vi.mock("@/lib/get-base-url", () => ({
  getBaseUrl: vi.fn(() => {
    throw new TypeError("Cannot read properties of null (reading 'get')");
  }),
}));

import { fetchDetectionQuality } from "@/lib/detection-quality-data";
import { getBaseUrl } from "@/lib/get-base-url";

describe("fetchDetectionQuality — offline branch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns the bundled fixture without calling getBaseUrl/headers", async () => {
    // Business-correctness: in offline mode the fetcher resolves from the
    // bundled fixture and never builds a request URL. Asserting getBaseUrl
    // is never called is what makes this a regression guard for the
    // prerender crash rather than a happy-path smoke test.
    vi.stubEnv("API_MODE", "offline");

    const data = await fetchDetectionQuality();

    expect(getBaseUrl).not.toHaveBeenCalled();
    expect(data.contract).toBeDefined();
    expect(data.contract.passes).toBe(true);
    expect(data.contract.reasons).toEqual([]);
    expect(Object.keys(data.by_anomaly_type).length).toBeGreaterThan(0);
    expect(data.total_flags).toBe(178);
  });
});
