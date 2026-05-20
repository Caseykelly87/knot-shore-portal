/**
 * Server-side dashboard data fetcher and shaper.
 *
 * fetchDashboardData() runs on the server (called from app/page.tsx),
 * issues parallel fetches to the portal's own /api/* route handlers
 * (which route between fixtures and upstream api based on api mode),
 * and returns a single shaped object the dashboard page renders.
 *
 * shapeDashboardData() is the pure transform separated for unit
 * testing. It composes the view model from three endpoint responses:
 * store-metrics (per-store-per-day grain), anomalies (severity items),
 * and dim_stores (store names for the top-stores chart). All KPI
 * aggregates, the daily trend, the top-stores ranking, and the
 * severity breakdown are computed here from store-metrics and
 * anomalies, so the dashboard reflects the full window present in
 * those fixtures rather than a pre-aggregated slice.
 */

import { getApiMode } from "@/lib/api-mode";
import { getBaseUrl } from "@/lib/get-base-url";
import {
  loadFullWindowStoreMetrics,
  type StoreMetricItem,
  type StoreMetricsRaw,
} from "@/lib/store-metrics-loader";
import {
  computeDashboardPeriods,
  computeDelta,
  type DashboardPeriod,
  type DashboardPeriods,
} from "@/lib/dashboard-periods";

const ANOMALIES_FETCH_LIMIT = 5000;
const TOP_STORES_COUNT = 5;
const TRADE_AREA_ORDER = ["suburban-family", "urban-dense", "value-market"] as const;

export interface KPIDeltaInfo {
  recent: number;
  pop: number | null;
  yoy: number | null;
  popDelta: number | null;
  yoyDelta: number | null;
}

export interface KPIDeltas {
  totalSales: KPIDeltaInfo;
  totalTransactions: KPIDeltaInfo;
  activeExceptions: KPIDeltaInfo;
  avgLaborCostPct: KPIDeltaInfo;
}

export interface TradeAreaSummary {
  tradeArea: string;
  storeCount: number;
  totalSales: number;
  avgSalesPerStore: number;
  totalExceptions: number;
}

export interface DashboardData {
  totalSales: number;
  totalTransactions: number;
  activeExceptions: number;
  avgLaborCostPct: number;
  dailyTrend: Array<{ date: string; totalSales: number; priorYearSales: number | null }>;
  topStores: Array<{ storeId: string; storeName: string; totalSales: number }>;
  exceptionSeverityCounts: { info: number; warning: number; critical: number };
  storeNames: Record<number, string>;
  windowStartDate: string | null;
  windowEndDate: string | null;
  periods: DashboardPeriods | null;
  kpiDeltas: KPIDeltas;
  tradeAreaSummaries: TradeAreaSummary[];
}

interface AnomalyItem {
  date?: string;
  store_id?: number;
  severity_level?: string;
}

interface AnomaliesRaw {
  total: number;
  limit?: number;
  offset?: number;
  items: AnomalyItem[];
}

interface DimStoreRaw {
  store_id: number;
  store_name: string;
  trade_area_profile?: string;
}

