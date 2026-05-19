import { describe, it, expect } from "vitest";
import { shapeStoresIndexData } from "@/lib/stores-index-data";

describe("shapeStoresIndexData", () => {
  const sampleDimStores = [
    { store_id: 1, store_name: "Knot Shore — Kirkwood", trade_area_profile: "suburban-family" },
    { store_id: 2, store_name: "Knot Shore — Chesterfield", trade_area_profile: "suburban-family" },
    { store_id: 3, store_name: "Knot Shore — North County", trade_area_profile: "value-market" },
  ];

  const sampleStoreMetrics = {
    total: 6,
    items: [
      { date: "2024-07-01", store_id: 1, total_sales: 100, transaction_count: 10 },
      { date: "2024-07-02", store_id: 1, total_sales: 120, transaction_count: 12 },
      { date: "2024-07-01", store_id: 2, total_sales: 200, transaction_count: 20 },
      { date: "2024-07-02", store_id: 2, total_sales: 220, transaction_count: 22 },
      { date: "2024-07-01", store_id: 3, total_sales: 80, transaction_count: 8 },
      { date: "2024-07-02", store_id: 3, total_sales: 90, transaction_count: 9 },
    ],
  };

  const sampleAnomalies = {
    total: 5,
    items: [
      { store_id: 1, severity_level: "info" },
      { store_id: 1, severity_level: "warning" },
      { store_id: 2, severity_level: "critical" },
      { store_id: 2, severity_level: "critical" },
      { store_id: 2, severity_level: "info" },
    ],
  };

  it("returns one entry per store sorted by store id", () => {
    const result = shapeStoresIndexData(sampleDimStores, sampleStoreMetrics, sampleAnomalies);
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.storeId)).toEqual([1, 2, 3]);
  });

  it("aggregates sales and transactions across all metrics rows per store", () => {
    const result = shapeStoresIndexData(sampleDimStores, sampleStoreMetrics, sampleAnomalies);
    expect(result[0]).toMatchObject({
      storeId: 1,
      totalSales: 220,
      totalTransactions: 22,
    });
    expect(result[1]).toMatchObject({
      storeId: 2,
      totalSales: 420,
      totalTransactions: 42,
    });
  });

  it("counts exceptions and breaks down severity per store", () => {
    const result = shapeStoresIndexData(sampleDimStores, sampleStoreMetrics, sampleAnomalies);
    expect(result[0].exceptionCount).toBe(2);
    expect(result[0].severityCounts).toEqual({ info: 1, warning: 1, critical: 0 });
    expect(result[1].exceptionCount).toBe(3);
    expect(result[1].severityCounts).toEqual({ info: 1, warning: 0, critical: 2 });
  });

  it("returns zero counts for stores with no anomalies", () => {
    const result = shapeStoresIndexData(sampleDimStores, sampleStoreMetrics, sampleAnomalies);
    expect(result[2].exceptionCount).toBe(0);
    expect(result[2].severityCounts).toEqual({ info: 0, warning: 0, critical: 0 });
  });

  it("carries trade area profile from dim_stores onto the entry", () => {
    const result = shapeStoresIndexData(sampleDimStores, sampleStoreMetrics, sampleAnomalies);
    expect(result[0].tradeAreaProfile).toBe("suburban-family");
    expect(result[2].tradeAreaProfile).toBe("value-market");
  });

  it("returns zero totals for stores absent from store-metrics", () => {
    const result = shapeStoresIndexData(
      sampleDimStores,
      { total: 0, items: [] },
      sampleAnomalies,
    );
    expect(result.every((e) => e.totalSales === 0)).toBe(true);
    expect(result.every((e) => e.totalTransactions === 0)).toBe(true);
  });
});
