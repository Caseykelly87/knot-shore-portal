import { describe, it, expect } from "vitest";
import { shapeDepartmentsIndexData } from "@/lib/departments-index-data";
import { DEPARTMENT_NAMES } from "@/lib/dim-departments";

describe("shapeDepartmentsIndexData", () => {
  const sampleMetrics = {
    total: 8,
    items: [
      // Department 1 in 2 stores across 2 days
      { date: "2025-07-01", store_id: 1, department_id: 1, net_sales: 100, transactions: 10, units_sold: 50, gross_margin_pct: 0.40 },
      { date: "2025-07-01", store_id: 2, department_id: 1, net_sales: 150, transactions: 12, units_sold: 60, gross_margin_pct: 0.40 },
      { date: "2025-07-02", store_id: 1, department_id: 1, net_sales: 110, transactions: 11, units_sold: 55, gross_margin_pct: 0.40 },
      { date: "2025-07-02", store_id: 2, department_id: 1, net_sales: 160, transactions: 13, units_sold: 62, gross_margin_pct: 0.40 },
      // Department 2 in 1 store
      { date: "2025-07-01", store_id: 1, department_id: 2, net_sales: 200, transactions: 20, units_sold: 80, gross_margin_pct: 0.30 },
      { date: "2025-07-02", store_id: 1, department_id: 2, net_sales: 210, transactions: 21, units_sold: 82, gross_margin_pct: 0.30 },
      // Department 7 in 1 store
      { date: "2025-07-01", store_id: 2, department_id: 7, net_sales: 500, transactions: 50, units_sold: 200, gross_margin_pct: 0.26 },
      { date: "2025-07-02", store_id: 2, department_id: 7, net_sales: 520, transactions: 51, units_sold: 205, gross_margin_pct: 0.26 },
    ],
  };

  it("returns one entry per known department from the reference taxonomy", () => {
    const { entries } = shapeDepartmentsIndexData(sampleMetrics);
    expect(entries).toHaveLength(Object.keys(DEPARTMENT_NAMES).length);
    expect(entries.map((e) => e.departmentId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("aggregates sales, transactions, and units per department", () => {
    const { entries } = shapeDepartmentsIndexData(sampleMetrics);
    const dept1 = entries.find((e) => e.departmentId === 1)!;
    expect(dept1.totalSales).toBe(520);
    expect(dept1.totalTransactions).toBe(46);
    expect(dept1.totalUnitsSold).toBe(227);
    const dept2 = entries.find((e) => e.departmentId === 2)!;
    expect(dept2.totalSales).toBe(410);
    expect(dept2.totalTransactions).toBe(41);
  });

  it("counts distinct stores carrying each department", () => {
    const { entries } = shapeDepartmentsIndexData(sampleMetrics);
    expect(entries.find((e) => e.departmentId === 1)!.storeCoverage).toBe(2);
    expect(entries.find((e) => e.departmentId === 2)!.storeCoverage).toBe(1);
    expect(entries.find((e) => e.departmentId === 7)!.storeCoverage).toBe(1);
  });

  it("returns zero totals and zero coverage for departments absent from metrics", () => {
    const { entries } = shapeDepartmentsIndexData(sampleMetrics);
    const dept3 = entries.find((e) => e.departmentId === 3)!;
    expect(dept3.totalSales).toBe(0);
    expect(dept3.totalTransactions).toBe(0);
    expect(dept3.totalUnitsSold).toBe(0);
    expect(dept3.storeCoverage).toBe(0);
    expect(dept3.avgGrossMarginPct).toBe(0);
  });

  it("carries department names from the reference taxonomy", () => {
    const { entries } = shapeDepartmentsIndexData(sampleMetrics);
    expect(entries.find((e) => e.departmentId === 1)!.departmentName).toBe("Produce");
    expect(entries.find((e) => e.departmentId === 7)!.departmentName).toBe(
      "Grocery (Center Store)",
    );
  });

  it("averages gross margin across metric rows", () => {
    const { entries } = shapeDepartmentsIndexData(sampleMetrics);
    expect(entries.find((e) => e.departmentId === 1)!.avgGrossMarginPct).toBeCloseTo(0.40, 5);
    expect(entries.find((e) => e.departmentId === 7)!.avgGrossMarginPct).toBeCloseTo(0.26, 5);
  });

  it("reports window start and end from min/max dates", () => {
    const { windowStart, windowEnd } = shapeDepartmentsIndexData(sampleMetrics);
    expect(windowStart).toBe("2025-07-01");
    expect(windowEnd).toBe("2025-07-02");
  });

  it("handles empty metrics by returning zeroed entries", () => {
    const { entries, windowStart, windowEnd } = shapeDepartmentsIndexData({
      total: 0,
      items: [],
    });
    expect(entries).toHaveLength(10);
    expect(entries.every((e) => e.totalSales === 0)).toBe(true);
    expect(entries.every((e) => e.storeCoverage === 0)).toBe(true);
    expect(windowStart).toBeNull();
    expect(windowEnd).toBeNull();
  });
});
