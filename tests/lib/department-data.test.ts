import { describe, it, expect } from "vitest";
import { shapeDepartmentData } from "@/lib/department-data";

describe("shapeDepartmentData", () => {
  const sampleDimStores = [
    { store_id: 1, store_name: "Knot Shore — Alpha", trade_area_profile: "suburban-family" },
    { store_id: 2, store_name: "Knot Shore — Bravo", trade_area_profile: "urban-dense" },
    { store_id: 3, store_name: "Knot Shore — Charlie", trade_area_profile: "value-market" },
  ];

  const sampleMetrics = {
    total: 9,
    items: [
      // Department 1 in stores 1 and 2, across two dates
      { date: "2025-07-01", store_id: 1, department_id: 1, net_sales: 100, transactions: 10, units_sold: 40, gross_margin_pct: 0.50 },
      { date: "2025-07-01", store_id: 2, department_id: 1, net_sales: 200, transactions: 20, units_sold: 80, gross_margin_pct: 0.50 },
      { date: "2025-07-02", store_id: 1, department_id: 1, net_sales: 110, transactions: 11, units_sold: 44, gross_margin_pct: 0.50 },
      { date: "2025-07-02", store_id: 2, department_id: 1, net_sales: 220, transactions: 22, units_sold: 88, gross_margin_pct: 0.50 },
      // Department 2 in store 1 only
      { date: "2025-07-01", store_id: 1, department_id: 2, net_sales: 50, transactions: 5, units_sold: 20, gross_margin_pct: 0.30 },
      { date: "2025-07-02", store_id: 1, department_id: 2, net_sales: 55, transactions: 6, units_sold: 22, gross_margin_pct: 0.30 },
      // Department 7 in store 3 only
      { date: "2025-07-01", store_id: 3, department_id: 7, net_sales: 800, transactions: 80, units_sold: 320, gross_margin_pct: 0.25 },
      { date: "2025-07-02", store_id: 3, department_id: 7, net_sales: 820, transactions: 82, units_sold: 328, gross_margin_pct: 0.25 },
      { date: "2025-07-03", store_id: 3, department_id: 7, net_sales: 810, transactions: 81, units_sold: 324, gross_margin_pct: 0.25 },
    ],
  };

  it("aggregates KPIs across all matching rows for the requested department", () => {
    const shaped = shapeDepartmentData(1, sampleMetrics, sampleDimStores);
    expect(shaped.departmentId).toBe(1);
    expect(shaped.departmentName).toBe("Produce");
    expect(shaped.totalSales).toBe(630);
    expect(shaped.totalTransactions).toBe(63);
    expect(shaped.totalUnitsSold).toBe(252);
    expect(shaped.storeCoverage).toBe(2);
    expect(shaped.avgGrossMarginPct).toBeCloseTo(0.50, 5);
  });

  it("computes average daily sales across the distinct dates the department appears", () => {
    const shaped = shapeDepartmentData(1, sampleMetrics, sampleDimStores);
    expect(shaped.avgDailySales).toBeCloseTo(315, 5);
  });

  it("composes a per-store breakdown sorted by sales descending, scoped to stores carrying the department", () => {
    const shaped = shapeDepartmentData(1, sampleMetrics, sampleDimStores);
    expect(shaped.byStore).toHaveLength(2);
    expect(shaped.byStore.map((s) => s.storeId)).toEqual([2, 1]);
    expect(shaped.byStore[0].totalSales).toBe(420);
    expect(shaped.byStore[0].storeName).toBe("Knot Shore — Bravo");
    expect(shaped.byStore[0].tradeAreaProfile).toBe("urban-dense");
  });

  it("composes a daily trend sorted chronologically", () => {
    const shaped = shapeDepartmentData(1, sampleMetrics, sampleDimStores);
    expect(shaped.trend).toEqual([
      { date: "2025-07-01", totalSales: 300 },
      { date: "2025-07-02", totalSales: 330 },
    ]);
  });

  it("computes revenue share against total department sales across all rows", () => {
    const shaped = shapeDepartmentData(7, sampleMetrics, sampleDimStores);
    const totalAllDepts = sampleMetrics.items.reduce((s, i) => s + i.net_sales, 0);
    expect(shaped.revenueShare).toBeCloseTo(2430 / totalAllDepts, 5);
  });

  it("reports window start and end from min/max dates of the department's own rows", () => {
    const shaped = shapeDepartmentData(7, sampleMetrics, sampleDimStores);
    expect(shaped.windowStart).toBe("2025-07-01");
    expect(shaped.windowEnd).toBe("2025-07-03");
  });

  it("returns zero aggregates and empty breakdowns when the department has no rows", () => {
    const shaped = shapeDepartmentData(5, sampleMetrics, sampleDimStores);
    expect(shaped.totalSales).toBe(0);
    expect(shaped.totalTransactions).toBe(0);
    expect(shaped.storeCoverage).toBe(0);
    expect(shaped.byStore).toEqual([]);
    expect(shaped.trend).toEqual([]);
    expect(shaped.windowStart).toBeNull();
    expect(shaped.windowEnd).toBeNull();
  });

  it("throws when departmentId is not in the reference taxonomy", () => {
    expect(() => shapeDepartmentData(99, sampleMetrics, sampleDimStores)).toThrow(
      /Department 99 not found/,
    );
  });
});

