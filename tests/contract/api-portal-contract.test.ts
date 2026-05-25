import { describe, it, expect } from "vitest";
import {
  loadStoreMetricsFixture,
  loadAnomaliesFixture,
  loadDashboardSummaryFixture,
  loadDimStoresFixture,
  loadDepartmentMetricsFixture,
} from "@/lib/fixture-loader";
import { shapeDashboardData } from "@/lib/dashboard-data";
import { shapeStoresIndexData } from "@/lib/stores-index-data";
import { shapeDepartmentsIndexData } from "@/lib/departments-index-data";
import { shapeExceptionsData, applyFilters } from "@/lib/exceptions-data";
import { shapeStoreData } from "@/lib/store-data";

/**
 * API -> portal contract tests.
 *
 * The bundled JSON fixtures are captured API responses, byte-identical
 * with what the API serves in online mode. The upstream chain pins the
 * same canonical dataset layer by layer: the ETL contract tests pin
 * sim engine -> ETL, the API contract tests pin ETL -> API. These tests
 * pin the final hop, API response -> portal-derived values: each loads
 * a bundled fixture, runs it through the portal's data shaper, and
 * asserts specific values computed from the known canonical dataset.
 *
 * A failure here means either a fixture drifted off the canonical
 * dataset or a shaper silently changed how it derives a value — which
 * is the signal these tests exist to surface.
 */
