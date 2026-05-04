import { describe, it, expect } from "vitest";
import { shapeDashboardData } from "@/lib/dashboard-data";

describe("shapeDashboardData", () => {
  const sampleSummary = {
    start_date: "2025-07-01",
    end_date: "2025-12-31",
    total_sales: 117973736,
    total_transactions: 3582897,
    average_labor_cost_pct: 0.115944,
    daily_sales_trend: [
      { date: "2025-07-01", total_sales: 640000, transaction_count: 17653 },
      { date: "2025-07-02", total_sales: 620000, transaction_count: 17120 },
    ],
    top_stores_by_revenue: [
      { store_id: 2, total_sales: 22070829.99 },
      { store_id: 1, total_sales: 19037444.48 },
    ],
    exception_count_by_severity: [
      { severity_level: "info", count: 438 },
      { severity_level: "warning", count: 15 },
      { severity_level: "critical", count: 0 },
    ],
  };

  const sampleAnomalies = {
    total: 453,
    limit: 200,
    offset: 0,
    items: [
      { severity_level: "info" },
      { severity_level: "info" },
      { severity_level: "warning" },
    ],
  };

  const sampleStoreMetrics = {
    total: 3,
    limit: 200,
    offset: 0,
    items: [
      { labor_cost_pct: 0.105 },
      { labor_cost_pct: 0.115 },
      { labor_cost_pct: 0.12 },
    ],
  };

  it("returns the expected fields with correct values", () => {
    const shaped = shapeDashboardData(sampleSummary, sampleAnomalies, sampleStoreMetrics);
    expect(shaped.totalSales).toBe(117973736);
    expect(shaped.totalTransactions).toBe(3582897);
    expect(shaped.activeExceptions).toBe(453);
    expect(shaped.avgLaborCostPct).toBeCloseTo(0.11333, 4);
    expect(shaped.dailyTrend).toHaveLength(2);
    expect(shaped.dailyTrend[0]).toEqual({ date: "2025-07-01", totalSales: 640000 });
    expect(shaped.topStores).toHaveLength(2);
    expect(shaped.topStores[0]).toEqual({
      storeId: "2",
      storeName: "Store 2",
      totalSales: 22070829.99,
    });
    expect(shaped.exceptionSeverityCounts).toEqual({ info: 438, warning: 15, critical: 0 });
  });

  it("handles a summary with no severity buckets", () => {
    const summaryWithoutBuckets = { ...sampleSummary, exception_count_by_severity: [] };
    const shaped = shapeDashboardData(summaryWithoutBuckets, sampleAnomalies, sampleStoreMetrics);
    expect(shaped.exceptionSeverityCounts).toEqual({ info: 0, warning: 0, critical: 0 });
  });

  it("handles empty store-metrics list gracefully", () => {
    const shaped = shapeDashboardData(
      sampleSummary,
      sampleAnomalies,
      { total: 0, limit: 200, offset: 0, items: [] },
    );
    expect(shaped.avgLaborCostPct).toBe(0);
  });

  it("ignores unknown severity bucket labels without crashing", () => {
    const summaryWithOdd = {
      ...sampleSummary,
      exception_count_by_severity: [
        { severity_level: "info", count: 10 },
        { severity_level: "INFO", count: 99 },
        { severity_level: "warning", count: 5 },
        { severity_level: "critical", count: 1 },
        { severity_level: "unknown", count: 7 },
      ],
    };
    const shaped = shapeDashboardData(summaryWithOdd, sampleAnomalies, sampleStoreMetrics);
    expect(shaped.exceptionSeverityCounts).toEqual({ info: 10, warning: 5, critical: 1 });
  });
});