describe("shapeDepartmentData PoP/YoY deltas", () => {
  const sampleDimStores = [
    { store_id: 1, store_name: "Knot Shore — Alpha", trade_area_profile: "suburban-family" },
  ];

  // A full 18-month window (Jul 2024 – Dec 2025) so the period helper
  // derives recent (Jul–Dec 2025), pop (Jan–Jun 2025), and yoy
  // (Jul–Dec 2024). Department 1 has rows in all three periods.
  // Department 2 appears only in the recent period, so its prior-period
  // comparisons have no baseline — the missing-prior-period case.
  const fullWindowMetrics = {
    total: 8,
    items: [
      // Department 1 — year-over-year period (Jul–Dec 2024)
      { date: "2024-07-01", store_id: 1, department_id: 1, net_sales: 100, transactions: 10, units_sold: 40, gross_margin_pct: 0.5 },
      { date: "2024-12-01", store_id: 1, department_id: 1, net_sales: 100, transactions: 10, units_sold: 40, gross_margin_pct: 0.5 },
      // Department 1 — prior period (Jan–Jun 2025)
      { date: "2025-01-01", store_id: 1, department_id: 1, net_sales: 200, transactions: 20, units_sold: 80, gross_margin_pct: 0.5 },
      { date: "2025-06-01", store_id: 1, department_id: 1, net_sales: 200, transactions: 20, units_sold: 80, gross_margin_pct: 0.5 },
      // Department 1 — recent period (Jul–Dec 2025)
      { date: "2025-07-01", store_id: 1, department_id: 1, net_sales: 300, transactions: 30, units_sold: 120, gross_margin_pct: 0.5 },
      { date: "2025-12-01", store_id: 1, department_id: 1, net_sales: 300, transactions: 30, units_sold: 120, gross_margin_pct: 0.5 },
      // Department 2 — recent period only, absent in 2024 and H1 2025
      { date: "2025-08-01", store_id: 1, department_id: 2, net_sales: 500, transactions: 50, units_sold: 200, gross_margin_pct: 0.3 },
      { date: "2025-09-01", store_id: 1, department_id: 2, net_sales: 500, transactions: 50, units_sold: 200, gross_margin_pct: 0.3 },
    ],
  };

  it("computes proportional PoP and YoY deltas for sales, transactions, and avg daily sales", () => {
    const { kpiDeltas } = shapeDepartmentData(1, fullWindowMetrics, sampleDimStores);
    // recent 600 vs pop 400 vs yoy 200
    expect(kpiDeltas.totalSales.pop).toBeCloseTo(0.5, 5);
    expect(kpiDeltas.totalSales.yoy).toBeCloseTo(2.0, 5);
    // recent 60 vs pop 40 vs yoy 20
    expect(kpiDeltas.totalTransactions.pop).toBeCloseTo(0.5, 5);
    expect(kpiDeltas.totalTransactions.yoy).toBeCloseTo(2.0, 5);
    // recent 300/day vs pop 200/day vs yoy 100/day
    expect(kpiDeltas.avgDailySales.pop).toBeCloseTo(0.5, 5);
    expect(kpiDeltas.avgDailySales.yoy).toBeCloseTo(2.0, 5);
  });

  it("aggregates each period from its own calendar slice", () => {
    // YoY must count only the two 2024 rows (200) and PoP only the two
    // H1-2025 rows (400); a delta that swept the whole window would not
    // land on these ratios.
    const { kpiDeltas } = shapeDepartmentData(1, fullWindowMetrics, sampleDimStores);
    expect(kpiDeltas.totalSales.yoy).toBeCloseTo((600 - 200) / 200, 5);
    expect(kpiDeltas.totalSales.pop).toBeCloseTo((600 - 400) / 400, 5);
  });

  it("computes revenue-share deltas against per-period all-department sales", () => {
    // recent share 600/1600 = 0.375; pop share 400/400 = 1.0; yoy 200/200 = 1.0
    const { kpiDeltas } = shapeDepartmentData(1, fullWindowMetrics, sampleDimStores);
    expect(kpiDeltas.revenueShare.pop).toBeCloseTo((0.375 - 1) / 1, 5);
    expect(kpiDeltas.revenueShare.yoy).toBeCloseTo((0.375 - 1) / 1, 5);
  });

  it("returns null deltas when the department has no rows in a comparison period", () => {
    const { kpiDeltas } = shapeDepartmentData(2, fullWindowMetrics, sampleDimStores);
    expect(kpiDeltas.totalSales.pop).toBeNull();
    expect(kpiDeltas.totalSales.yoy).toBeNull();
    expect(kpiDeltas.totalTransactions.pop).toBeNull();
    expect(kpiDeltas.totalTransactions.yoy).toBeNull();
    expect(kpiDeltas.avgDailySales.pop).toBeNull();
    expect(kpiDeltas.avgDailySales.yoy).toBeNull();
  });

  it("returns null revenue-share deltas when the prior-period baseline is zero", () => {
    const { kpiDeltas } = shapeDepartmentData(2, fullWindowMetrics, sampleDimStores);
    expect(kpiDeltas.revenueShare.pop).toBeNull();
    expect(kpiDeltas.revenueShare.yoy).toBeNull();
  });

  it("returns null deltas for every KPI when the department is absent entirely", () => {
    const { kpiDeltas } = shapeDepartmentData(3, fullWindowMetrics, sampleDimStores);
    for (const delta of [
      kpiDeltas.totalSales,
      kpiDeltas.totalTransactions,
      kpiDeltas.avgDailySales,
      kpiDeltas.revenueShare,
    ]) {
      expect(delta.pop).toBeNull();
      expect(delta.yoy).toBeNull();
    }
  });

  it("returns null deltas when the window is too short to derive comparison periods", () => {
    const shortWindow = {
      total: 1,
      items: [
        { date: "2025-07-15", store_id: 1, department_id: 1, net_sales: 100, transactions: 10, units_sold: 40, gross_margin_pct: 0.5 },
      ],
    };
    const { kpiDeltas } = shapeDepartmentData(1, shortWindow, sampleDimStores);
    expect(kpiDeltas.totalSales.pop).toBeNull();
    expect(kpiDeltas.totalSales.yoy).toBeNull();
  });
});
