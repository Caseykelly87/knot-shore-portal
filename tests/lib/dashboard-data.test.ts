import { describe, it, expect } from "vitest";
import { shapeDashboardData, shapeTradeAreaComparison } from "@/lib/dashboard-data";

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
    expect(shaped.dailyTrend.map(({ date, totalSales }) => ({ date, totalSales }))).toEqual([
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

  describe("KPI delta computation", () => {
    // 18-month window so all three periods (recent, pop, yoy) are present.
    // Anomalies carry dates aligned with the canonical period boundaries.
    const periodAnomalies = {
      total: 6,
      limit: 200,
      offset: 0,
      items: [
        { date: "2024-08-15", severity_level: "info" },
        { date: "2024-09-10", severity_level: "warning" },
        { date: "2025-02-20", severity_level: "critical" },
        { date: "2025-03-10", severity_level: "info" },
        { date: "2025-08-01", severity_level: "warning" },
        { date: "2025-11-30", severity_level: "critical" },
      ],
    };

    // Anchors at 2024-07-01 and 2025-12-31 so the derived window is the
    // canonical 18-month span. Two entries per period keep the totals
    // round and easy to verify against the expected deltas.
    const periodMetrics = {
      total: 8,
      limit: 200,
      offset: 0,
      items: [
        { date: "2024-07-01", store_id: 1, total_sales: 100, transaction_count: 10, labor_cost_pct: 0.10 },
        { date: "2024-12-31", store_id: 1, total_sales: 100, transaction_count: 10, labor_cost_pct: 0.10 },
        { date: "2025-01-01", store_id: 1, total_sales: 200, transaction_count: 20, labor_cost_pct: 0.20 },
        { date: "2025-06-30", store_id: 1, total_sales: 200, transaction_count: 20, labor_cost_pct: 0.20 },
        { date: "2025-07-01", store_id: 1, total_sales: 300, transaction_count: 30, labor_cost_pct: 0.30 },
        { date: "2025-12-31", store_id: 1, total_sales: 300, transaction_count: 30, labor_cost_pct: 0.30 },
      ],
    };

    it("computes recent/pop/yoy aggregates for each KPI", () => {
      const shaped = shapeDashboardData(periodAnomalies, periodMetrics, sampleDimStores);
      expect(shaped.kpiDeltas.totalSales.recent).toBe(600);
      expect(shaped.kpiDeltas.totalSales.pop).toBe(400);
      expect(shaped.kpiDeltas.totalSales.yoy).toBe(200);
      expect(shaped.kpiDeltas.totalTransactions.recent).toBe(60);
      expect(shaped.kpiDeltas.totalTransactions.pop).toBe(40);
      expect(shaped.kpiDeltas.totalTransactions.yoy).toBe(20);
      expect(shaped.kpiDeltas.activeExceptions.recent).toBe(2);
      expect(shaped.kpiDeltas.activeExceptions.pop).toBe(2);
      expect(shaped.kpiDeltas.activeExceptions.yoy).toBe(2);
      expect(shaped.kpiDeltas.avgLaborCostPct.recent).toBeCloseTo(0.30, 5);
      expect(shaped.kpiDeltas.avgLaborCostPct.pop).toBeCloseTo(0.20, 5);
      expect(shaped.kpiDeltas.avgLaborCostPct.yoy).toBeCloseTo(0.10, 5);
    });

    it("derives proportional deltas for each KPI from the period aggregates", () => {
      const shaped = shapeDashboardData(periodAnomalies, periodMetrics, sampleDimStores);
      expect(shaped.kpiDeltas.totalSales.popDelta).toBeCloseTo(0.5, 5);
      expect(shaped.kpiDeltas.totalSales.yoyDelta).toBeCloseTo(2.0, 5);
      expect(shaped.kpiDeltas.totalTransactions.popDelta).toBeCloseTo(0.5, 5);
      expect(shaped.kpiDeltas.avgLaborCostPct.popDelta).toBeCloseTo(0.5, 5);
      expect(shaped.kpiDeltas.avgLaborCostPct.yoyDelta).toBeCloseTo(2.0, 5);
    });

    it("includes the derived periods alongside the deltas", () => {
      const shaped = shapeDashboardData(periodAnomalies, periodMetrics, sampleDimStores);
      expect(shaped.periods).not.toBeNull();
      expect(shaped.periods!.recent.start).toBe("2025-07-01");
      expect(shaped.periods!.recent.end).toBe("2025-12-31");
      expect(shaped.periods!.pop).toEqual({ start: "2025-01-01", end: "2025-06-30" });
      expect(shaped.periods!.yoy).toEqual({ start: "2024-07-01", end: "2024-12-31" });
    });

    it("returns empty deltas when the window is missing", () => {
      const shaped = shapeDashboardData(
        sampleAnomalies,
        { total: 0, limit: 200, offset: 0, items: [] },
        sampleDimStores,
      );
      expect(shaped.periods).toBeNull();
      expect(shaped.kpiDeltas.totalSales.recent).toBe(0);
      expect(shaped.kpiDeltas.totalSales.popDelta).toBeNull();
      expect(shaped.kpiDeltas.totalSales.yoyDelta).toBeNull();
    });

    it("returns null deltas when the comparison baseline is zero", () => {
      const zeroBaselineMetrics = {
        total: 1,
        limit: 200,
        offset: 0,
        items: [
          // Only data in the recent period; pop and yoy aggregates are zero.
          { date: "2025-12-31", store_id: 1, total_sales: 500, transaction_count: 50, labor_cost_pct: 0.15 },
          { date: "2024-07-01", store_id: 1, total_sales: 0, transaction_count: 0 },
        ],
      };
      const shaped = shapeDashboardData(
        { total: 0, limit: 200, offset: 0, items: [] },
        zeroBaselineMetrics,
        sampleDimStores,
      );
      expect(shaped.kpiDeltas.totalSales.popDelta).toBeNull();
    });

    it("skips anomalies without a date when counting per-period exceptions", () => {
      const anomaliesWithMissingDates = {
        total: 3,
        limit: 200,
        offset: 0,
        items: [
          { date: "2025-09-01", severity_level: "info" },
          { severity_level: "warning" }, // no date — ignored
          { date: "2024-09-01", severity_level: "info" },
        ],
      };
      const shaped = shapeDashboardData(anomaliesWithMissingDates, periodMetrics, sampleDimStores);
      expect(shaped.kpiDeltas.activeExceptions.recent).toBe(1);
      expect(shaped.kpiDeltas.activeExceptions.yoy).toBe(1);
    });
  });

  describe("trade-area comparison", () => {
    const tradeAreaDimStores = [
      { store_id: 1, store_name: "Suburb A", trade_area_profile: "suburban-family" },
      { store_id: 2, store_name: "Suburb B", trade_area_profile: "suburban-family" },
      { store_id: 3, store_name: "Urban A", trade_area_profile: "urban-dense" },
      { store_id: 4, store_name: "Value A", trade_area_profile: "value-market" },
    ];

    const tradeAreaMetrics = {
      total: 8,
      limit: 200,
      offset: 0,
      items: [
        { date: "2025-07-01", store_id: 1, total_sales: 100, transaction_count: 10 },
        { date: "2025-07-01", store_id: 2, total_sales: 200, transaction_count: 20 },
        { date: "2025-07-01", store_id: 3, total_sales: 300, transaction_count: 30 },
        { date: "2025-07-01", store_id: 4, total_sales: 50, transaction_count: 5 },
      ],
    };

    const tradeAreaAnomalies = {
      total: 5,
      limit: 200,
      offset: 0,
      items: [
        { store_id: 1, severity_level: "info" },
        { store_id: 1, severity_level: "warning" },
        { store_id: 2, severity_level: "critical" },
        { store_id: 3, severity_level: "info" },
        { store_id: 4, severity_level: "info" },
      ],
    };

    it("groups stores by trade area in canonical order", () => {
      const summaries = shapeTradeAreaComparison(
        tradeAreaMetrics.items,
        tradeAreaAnomalies.items,
        tradeAreaDimStores,
      );
      expect(summaries.map((s) => s.tradeArea)).toEqual([
        "suburban-family",
        "urban-dense",
        "value-market",
      ]);
    });

    it("aggregates store count, total sales, and avg-per-store per profile", () => {
      const summaries = shapeTradeAreaComparison(
        tradeAreaMetrics.items,
        tradeAreaAnomalies.items,
        tradeAreaDimStores,
      );
      const suburban = summaries.find((s) => s.tradeArea === "suburban-family")!;
      expect(suburban.storeCount).toBe(2);
      expect(suburban.totalSales).toBe(300);
      expect(suburban.avgSalesPerStore).toBe(150);

      const urban = summaries.find((s) => s.tradeArea === "urban-dense")!;
      expect(urban.storeCount).toBe(1);
      expect(urban.totalSales).toBe(300);
      expect(urban.avgSalesPerStore).toBe(300);
    });

    it("counts anomalies attributed to stores in each profile", () => {
      const summaries = shapeTradeAreaComparison(
        tradeAreaMetrics.items,
        tradeAreaAnomalies.items,
        tradeAreaDimStores,
      );
      expect(summaries.find((s) => s.tradeArea === "suburban-family")!.totalExceptions).toBe(3);
      expect(summaries.find((s) => s.tradeArea === "urban-dense")!.totalExceptions).toBe(1);
      expect(summaries.find((s) => s.tradeArea === "value-market")!.totalExceptions).toBe(1);
    });

    it("omits profiles with no stores in dim_stores", () => {
      const partial = tradeAreaDimStores.filter((s) => s.trade_area_profile !== "value-market");
      const summaries = shapeTradeAreaComparison(
        tradeAreaMetrics.items,
        tradeAreaAnomalies.items,
        partial,
      );
      expect(summaries.map((s) => s.tradeArea)).toEqual(["suburban-family", "urban-dense"]);
    });

    it("ignores anomalies without a store_id", () => {
      const summaries = shapeTradeAreaComparison(
        tradeAreaMetrics.items,
        [
          { severity_level: "info" },
          { store_id: 1, severity_level: "warning" },
        ],
        tradeAreaDimStores,
      );
      expect(summaries.find((s) => s.tradeArea === "suburban-family")!.totalExceptions).toBe(1);
    });

    it("ignores anomalies whose store is not in dim_stores", () => {
      const summaries = shapeTradeAreaComparison(
        tradeAreaMetrics.items,
        [{ store_id: 99, severity_level: "critical" }],
        tradeAreaDimStores,
      );
      expect(summaries.every((s) => s.totalExceptions === 0)).toBe(true);
    });

    it("includes trade-area summaries in shapeDashboardData output", () => {
      const shaped = shapeDashboardData(tradeAreaAnomalies, tradeAreaMetrics, tradeAreaDimStores);
      expect(shaped.tradeAreaSummaries.map((s) => s.tradeArea)).toEqual([
        "suburban-family",
        "urban-dense",
        "value-market",
      ]);
    });
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
