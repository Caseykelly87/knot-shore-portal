import { describe, it, expect, beforeEach } from "vitest";

describe("metrics module", () => {
  beforeEach(async () => {
    const { registry } = await import("@/lib/metrics");
    registry.resetMetrics();
  });

  it("exports a registry and the expected named metrics", async () => {
    const {
      registry,
      portalRequestsTotal,
      portalRequestDurationSeconds,
      portalUpstreamUnreachableTotal,
    } = await import("@/lib/metrics");

    expect(registry).toBeDefined();
    expect(typeof registry.metrics).toBe("function");

    expect(typeof portalRequestsTotal.inc).toBe("function");
    expect(typeof portalRequestDurationSeconds.observe).toBe("function");
    expect(typeof portalUpstreamUnreachableTotal.inc).toBe("function");
  });

  it("registry.metrics() returns parseable Prometheus text", async () => {
    const { registry } = await import("@/lib/metrics");
    const text = await registry.metrics();
    expect(typeof text).toBe("string");
    expect(text).toContain("# HELP");
    expect(text).toContain("# TYPE");
    expect(text).toContain("portal_requests_total");
    expect(text).toContain("portal_request_duration_seconds");
    expect(text).toContain("portal_upstream_unreachable_total");
  });

  it("incrementing portalRequestsTotal produces an observable line", async () => {
    const { registry, portalRequestsTotal } = await import("@/lib/metrics");
    portalRequestsTotal
      .labels({ route: "/api/test", mode: "offline", status_code: "200" })
      .inc();
    const text = await registry.metrics();
    expect(text).toContain(
      'portal_requests_total{route="/api/test",mode="offline",status_code="200"}',
    );
  });
});