// The prior-year overlay looks up the same calendar month-day in the prior
// year. The lookup falls back to null when no matching prior-year datum
// exists, which is the honest representation for both the leading edge of
// the fixture window and Feb 29 in a non-leap prior year.
function shiftDateOneYearBack(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${year - 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function shapeDashboardData(
  anomalies: AnomaliesRaw,
  storeMetrics: StoreMetricsRaw,
  dimStores: DimStoreRaw[],
): DashboardData {
  const storeNames: Record<number, string> = {};
  for (const store of dimStores) {
    storeNames[store.store_id] = store.store_name;
  }

  const items = storeMetrics.items ?? [];

  let totalSales = 0;
  let totalTransactions = 0;
  let laborSum = 0;
  let laborCount = 0;
  const salesByDate = new Map<string, number>();
  const salesByStore = new Map<number, number>();
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const item of items) {
    totalSales += item.total_sales;
    totalTransactions += item.transaction_count;
    if (typeof item.labor_cost_pct === "number") {
      laborSum += item.labor_cost_pct;
      laborCount += 1;
    }
    salesByDate.set(item.date, (salesByDate.get(item.date) ?? 0) + item.total_sales);
    salesByStore.set(item.store_id, (salesByStore.get(item.store_id) ?? 0) + item.total_sales);
    if (minDate === null || item.date < minDate) minDate = item.date;
    if (maxDate === null || item.date > maxDate) maxDate = item.date;
  }

  const avgLaborCostPct = laborCount === 0 ? 0 : laborSum / laborCount;

  const dailyTrend = Array.from(salesByDate.entries())
    .map(([date, total]) => ({
      date,
      totalSales: total,
      priorYearSales: salesByDate.get(shiftDateOneYearBack(date)) ?? null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const topStores = Array.from(salesByStore.entries())
    .map(([storeId, total]) => ({
      storeId: String(storeId),
      storeName: storeNames[storeId] ?? `Store ${storeId}`,
      totalSales: total,
    }))
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, TOP_STORES_COUNT);

  const exceptionSeverityCounts = { info: 0, warning: 0, critical: 0 };
  for (const item of anomalies.items ?? []) {
    if (item.severity_level === "info") exceptionSeverityCounts.info += 1;
    else if (item.severity_level === "warning") exceptionSeverityCounts.warning += 1;
    else if (item.severity_level === "critical") exceptionSeverityCounts.critical += 1;
  }

  const periods = computeDashboardPeriods(minDate, maxDate);
  const kpiDeltas = computeKpiDeltas(items, anomalies.items ?? [], periods);
  const tradeAreaSummaries = shapeTradeAreaComparison(items, anomalies.items ?? [], dimStores);

  return {
    totalSales,
    totalTransactions,
    activeExceptions: anomalies.total,
    avgLaborCostPct,
    dailyTrend,
    topStores,
    exceptionSeverityCounts,
    storeNames,
    windowStartDate: minDate,
    windowEndDate: maxDate,
    periods,
    kpiDeltas,
    tradeAreaSummaries,
  };
}

export function shapeTradeAreaComparison(
  metricsItems: StoreMetricItem[],
  anomalyItems: AnomalyItem[],
  dimStores: DimStoreRaw[],
): TradeAreaSummary[] {
  const profileByStore = new Map<number, string>();
  const storesByProfile = new Map<string, Set<number>>();
  for (const store of dimStores) {
    const profile = store.trade_area_profile;
    if (!profile) continue;
    profileByStore.set(store.store_id, profile);
    let bucket = storesByProfile.get(profile);
    if (!bucket) {
      bucket = new Set<number>();
      storesByProfile.set(profile, bucket);
    }
    bucket.add(store.store_id);
  }

  const salesByProfile = new Map<string, number>();
  for (const item of metricsItems) {
    const profile = profileByStore.get(item.store_id);
    if (!profile) continue;
    salesByProfile.set(profile, (salesByProfile.get(profile) ?? 0) + item.total_sales);
  }

  const exceptionsByProfile = new Map<string, number>();
  for (const item of anomalyItems) {
    if (item.store_id === undefined) continue;
    const profile = profileByStore.get(item.store_id);
    if (!profile) continue;
    exceptionsByProfile.set(profile, (exceptionsByProfile.get(profile) ?? 0) + 1);
  }

  const profileOrder: string[] = [...TRADE_AREA_ORDER];
  storesByProfile.forEach((_value, profile) => {
    if (!profileOrder.includes(profile)) profileOrder.push(profile);
  });

  return profileOrder
    .filter((profile) => (storesByProfile.get(profile)?.size ?? 0) > 0)
    .map((profile) => {
      const storeCount = storesByProfile.get(profile)?.size ?? 0;
      const totalSales = salesByProfile.get(profile) ?? 0;
      return {
        tradeArea: profile,
        storeCount,
        totalSales,
        avgSalesPerStore: storeCount === 0 ? 0 : totalSales / storeCount,
        totalExceptions: exceptionsByProfile.get(profile) ?? 0,
      };
    });
}

interface PeriodAggregates {
  totalSales: number;
  totalTransactions: number;
  avgLaborCostPct: number;
  activeExceptions: number;
}

function aggregatePeriod(
  metricsItems: StoreMetricItem[],
  anomalyItems: AnomalyItem[],
  period: DashboardPeriod,
): PeriodAggregates {
  let totalSales = 0;
  let totalTransactions = 0;
  let laborSum = 0;
  let laborCount = 0;
  for (const item of metricsItems) {
    if (item.date < period.start || item.date > period.end) continue;
    totalSales += item.total_sales;
    totalTransactions += item.transaction_count;
    if (typeof item.labor_cost_pct === "number") {
      laborSum += item.labor_cost_pct;
      laborCount += 1;
    }
  }
  let activeExceptions = 0;
  for (const item of anomalyItems) {
    if (!item.date) continue;
    if (item.date < period.start || item.date > period.end) continue;
    activeExceptions += 1;
  }
  return {
    totalSales,
    totalTransactions,
    avgLaborCostPct: laborCount === 0 ? 0 : laborSum / laborCount,
    activeExceptions,
  };
}

function buildKpiDelta(
  recent: number,
  pop: number | null,
  yoy: number | null,
): KPIDeltaInfo {
  return {
    recent,
    pop,
    yoy,
    popDelta: computeDelta(recent, pop),
    yoyDelta: computeDelta(recent, yoy),
  };
}

function computeKpiDeltas(
  metricsItems: StoreMetricItem[],
  anomalyItems: AnomalyItem[],
  periods: DashboardPeriods | null,
): KPIDeltas {
  const empty: KPIDeltaInfo = {
    recent: 0,
    pop: null,
    yoy: null,
    popDelta: null,
    yoyDelta: null,
  };
  if (!periods) {
    return {
      totalSales: empty,
      totalTransactions: empty,
      activeExceptions: empty,
      avgLaborCostPct: empty,
    };
  }

  const recentAgg = aggregatePeriod(metricsItems, anomalyItems, periods.recent);
  const popAgg = periods.pop ? aggregatePeriod(metricsItems, anomalyItems, periods.pop) : null;
  const yoyAgg = periods.yoy ? aggregatePeriod(metricsItems, anomalyItems, periods.yoy) : null;

  return {
    totalSales: buildKpiDelta(
      recentAgg.totalSales,
      popAgg?.totalSales ?? null,
      yoyAgg?.totalSales ?? null,
    ),
    totalTransactions: buildKpiDelta(
      recentAgg.totalTransactions,
      popAgg?.totalTransactions ?? null,
      yoyAgg?.totalTransactions ?? null,
    ),
    activeExceptions: buildKpiDelta(
      recentAgg.activeExceptions,
      popAgg?.activeExceptions ?? null,
      yoyAgg?.activeExceptions ?? null,
    ),
    avgLaborCostPct: buildKpiDelta(
      recentAgg.avgLaborCostPct,
      popAgg?.avgLaborCostPct ?? null,
      yoyAgg?.avgLaborCostPct ?? null,
    ),
  };
}

interface RawDashboardInputs {
  anomalies: AnomaliesRaw;
  storeMetrics: StoreMetricsRaw;
  dimStores: DimStoreRaw[];
}

async function loadRawDashboardInputs(): Promise<RawDashboardInputs> {
  if (getApiMode() === "offline") {
    const [anomaliesMod, storeMetrics, dimStoresMod] = await Promise.all([
      import("@/fixtures/anomalies.json"),
      loadFullWindowStoreMetrics(),
      import("@/fixtures/dim-stores.json"),
    ]);
    return {
      anomalies: anomaliesMod.default as unknown as AnomaliesRaw,
      storeMetrics,
      dimStores: dimStoresMod.default as unknown as DimStoreRaw[],
    };
  }

  const base = getBaseUrl();

  const [anomaliesRes, storeMetrics, dimStoresRes] = await Promise.all([
    fetch(`${base}/api/anomalies?limit=${ANOMALIES_FETCH_LIMIT}`, { cache: "no-store" }),
    loadFullWindowStoreMetrics(),
    fetch(`${base}/api/dim-stores`, { cache: "no-store" }),
  ]);

  if (!anomaliesRes.ok || !dimStoresRes.ok) {
    throw new Error(
      `Dashboard data fetch failed: anomalies=${anomaliesRes.status} dimStores=${dimStoresRes.status}`,
    );
  }

  const [anomalies, dimStores] = await Promise.all([
    anomaliesRes.json() as Promise<AnomaliesRaw>,
    dimStoresRes.json() as Promise<DimStoreRaw[]>,
  ]);

  return { anomalies, storeMetrics, dimStores };
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const { anomalies, storeMetrics, dimStores } = await loadRawDashboardInputs();
  return shapeDashboardData(anomalies, storeMetrics, dimStores);
}
