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
    // 8 stores across 731 days (the two full calendar years) —
    // 5848 store-day rows, the count the API contract tests pin.
    expect(data.total).toBe(5848);
    expect(data.items).toHaveLength(5848);
    // Store 1 on 2024-01-01 opens the window: the anchor row pinned
    // against the canonical parquet in the API repo.
    expect(data.items[0]).toMatchObject({
      date: "2024-01-01",
      store_id: 1,
      total_sales: 78729.42,
      transaction_count: 2064,
    });
  });

  it("loadAnomaliesFixture serves the canonical anomaly-flags set", () => {
    const data = loadAnomaliesFixture();
    // 343 anomaly flags — the canonical count carried from the API on
    // the two-year window; the detection verdict remains PASS.
    expect(data.total).toBe(343);
    expect(data.items).toHaveLength(343);
    // The earliest flag: a negative-margin injection caught by the
    // gross_margin_band rule.
    expect(data.items[0]).toMatchObject({
      date: "2024-01-03",
      store_id: 6,
      rule_id: "gross_margin_band",
      actual_value: -0.1618,
      severity_level: "warning",
    });
  });

  it("loadDashboardSummaryFixture serves the canonical recent-window aggregates", () => {
    const data = loadDashboardSummaryFixture();
    // The /dashboard-summary endpoint pre-aggregates the recent window
    // (calendar 2025). These totals are what the portal's own
    // recent-period KPI aggregation must reconcile against.
    expect(data.start_date).toBe("2025-01-01");
    expect(data.end_date).toBe("2025-12-31");
    expect(data.total_sales).toBe(222402533.91);
    expect(data.total_transactions).toBe(6752355);
    expect(data.average_labor_cost_pct).toBe(0.124317);
    expect(data.top_stores_by_revenue[0]).toEqual({
      store_id: 2,
      total_sales: 41560031.77,
    });
    expect(data.daily_sales_trend).toHaveLength(365);
  });

  it("loadDashboardSummaryFixture reports the canonical severity breakdown", () => {
    const data = loadDashboardSummaryFixture();
    const counts = Object.fromEntries(
      data.exception_count_by_severity.map((e) => [e.severity_level, e.count]),
    );
    // The 2025 recent window carries 17 info and 150 warning flags.
    // The full canonical's single critical-severity row (the
    // revenue_zscore_28d flag) falls on 2024-09-24 — outside the
    // recent window — so the pre-aggregated summary reports zero
    // criticals here.
    expect(counts).toEqual({ info: 17, warning: 150, critical: 0 });
  });

  it("loadHealthFixture reports the offline-mode health envelope", () => {
    // Business-correctness: pins the captured envelope's shape and
    // values to the API repo's contract. The captured fixture is taken
    // with the API in its own fixture-backed mode, so grocery reports
    // healthy/offline while the macro pipeline is unavailable; the
    // top-level rolls that up to degraded with a 200 upstream status.
    const data = loadHealthFixture();
    expect(data.status).toBe("degraded");
    expect(data.version).toBe("1.0.0");
    expect(data.grocery_pipeline.status).toBe("healthy");
    expect(data.grocery_pipeline.mode).toBe("offline");
    expect(data.macro_pipeline.status).toBe("unavailable");
  });
});
