/**
 * Server-side departments index data fetcher and shaper for the
 * /departments listing page.
 *
 * fetchDepartmentsIndexData() aggregates department-metrics across all
 * stores and dates into a per-department summary the index renders.
 * shapeDepartmentsIndexData() is the pure transform separated for
 * unit testing.
 *
 * Department names come from the hardcoded reference table in
 * lib/dim-departments — the upstream api does not expose a
 * /dim-departments endpoint and the taxonomy is small and stable.
 *
 * Totals are computed across the entire available window of the
 * department-metrics fixture (currently Jul–Dec 2025), not the
 * 18-month window store-metrics covers. The window-source field on
 * each entry surfaces this so the index page can describe what the
 * totals mean.
 */

import {
  loadFullWindowDepartmentMetrics,
  type DepartmentMetricsRaw,
} from "@/lib/store-metrics-loader";
import { DEPARTMENT_NAMES, getDepartmentName } from "@/lib/dim-departments";

export interface DepartmentsIndexEntry {
  departmentId: number;
  departmentName: string;
  totalSales: number;
  totalTransactions: number;
  totalUnitsSold: number;
  storeCoverage: number;
  avgGrossMarginPct: number;
}

export interface DepartmentsIndexResult {
  entries: DepartmentsIndexEntry[];
  windowStart: string | null;
  windowEnd: string | null;
}

export function shapeDepartmentsIndexData(
  deptMetrics: DepartmentMetricsRaw,
): DepartmentsIndexResult {
  const salesById = new Map<number, number>();
  const txnsById = new Map<number, number>();
  const unitsById = new Map<number, number>();
  const storesById = new Map<number, Set<number>>();
  const marginSumById = new Map<number, number>();
  const marginCountById = new Map<number, number>();
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const item of deptMetrics.items ?? []) {
    salesById.set(item.department_id, (salesById.get(item.department_id) ?? 0) + item.net_sales);
    txnsById.set(
      item.department_id,
      (txnsById.get(item.department_id) ?? 0) + item.transactions,
    );
    unitsById.set(
      item.department_id,
      (unitsById.get(item.department_id) ?? 0) + item.units_sold,
    );
    let stores = storesById.get(item.department_id);
    if (!stores) {
      stores = new Set<number>();
      storesById.set(item.department_id, stores);
    }
    stores.add(item.store_id);
    if (typeof item.gross_margin_pct === "number") {
      marginSumById.set(
        item.department_id,
        (marginSumById.get(item.department_id) ?? 0) + item.gross_margin_pct,
      );
      marginCountById.set(
        item.department_id,
        (marginCountById.get(item.department_id) ?? 0) + 1,
      );
    }
    if (minDate === null || item.date < minDate) minDate = item.date;
    if (maxDate === null || item.date > maxDate) maxDate = item.date;
  }

  const departmentIds = Object.keys(DEPARTMENT_NAMES)
    .map((id) => Number(id))
    .sort((a, b) => a - b);

  const entries: DepartmentsIndexEntry[] = departmentIds.map((id) => {
    const marginCount = marginCountById.get(id) ?? 0;
    return {
      departmentId: id,
      departmentName: getDepartmentName(id),
      totalSales: salesById.get(id) ?? 0,
      totalTransactions: txnsById.get(id) ?? 0,
      totalUnitsSold: unitsById.get(id) ?? 0,
      storeCoverage: storesById.get(id)?.size ?? 0,
      avgGrossMarginPct:
        marginCount === 0 ? 0 : (marginSumById.get(id) ?? 0) / marginCount,
    };
  });

  return { entries, windowStart: minDate, windowEnd: maxDate };
}

export async function fetchDepartmentsIndexData(): Promise<DepartmentsIndexResult> {
  const deptMetrics = await loadFullWindowDepartmentMetrics();
  return shapeDepartmentsIndexData(deptMetrics);
}
