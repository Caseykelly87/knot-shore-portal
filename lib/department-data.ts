/**
 * Server-side per-department data fetcher and shape transformer for
 * the drilldown page at /departments/[id].
 *
 * fetchDepartmentData(deptId) loads the department-metrics fixture
 * and the dim-stores reference table; shapeDepartmentData() composes
 * a view model with KPI aggregates, a per-store breakdown, and a
 * daily trend across the available window.
 *
 * The department-metrics fixture covers Jul–Dec 2025 (the recent half
 * of the canonical 18-month store-metrics window). Aggregates here
 * describe that window, not the full 18 months.
 */

import { getApiMode } from "@/lib/api-mode";
import { getBaseUrl } from "@/lib/get-base-url";
import {
  loadFullWindowDepartmentMetrics,
  type DepartmentMetricsRaw,
} from "@/lib/store-metrics-loader";
import { DEPARTMENT_NAMES, getDepartmentName } from "@/lib/dim-departments";

export interface DepartmentByStoreBreakdown {
  storeId: number;
  storeName: string;
  tradeAreaProfile: string;
  totalSales: number;
  totalTransactions: number;
}

export interface DepartmentTrendPoint {
  date: string;
  totalSales: number;
}

export interface DepartmentData {
  departmentId: number;
  departmentName: string;
  totalSales: number;
  totalTransactions: number;
  totalUnitsSold: number;
  avgGrossMarginPct: number;
  storeCoverage: number;
  avgDailySales: number;
  revenueShare: number;
  windowStart: string | null;
  windowEnd: string | null;
  byStore: DepartmentByStoreBreakdown[];
  trend: DepartmentTrendPoint[];
}

interface DimStoreRaw {
  store_id: number;
  store_name: string;
  trade_area_profile: string;
}

export function isValidDepartmentId(id: number): boolean {
  return Object.prototype.hasOwnProperty.call(DEPARTMENT_NAMES, id);
}

export function shapeDepartmentData(
  departmentId: number,
  deptMetrics: DepartmentMetricsRaw,
  dimStores: DimStoreRaw[],
): DepartmentData {
  if (!isValidDepartmentId(departmentId)) {
    throw new Error(`Department ${departmentId} not found`);
  }

  const items = (deptMetrics.items ?? []).filter((i) => i.department_id === departmentId);
  const allItems = deptMetrics.items ?? [];

  let totalSales = 0;
  let totalTransactions = 0;
  let totalUnitsSold = 0;
  let marginSum = 0;
  let marginCount = 0;
  const distinctDates = new Set<string>();
  const salesByStore = new Map<number, number>();
  const txnsByStore = new Map<number, number>();
  const salesByDate = new Map<string, number>();
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const item of items) {
    totalSales += item.net_sales;
    totalTransactions += item.transactions;
    totalUnitsSold += item.units_sold;
    if (typeof item.gross_margin_pct === "number") {
      marginSum += item.gross_margin_pct;
      marginCount += 1;
    }
    distinctDates.add(item.date);
    salesByStore.set(item.store_id, (salesByStore.get(item.store_id) ?? 0) + item.net_sales);
    txnsByStore.set(
      item.store_id,
      (txnsByStore.get(item.store_id) ?? 0) + item.transactions,
    );
    salesByDate.set(item.date, (salesByDate.get(item.date) ?? 0) + item.net_sales);
    if (minDate === null || item.date < minDate) minDate = item.date;
    if (maxDate === null || item.date > maxDate) maxDate = item.date;
  }

  const totalSalesAllDepartments = allItems.reduce((sum, i) => sum + i.net_sales, 0);
  const revenueShare = totalSalesAllDepartments === 0 ? 0 : totalSales / totalSalesAllDepartments;

  const storeIdsCarrying = new Set<number>(salesByStore.keys());
  const byStore: DepartmentByStoreBreakdown[] = dimStores
    .filter((s) => storeIdsCarrying.has(s.store_id))
    .map((s) => ({
      storeId: s.store_id,
      storeName: s.store_name,
      tradeAreaProfile: s.trade_area_profile,
      totalSales: salesByStore.get(s.store_id) ?? 0,
      totalTransactions: txnsByStore.get(s.store_id) ?? 0,
    }))
    .sort((a, b) => b.totalSales - a.totalSales);

  const trend: DepartmentTrendPoint[] = Array.from(salesByDate.entries())
    .map(([date, total]) => ({ date, totalSales: total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    departmentId,
    departmentName: getDepartmentName(departmentId),
    totalSales,
    totalTransactions,
    totalUnitsSold,
    avgGrossMarginPct: marginCount === 0 ? 0 : marginSum / marginCount,
    storeCoverage: storeIdsCarrying.size,
    avgDailySales: distinctDates.size === 0 ? 0 : totalSales / distinctDates.size,
    revenueShare,
    windowStart: minDate,
    windowEnd: maxDate,
    byStore,
    trend,
  };
}

interface RawDepartmentInputs {
  deptMetrics: DepartmentMetricsRaw;
  dimStores: DimStoreRaw[];
}

async function loadRawDepartmentInputs(): Promise<RawDepartmentInputs> {
  if (getApiMode() === "offline") {
    const [deptMetrics, dimStoresMod] = await Promise.all([
      loadFullWindowDepartmentMetrics(),
      import("@/fixtures/dim-stores.json"),
    ]);
    return {
      deptMetrics,
      dimStores: dimStoresMod.default as unknown as DimStoreRaw[],
    };
  }

  const base = getBaseUrl();
  const [deptMetrics, dimStoresRes] = await Promise.all([
    loadFullWindowDepartmentMetrics(),
    fetch(`${base}/api/dim-stores`, { cache: "no-store" }),
  ]);
  if (!dimStoresRes.ok) {
    throw new Error(`dim-stores fetch failed: ${dimStoresRes.status}`);
  }
  const dimStores = (await dimStoresRes.json()) as DimStoreRaw[];
  return { deptMetrics, dimStores };
}

export async function fetchDepartmentData(departmentId: number): Promise<DepartmentData> {
  const { deptMetrics, dimStores } = await loadRawDepartmentInputs();
  return shapeDepartmentData(departmentId, deptMetrics, dimStores);
}
