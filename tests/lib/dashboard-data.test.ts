import { describe, it, expect } from "vitest";
import { shapeDashboardData } from "@/lib/dashboard-data";

describe("shapeDashboardData", () => {
  const sampleAnomalies = {
    total: 5,
    limit: 200,
    offset: 0,
    items: [
      { severity_level: "info" },
      { severity_level: "info" },
      { severity_level: "info" },
      { severity_level: "warning" },
      { severity_level: "critical" },
    ],
  };

  const sampleStoreMetrics = {
    total: 6,
    limit: 200,
    offset: 0,
    items: [
      { date: "2024-07-01", store_id: 1, total_sales: 100, transaction_count: 10, labor_cost_pct: 0.10 },
      { date: "2024-07-01", store_id: 2, total_sales: 200, transaction_count: 20, labor_cost_pct: 0.12 },
      { date: "2024-07-02", store_id: 1, total_sales: 110, transaction_count: 11, labor_cost_pct: 0.11 },
      { date: "2024-07-02", store_id: 2, total_sales: 220, transaction_count: 22, labor_cost_pct: 0.13 },
      { date: "2025-12-31", store_id: 1, total_sales: 150, transaction_count: 15, labor_cost_pct: 0.14 },
      { date: "2025-12-31", store_id: 2, total_sales: 250, transaction_count: 25, labor_cost_pct: 0.15 },
    ],
  };

  const sampleDimStores = [
    { store_id: 1, store_name: "Knot Shore — Kirkwood" },
    { store_id: 2, store_name: "Knot Shore — Chesterfield" },
  ];

  it("aggregates totals across all store-metrics rows", () => {
    const shaped = shapeDashboardData(sampleAnomalies, sampleStoreMetrics, sampleDimStores);
    expect(shaped.totalSales).toBeCloseTo(1030, 2);
    expect(shaped.totalTransactions).toBe(103);
  });

  it("computes daily trend by summing across stores per date", () => {
    const shaped = shapeDashboardData(sampleAnomalies, sampleStoreMetrics, sampleDimStores);
    expect(shaped.dailyTrend).toEqual([
      { date: "2024-07-01", totalSales: 300 },
      { date: "2024-07-02", totalSales: 330 },
      { date: "2025-12-31", totalSales: 400 },
    ]);
  });

  it("computes top stores by total revenue across the window", () => {
    const shaped = shapeDashboardData(sampleAnomalies, sampleStoreMetrics, sampleDimStores);
    expect(shaped.topStores).toEqual([
      { storeId: "2", storeName: "Knot Shore — Chesterfield", totalSales: 670 },
      { storeId: "1", storeName: "Knot Shore — Kirkwood", totalSales: 360 },
    ]);
  });

  it("reports active exceptions from anomalies total", () => {
    const shaped = shapeDashboardData(sampleAnomalies, sampleStoreMetrics, sampleDimStores);
    expect(shaped.activeExceptions).toBe(5);
  });

  it("counts severity buckets from anomaly items", () => {
    const shaped = shapeDashboardData(sampleAnomalies, sampleStoreMetrics, sampleDimStores);
    expect(shaped.exceptionSeverityCounts).toEqual({ info: 3, warning: 1, critical: 1 });
  });

  it("computes avg labor cost across non-null entries", () => {
    const shaped = shapeDashboardData(sampleAnomalies, sampleStoreMetrics, sampleDimStores);
    expect(shaped.avgLaborCostPct).toBeCloseTo(0.125, 4);
  });

  it("reports window start and end from min/max metric dates", () => {
    const shaped = shapeDashboardData(sampleAnomalies, sampleStoreMetrics, sampleDimStores);
    expect(shaped.windowStartDate).toBe("2024-07-01");
    expect(shaped.windowEndDate).toBe("2025-12-31");
  });

  it("handles empty store-metrics gracefully", () => {
    const shaped = shapeDashboardData(
      sampleAnomalies,
      { total: 0, limit: 200, offset: 0, items: [] },
      sampleDimStores,
    );
    expect(shaped.totalSales).toBe(0);
    expect(shaped.totalTransactions).toBe(0);
    expect(shaped.avgLaborCostPct).toBe(0);
    expect(shaped.dailyTrend).toEqual([]);
    expect(shaped.topStores).toEqual([]);
    expect(shaped.windowStartDate).toBeNull();
    expect(shaped.windowEndDate).toBeNull();
  });

  it("ignores labor_cost_pct entries that are null", () => {
    const shaped = shapeDashboardData(
      sampleAnomalies,
      {
        total: 2,
        limit: 200,
        offset: 0,
        items: [
          { date: "2024-07-01", store_id: 1, total_sales: 100, transaction_count: 10, labor_cost_pct: 0.10 },
          { date: "2024-07-01", store_id: 2, total_sales: 200, transaction_count: 20, labor_cost_pct: null },
        ],
      },
      sampleDimStores,
    );
    expect(shaped.avgLaborCostPct).toBeCloseTo(0.10, 4);
  });

  it("ignores unknown severity bucket labels without crashing", () => {
    const anomaliesWithOdd = {
      total: 4,
      limit: 200,
      offset: 0,
      items: [
        { severity_level: "info" },
        { severity_level: "INFO" },
        { severity_level: "unknown" },
        { severity_level: "warning" },
      ],
    };
    const shaped = shapeDashboardData(anomaliesWithOdd, sampleStoreMetrics, sampleDimStores);
    expect(shaped.exceptionSeverityCounts).toEqual({ info: 1, warning: 1, critical: 0 });
  });

  it("composes storeNames from dim_stores", () => {
    const shaped = shapeDashboardData(sampleAnomalies, sampleStoreMetrics, sampleDimStores);
    expect(shaped.storeNames).toEqual({
      1: "Knot Shore — Kirkwood",
      2: "Knot Shore — Chesterfield",
    });
  });

  it("falls back to synthesized name when dim_stores is empty", () => {
    const shaped = shapeDashboardData(sampleAnomalies, sampleStoreMetrics, []);
    expect(shaped.storeNames).toEqual({});
    expect(shaped.topStores[0].storeName).toBe("Store 2");
  });

  it("limits top stores to five entries", () => {
    const manyStores = {
      total: 7,
      limit: 200,
      offset: 0,
      items: [
        { date: "2024-07-01", store_id: 1, total_sales: 700, transaction_count: 10 },
        { date: "2024-07-01", store_id: 2, total_sales: 600, transaction_count: 10 },
        { date: "2024-07-01", store_id: 3, total_sales: 500, transaction_count: 10 },
        { date: "2024-07-01", store_id: 4, total_sales: 400, transaction_count: 10 },
        { date: "2024-07-01", store_id: 5, total_sales: 300, transaction_count: 10 },
        { date: "2024-07-01", store_id: 6, total_sales: 200, transaction_count: 10 },
        { date: "2024-07-01", store_id: 7, total_sales: 100, transaction_count: 10 },
      ],
    };
    const shaped = shapeDashboardData(sampleAnomalies, manyStores, []);
    expect(shaped.topStores).toHaveLength(5);
    expect(shaped.topStores[0].totalSales).toBe(700);
    expect(shaped.topStores[4].totalSales).toBe(300);
  });
});
