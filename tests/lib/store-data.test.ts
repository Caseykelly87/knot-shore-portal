import { describe, it, expect } from "vitest";
import { shapeStoreData } from "@/lib/store-data";

describe("shapeStoreData", () => {
  const sampleDimStores = [
    {
      store_id: 1,
      store_name: "Knot Shore — Kirkwood",
      address: "10250 Manchester Rd",
      city: "Kirkwood",
      zip: "63122",
      county_fips: "29189",
      trade_area_profile: "suburban-family",
      sqft: 45000,
      open_date: "2009-04-15",
      base_daily_revenue: 95000.0,
    },
  ];

  // Build 184 days of current-year metrics for store 1
  const buildDays = (year: number) => {
    const items: Array<{
      date: string;
      store_id: number;
      total_sales: number;
      transaction_count: number;
      avg_basket_size: number;
      labor_cost_pct: number;
    }> = [];
    const startMonth = 7;
    const endMonth = 12;
    for (let m = startMonth; m <= endMonth; m++) {
      const daysInMonth = m === 7 || m === 8 || m === 10 || m === 12 ? 31 : 30;
      for (let d = 1; d <= daysInMonth; d++) {
        items.push({
          date: `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
          store_id: 1,
          total_sales: 60000 + ((d + m) % 7) * 1000,
          transaction_count: 1500 + ((d + m) % 5) * 100,
          avg_basket_size: 35,
          labor_cost_pct: 0.105,
        });
      }
    }
    return items;
  };

  const sampleStoreMetrics = {
    total: 184,
    items: buildDays(2025),
  };

  const samplePriorYearMetrics = {
    total: 184,
    items: buildDays(2024).map((i) => ({ ...i, total_sales: i.total_sales - 5000 })),
  };

  // 184 days × 10 departments = 1,840 rows for store 1
  const sampleDeptMetrics = {
    total: 1840,
    items: (() => {
      const out: Array<{
        date: string;
        store_id: number;
        department_id: number;
        net_sales: number;
        transactions: number;
        units_sold: number;
        gross_margin_pct: number;
      }> = [];
      for (const day of buildDays(2025)) {
        for (let dept = 1; dept <= 10; dept++) {
          out.push({
            date: day.date,
            store_id: 1,
            department_id: dept,
            net_sales: 5000 + dept * 100,
            transactions: 200,
            units_sold: 600,
            gross_margin_pct: 0.35,
          });
        }
      }
      return out;
    })(),
  };

  const sampleAnomalies = {
    total: 2,
    items: [
      {
        date: "2025-07-15",
        store_id: 1,
        rule_id: "revenue_band",
        actual_value: 80000,
        expected_low: 50000,
        expected_high: 70000,
        distance_from_band: 10000,
        severity_score: 0.2,
        severity_level: "warning",
      },
      {
        date: "2025-08-22",
        store_id: 1,
        rule_id: "transactions_band",
        actual_value: 2900,
        expected_low: 1700,
        expected_high: 2800,
        distance_from_band: 100,
        severity_score: 0.05,
        severity_level: "info",
      },
    ],
  };

  it("returns store metadata from dim_stores", () => {
    const shaped = shapeStoreData(
      1,
      sampleDimStores,
      sampleStoreMetrics,
      samplePriorYearMetrics,
      sampleDeptMetrics,
      sampleAnomalies,
    );
    expect(shaped.storeId).toBe(1);
    expect(shaped.storeName).toBe("Knot Shore — Kirkwood");
    expect(shaped.city).toBe("Kirkwood");
    expect(shaped.tradeAreaProfile).toBe("suburban-family");
    expect(shaped.sqft).toBe(45000);
    expect(shaped.openDate).toBe("2009-04-15");
  });

  it("computes total sales, transactions, and exception count from current-year metrics", () => {
    const shaped = shapeStoreData(
      1,
      sampleDimStores,
      sampleStoreMetrics,
      samplePriorYearMetrics,
      sampleDeptMetrics,
      sampleAnomalies,
    );
    const expectedSales = sampleStoreMetrics.items.reduce((sum, r) => sum + r.total_sales, 0);
    const expectedTransactions = sampleStoreMetrics.items.reduce(
      (sum, r) => sum + r.transaction_count,
      0,
    );
    expect(shaped.totalSales).toBe(expectedSales);
    expect(shaped.totalTransactions).toBe(expectedTransactions);
    expect(shaped.activeExceptions).toBe(2);
    expect(shaped.avgLaborCostPct).toBeCloseTo(0.105, 4);
  });

  it("composes department mix with revenue shares summing to ~1.0", () => {
    const shaped = shapeStoreData(
      1,
      sampleDimStores,
      sampleStoreMetrics,
      samplePriorYearMetrics,
      sampleDeptMetrics,
      sampleAnomalies,
    );
    expect(shaped.departmentMix).toHaveLength(10);
    expect(shaped.departmentMix[0]).toMatchObject({
      departmentId: 1,
      departmentName: "Produce",
    });
    const sumShares = shaped.departmentMix.reduce((sum, d) => sum + d.revenueShare, 0);
    expect(sumShares).toBeCloseTo(1.0, 5);
  });

  it("composes year-over-year trend aligned by month-day", () => {
    const shaped = shapeStoreData(
      1,
      sampleDimStores,
      sampleStoreMetrics,
      samplePriorYearMetrics,
      sampleDeptMetrics,
      sampleAnomalies,
    );
    expect(shaped.yoyTrend.length).toBe(184);
    const firstPoint = shaped.yoyTrend[0];
    expect(firstPoint.monthDay).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    expect(firstPoint.monthDay).toBe("Jul 1");
    expect(firstPoint.currentYearSales).toBeGreaterThan(0);
    expect(firstPoint.priorYearSales).toBeGreaterThan(0);
    // Month-day alignment: prior-year value for Jul 1 should be 5000 less
    expect(firstPoint.currentYearSales - firstPoint.priorYearSales!).toBe(5000);
  });

  it("returns store-specific anomalies with synthesized descriptions", () => {
    const shaped = shapeStoreData(
      1,
      sampleDimStores,
      sampleStoreMetrics,
      samplePriorYearMetrics,
      sampleDeptMetrics,
      sampleAnomalies,
    );
    expect(shaped.anomalies).toHaveLength(2);
    expect(shaped.anomalies[0].severity).toBe("warning");
    expect(shaped.anomalies[0].ruleId).toBe("revenue_band");
    expect(shaped.anomalies[0].description).toContain("$80,000");
    expect(shaped.anomalies[0].description).toContain("$50,000");
    expect(shaped.anomalies[1].description).toContain("2,900");
  });

  it("returns top 5 departments sorted by revenue", () => {
    const shaped = shapeStoreData(
      1,
      sampleDimStores,
      sampleStoreMetrics,
      samplePriorYearMetrics,
      sampleDeptMetrics,
      sampleAnomalies,
    );
    expect(shaped.topDepartments).toHaveLength(5);
    // Higher dept_id has higher net_sales in sample data
    expect(shaped.topDepartments[0].departmentId).toBe(10);
    expect(shaped.topDepartments[0].totalSales).toBeGreaterThan(shaped.topDepartments[4].totalSales);
  });

  it("throws when storeId is not in dim_stores", () => {
    expect(() =>
      shapeStoreData(
        99,
        sampleDimStores,
        sampleStoreMetrics,
        samplePriorYearMetrics,
        sampleDeptMetrics,
        sampleAnomalies,
      ),
    ).toThrow(/Store 99 not found/);
  });

  it("handles empty prior-year metrics gracefully", () => {
    const shaped = shapeStoreData(
      1,
      sampleDimStores,
      sampleStoreMetrics,
      { total: 0, items: [] },
      sampleDeptMetrics,
      sampleAnomalies,
    );
    expect(shaped.yoyTrend.length).toBe(184);
    expect(shaped.yoyTrend.every((p) => p.priorYearSales === null)).toBe(true);
  });

  it("handles empty anomalies", () => {
    const shaped = shapeStoreData(
      1,
      sampleDimStores,
      sampleStoreMetrics,
      samplePriorYearMetrics,
      sampleDeptMetrics,
      { total: 0, items: [] },
    );
    expect(shaped.anomalies).toEqual([]);
    expect(shaped.activeExceptions).toBe(0);
  });
});
