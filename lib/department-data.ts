/**
 * Server-side per-department data fetcher and shape transformer for
 * the drilldown page at /departments/[id].
 *
 * fetchDepartmentData(deptId) loads the department-metrics fixture
 * and the dim-stores reference table; shapeDepartmentData() composes
 * a view model with KPI aggregates, a per-store breakdown, a daily
 * trend, and PoP/YoY deltas across the available window.
 *
 * KPI deltas reuse the period helper from lib/dashboard-periods: the
 * recent, prior-period, and year-over-year slices are derived from
 * the full fixture window, so every department's deltas compare the
 * same calendar periods. A department with no rows in a comparison
 * period yields a null delta for that period.
 */

import { getApiMode } from "@/lib/api-mode";
import { getBaseUrl } from "@/lib/get-base-url";
import {
  loadFullWindowDepartmentMetrics,
  type DepartmentMetricsRaw,
  type DepartmentMetricItem,
} from "@/lib/store-metrics-loader";
import {
  computeDashboardPeriods,
  computeDelta,
  type DashboardPeriod,
  type DashboardPeriods,
} from "@/lib/dashboard-periods";
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

/**
 * Proportional change of a KPI's recent-period value against an
 * earlier period. Either side is null when the comparison period has
 * no data for the department or carries a zero baseline.
 */
export interface DepartmentKpiDelta {
  pop: number | null;
  yoy: number | null;
}

export interface DepartmentKpiDeltas {
  totalSales: DepartmentKpiDelta;
  totalTransactions: DepartmentKpiDelta;
  avgDailySales: DepartmentKpiDelta;
  revenueShare: DepartmentKpiDelta;
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
  kpiDeltas: DepartmentKpiDeltas;
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

  let totalSalesAllDepartments = 0;
  let fixtureMinDate: string | null = null;
  let fixtureMaxDate: string | null = null;
  for (const item of allItems) {
    totalSalesAllDepartments += item.net_sales;
    if (fixtureMinDate === null || item.date < fixtureMinDate) fixtureMinDate = item.date;
    if (fixtureMaxDate === null || item.date > fixtureMaxDate) fixtureMaxDate = item.date;
  }
  const revenueShare =
    totalSalesAllDepartments === 0 ? 0 : totalSales / totalSalesAllDepartments;

  // Periods come from the full fixture window so every department's
  // deltas compare the same calendar slices regardless of when an
  // individual department's own rows start or end.
  const periods = computeDashboardPeriods(fixtureMinDate, fixtureMaxDate);
  const kpiDeltas = computeDepartmentKpiDeltas(items, allItems, periods);

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
    kpiDeltas,
    windowStart: minDate,
    windowEnd: maxDate,
    byStore,
    trend,
  };
}

interface DepartmentPeriodAggregate {
  totalSales: number;
  totalTransactions: number;
  avgDailySales: number;
  revenueShare: number;
}

/**
 * Aggregates one department's KPIs over a single comparison period.
 * revenueShare is the department's share of all-department sales
 * within that same period, so the share is comparable across periods.
 */
function aggregateDepartmentPeriod(
  departmentItems: DepartmentMetricItem[],
  allItems: DepartmentMetricItem[],
  period: DashboardPeriod,
): DepartmentPeriodAggregate {
  let totalSales = 0;
  let totalTransactions = 0;
  const distinctDates = new Set<string>();
  for (const item of departmentItems) {
    if (item.date < period.start || item.date > period.end) continue;
    totalSales += item.net_sales;
    totalTransactions += item.transactions;
    distinctDates.add(item.date);
  }

  let allDepartmentsSales = 0;
  for (const item of allItems) {
    if (item.date < period.start || item.date > period.end) continue;
    allDepartmentsSales += item.net_sales;
  }

  return {
    totalSales,
    totalTransactions,
    avgDailySales: distinctDates.size === 0 ? 0 : totalSales / distinctDates.size,
    revenueShare: allDepartmentsSales === 0 ? 0 : totalSales / allDepartmentsSales,
  };
}

/**
 * Computes PoP and YoY deltas for each department KPI by aggregating
 * the recent, prior-period, and year-over-year slices and comparing
 * them. Returns null deltas when periods are unavailable (window too
 * short) or a comparison period has no data for the department.
 */
function computeDepartmentKpiDeltas(
  departmentItems: DepartmentMetricItem[],
  allItems: DepartmentMetricItem[],
  periods: DashboardPeriods | null,
): DepartmentKpiDeltas {
  const emptyDelta: DepartmentKpiDelta = { pop: null, yoy: null };
  if (!periods) {
    return {
      totalSales: emptyDelta,
      totalTransactions: emptyDelta,
      avgDailySales: emptyDelta,
      revenueShare: emptyDelta,
    };
  }

  const recent = aggregateDepartmentPeriod(departmentItems, allItems, periods.recent);
  const pop = periods.pop
    ? aggregateDepartmentPeriod(departmentItems, allItems, periods.pop)
    : null;
  const yoy = periods.yoy
    ? aggregateDepartmentPeriod(departmentItems, allItems, periods.yoy)
    : null;

  const deltaFor = (metric: keyof DepartmentPeriodAggregate): DepartmentKpiDelta => ({
    pop: computeDelta(recent[metric], pop ? pop[metric] : null),
    yoy: computeDelta(recent[metric], yoy ? yoy[metric] : null),
  });

  return {
    totalSales: deltaFor("totalSales"),
    totalTransactions: deltaFor("totalTransactions"),
    avgDailySales: deltaFor("avgDailySales"),
    revenueShare: deltaFor("revenueShare"),
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
