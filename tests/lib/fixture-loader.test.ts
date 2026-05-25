import { describe, it, expect } from "vitest";
import {
  loadStoreMetricsFixture,
  loadAnomaliesFixture,
  loadDashboardSummaryFixture,
  loadHealthFixture,
} from "@/lib/fixture-loader";

/**
 * The bundled JSON fixtures are captured API responses, byte-identical
 * with what the API serves in online mode. These tests pin the
 * canonical values the API repo's own contract tests assert upstream,
 * so a fixture that drifts off the canonical dataset fails here rather
 * than silently feeding wrong numbers into every offline-mode shaper.
 */
describe("fixture loaders", () => {
  it("loadStoreMetricsFixture serves the canonical store-metrics window", () => {
    const data = loadStoreMetricsFixture();
    // 8 stores across 368 days (the two H2 slices, 2024 and 2025) —
    // 2944 store-day rows, the count the API contract tests pin.
    expect(data.total).toBe(2944);
    expect(data.items).toHaveLength(2944);
    // Store 1 on 2024-07-01 carries total_sales 86429.35: the anchor
    // value pinned against the canonical parquet in the API repo.
    expect(data.items[0]).toMatchObject({
      date: "2024-07-01",
      store_id: 1,
      total_sales: 86429.35,
      transaction_count: 2337,
    });
  });

  it("loadAnomaliesFixture serves the canonical anomaly-flags set", () => {
    const data = loadAnomaliesFixture();
    // 894 anomaly flags — the canonical count carried from the API
    // after the revenue_zscore_28d rule joined the band and structural
    // rules in the detection layer.
    expect(data.total).toBe(894);
    expect(data.items).toHaveLength(894);
    expect(data.items[0]).toMatchObject({
      date: "2024-07-05",
      store_id: 7,
      rule_id: "revenue_band",
      actual_value: 70154.26,
      severity_level: "info",
    });
  });

  it("loadDashboardSummaryFixture serves the canonical recent-window aggregates", () => {
    const data = loadDashboardSummaryFixture();
    // The /dashboard-summary endpoint pre-aggregates the recent window
    // (H2 2025). These totals are what the portal's own recent-period
    // KPI aggregation must reconcile against.
    expect(data.start_date).toBe("2025-07-01");
    expect(data.end_date).toBe("2025-12-31");
    expect(data.total_sales).toBe(115253718.09);
    expect(data.total_transactions).toBe(3501471);
    expect(data.average_labor_cost_pct).toBe(0.125425);
    expect(data.top_stores_by_revenue[0]).toEqual({
      store_id: 2,
      total_sales: 21561968.63,
    });
    expect(data.daily_sales_trend).toHaveLength(184);
  });

  it("loadDashboardSummaryFixture reports the canonical severity breakdown", () => {
    const data = loadDashboardSummaryFixture();
    const counts = Object.fromEntries(
      data.exception_count_by_severity.map((e) => [e.severity_level, e.count]),
    );
    // All three levels are always present; the recent window carries
    // 485 info and 42 warning flags. The full canonical now carries one
    // critical-severity row from the revenue_zscore_28d rule, but it
    // falls on 2024-09-24 — outside the H2 2025 recent window — so the
    // pre-aggregated summary still reports zero criticals here.
    expect(counts).toEqual({ info: 485, warning: 42, critical: 0 });
  });

  it("loadHealthFixture reports the offline-mode health envelope", () => {
    const data = loadHealthFixture();
    expect(data.data_source).toBe("fixtures");
    expect(data.status).toBe("degraded");
    expect(data.db).toBe("unavailable");
    expect(data.version).toBe("1.0.0");
  });
});