describe("API -> portal contract", () => {
  describe("dashboard surface", () => {
    it("shapes the canonical dashboard view model from the bundled fixtures", () => {
      const data = shapeDashboardData(
        loadAnomaliesFixture(),
        loadStoreMetricsFixture(),
        loadDimStoresFixture(),
      );

      // Full-window aggregates over all 2944 store-day rows.
      expect(data.totalSales).toBeCloseTo(230554446.9, 2);
      expect(data.totalTransactions).toBe(7003496);
      expect(data.windowStartDate).toBe("2024-07-01");
      expect(data.windowEndDate).toBe("2025-12-31");

      // Every anomaly flag is an active exception; the canonical set
      // carries 894 across all three severity levels. The single
      // critical row is the revenue_zscore_28d flag at store 4 on
      // 2024-09-24 (|z| ≈ 4.02).
      expect(data.activeExceptions).toBe(894);
      expect(data.exceptionSeverityCounts).toEqual({
        info: 815,
        warning: 78,
        critical: 1,
      });

      // Top store over the full window is store 2 (Chesterfield),
      // capped at five entries and ranked descending.
      expect(data.topStores).toHaveLength(5);
      expect(data.topStores[0].storeId).toBe("2");
      expect(data.topStores[0].storeName).toBe("Knot Shore — Chesterfield");
      expect(data.topStores[0].totalSales).toBeCloseTo(43079265.51, 2);
      for (let i = 1; i < data.topStores.length; i++) {
        expect(data.topStores[i].totalSales).toBeLessThanOrEqual(
          data.topStores[i - 1].totalSales,
        );
      }

      // The window spans the two H2 slices (2024 and 2025), 368 days.
      expect(data.dailyTrend).toHaveLength(368);

      // The canonical dataset is two H2 slices a year apart with no
      // first-half-2025 data, so the prior-period (H1 2025) comparison
      // has no baseline and the PoP delta is null while YoY is live.
      expect(data.periods).not.toBeNull();
      expect(data.periods!.recent).toEqual({ start: "2025-07-01", end: "2025-12-31" });
      expect(data.periods!.yoy).toEqual({ start: "2024-07-01", end: "2024-12-31" });
      expect(data.kpiDeltas.totalSales.popDelta).toBeNull();
      expect(data.kpiDeltas.totalSales.yoyDelta).not.toBeNull();
    });
  });

  describe("stores surface", () => {
    it("shapes the canonical stores index from the bundled fixtures", () => {
      const entries = shapeStoresIndexData(
        loadDimStoresFixture(),
        loadStoreMetricsFixture(),
        loadAnomaliesFixture(),
      );

      // One entry per store, sorted by store id.
      expect(entries.map((e) => e.storeId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

      // Every anomaly flag is attributed to a store, so the per-store
      // exception counts sum back to the canonical 894.
      const exceptionTotal = entries.reduce((sum, e) => sum + e.exceptionCount, 0);
      expect(exceptionTotal).toBe(894);

      // The per-store sales sum equals the dashboard's full-window
      // total: both aggregate the same store-metrics fixture.
      const salesTotal = entries.reduce((sum, e) => sum + e.totalSales, 0);
      expect(salesTotal).toBeCloseTo(230554446.9, 2);

      const store1 = entries.find((e) => e.storeId === 1)!;
      expect(store1.totalSales).toBeCloseTo(37182419.48, 2);
      expect(store1.totalTransactions).toBe(982814);
      expect(store1.exceptionCount).toBe(112);
      expect(store1.severityCounts).toEqual({ info: 107, warning: 5, critical: 0 });

      // Store 7 carries warning-severity flags from both the band rules
      // and the structural department_coverage rule.
      const store7 = entries.find((e) => e.storeId === 7)!;
      expect(store7.severityCounts).toEqual({ info: 177, warning: 17, critical: 0 });
    });
  });

  describe("departments surface", () => {
    it("shapes the canonical departments index from the bundled fixture", () => {
      const { entries, windowStart, windowEnd } = shapeDepartmentsIndexData(
        loadDepartmentMetricsFixture(),
      );

      // One entry per department in the fixed 10-department taxonomy.
      expect(entries.map((e) => e.departmentId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(windowStart).toBe("2024-07-01");
      expect(windowEnd).toBe("2025-12-31");

      // Grocery (Center Store) is the largest department; it and
      // Produce both stock all eight stores.
      const grocery = entries.find((e) => e.departmentId === 7)!;
      expect(grocery.departmentName).toBe("Grocery (Center Store)");
      expect(grocery.totalSales).toBeCloseTo(59086368.18, 2);
      expect(grocery.totalTransactions).toBe(1786822);
      expect(grocery.totalUnitsSold).toBe(8029262);
      expect(grocery.storeCoverage).toBe(8);

      const produce = entries.find((e) => e.departmentId === 1)!;
      expect(produce.departmentName).toBe("Produce");
      expect(produce.totalSales).toBeCloseTo(25467342.83, 2);
      expect(produce.storeCoverage).toBe(8);
    });
  });

  describe("exceptions surface", () => {
    it("shapes the canonical exceptions table from the bundled fixtures", () => {
      const data = shapeExceptionsData(loadAnomaliesFixture(), loadDimStoresFixture());

      expect(data.rows).toHaveLength(894);

      // The canonical set fires five rule families across all eight
      // stores. With the revenue_zscore_28d rule now contributing the
      // platform's first critical-severity row, all three severity
      // levels are present.
      expect(data.uniqueSeverities).toEqual(["critical", "info", "warning"]);
      expect(data.uniqueRules).toEqual([
        "department_coverage",
        "revenue_band",
        "revenue_zscore_28d",
        "transactions_band",
        "yoy_comp",
      ]);
      expect(data.uniqueStores).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

      // Rows sort by severity: the single critical row leads, every
      // warning precedes every info.
      expect(data.rows[0].severity).toBe("critical");
      expect(data.rows[0].ruleId).toBe("revenue_zscore_28d");
      const firstInfoIndex = data.rows.findIndex((r) => r.severity === "info");
      expect(firstInfoIndex).toBeGreaterThan(0);
      expect(
        data.rows
          .slice(1, firstInfoIndex)
          .every((r) => r.severity === "warning"),
      ).toBe(true);

      // The 78 warning and 815 info flags filter out exactly, matching
      // the dashboard's severity breakdown.
      expect(applyFilters(data.rows, { severities: ["critical"] })).toHaveLength(1);
      expect(applyFilters(data.rows, { severities: ["warning"] })).toHaveLength(78);
      expect(applyFilters(data.rows, { severities: ["info"] })).toHaveLength(815);
    });
  });

  describe("cross-grain reconciliation", () => {
    it("reconciles department net_sales against store total_sales", () => {
      const storeItems = loadStoreMetricsFixture().items;
      const deptItems = loadDepartmentMetricsFixture().items;

      const storeTotal = storeItems.reduce((sum, r) => sum + r.total_sales, 0);
      const deptTotal = deptItems.reduce((sum, r) => sum + r.net_sales, 0);

      // Department metrics aggregate to the store grain. The bundled
      // department-metrics fixture has a small number of store-days
      // with irregular department-row coverage (see __TESTING_NOTES.md),
      // so the aggregate gap is non-zero but well under 0.1% — a real
      // portal aggregation bug would diverge far past that.
      const relativeGap = Math.abs(storeTotal - deptTotal) / storeTotal;
      expect(relativeGap).toBeLessThan(0.001);

      // Per store-day, the ten department net_sales rows sum to that
      // store-day's total_sales. This holds exactly for the large
      // majority of the 2944 store-days.
      const deptByKey = new Map<string, number>();
      for (const r of deptItems) {
        const key = `${r.date}|${r.store_id}`;
        deptByKey.set(key, (deptByKey.get(key) ?? 0) + r.net_sales);
      }
      let reconciled = 0;
      for (const r of storeItems) {
        const deptSum = deptByKey.get(`${r.date}|${r.store_id}`);
        if (deptSum !== undefined && Math.abs(deptSum - r.total_sales) < 0.01) {
          reconciled += 1;
        }
      }
      expect(reconciled / storeItems.length).toBeGreaterThan(0.95);
    });
  });

  describe("cross-endpoint reconciliation", () => {
    it("reconciles portal recent-window aggregates with the dashboard-summary endpoint", () => {
      const summary = loadDashboardSummaryFixture();
      const dashboard = shapeDashboardData(
        loadAnomaliesFixture(),
        loadStoreMetricsFixture(),
        loadDimStoresFixture(),
      );

      // The /dashboard-summary endpoint pre-aggregates the recent
      // window (H2 2025). The portal derives the same recent-period
      // KPIs itself from the /store-metrics endpoint; the two
      // independent paths must land on the same totals.
      expect(dashboard.kpiDeltas.totalSales.recent).toBe(summary.total_sales);
      expect(dashboard.kpiDeltas.totalTransactions.recent).toBe(summary.total_transactions);
      expect(dashboard.kpiDeltas.avgLaborCostPct.recent).toBeCloseTo(
        summary.average_labor_cost_pct!,
        5,
      );

      // The store drilldown's recent-window total for store 1 matches
      // that store's entry in the endpoint's top-stores ranking.
      const store1 = shapeStoreData(
        1,
        loadDimStoresFixture(),
        loadStoreMetricsFixture(),
        loadStoreMetricsFixture(),
        loadDepartmentMetricsFixture(),
        loadAnomaliesFixture(),
      );
      const store1Ranked = summary.top_stores_by_revenue.find((s) => s.store_id === 1)!;
      expect(store1.totalSales).toBeCloseTo(store1Ranked.total_sales, 2);
    });
  });
});
