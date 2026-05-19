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
import { loadFullWindowStoreMetrics, type StoreMetricsRaw } from "@/lib/store-metrics-loader";

const ANOMALIES_FETCH_LIMIT = 5000;
const TOP_STORES_COUNT = 5;

export interface DashboardData {
  totalSales: number;
  totalTransactions: number;
  activeExceptions: number;
  avgLaborCostPct: number;
  dailyTrend: Array<{ date: string; totalSales: number }>;
  topStores: Array<{ storeId: string; storeName: string; totalSales: number }>;
  exceptionSeverityCounts: { info: number; warning: number; critical: number };
  storeNames: Record<number, string>;
  windowStartDate: string | null;
  windowEndDate: string | null;
}

interface AnomalyItem {
  date?: string;
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
    .map(([date, total]) => ({ date, totalSales: total }))
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
