import { describe, it, expect } from "vitest";
import {
  loadStoreMetricsFixture,
  loadAnomaliesFixture,
  loadDashboardSummaryFixture,
  loadHealthFixture,
} from "@/lib/fixture-loader";

describe("fixture loaders", () => {
  it("loadStoreMetricsFixture returns expected shape", () => {
    const data = loadStoreMetricsFixture();
    expect(data).toHaveProperty("total");
    expect(data).toHaveProperty("limit");
    expect(data).toHaveProperty("offset");
    expect(data).toHaveProperty("items");
    expect(Array.isArray(data.items)).toBe(true);
  });

  it("loadAnomaliesFixture returns expected shape", () => {
    const data = loadAnomaliesFixture();
    expect(data).toHaveProperty("total");
    expect(data).toHaveProperty("items");
    expect(Array.isArray(data.items)).toBe(true);
  });

  it("loadDashboardSummaryFixture returns all required top-level fields", () => {
    const data = loadDashboardSummaryFixture();
    expect(data).toHaveProperty("start_date");
    expect(data).toHaveProperty("end_date");
    expect(data).toHaveProperty("total_sales");
    expect(data).toHaveProperty("total_transactions");
    expect(data).toHaveProperty("top_stores_by_revenue");
    expect(data).toHaveProperty("exception_count_by_severity");
    expect(data).toHaveProperty("daily_sales_trend");
  });

  it("loadDashboardSummaryFixture severity always includes all three levels", () => {
    const data = loadDashboardSummaryFixture();
    const levels = data.exception_count_by_severity.map((e) => e.severity_level);
    expect(levels).toContain("info");
    expect(levels).toContain("warning");
    expect(levels).toContain("critical");
  });

  it("loadHealthFixture reports data_source as fixtures", () => {
    const data = loadHealthFixture();
    expect(data.data_source).toBe("fixtures");
  });
});
