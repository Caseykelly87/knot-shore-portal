/**
 * Server-side dashboard data fetcher and shaper.
 *
 * fetchDashboardData() runs on the server (called from app/page.tsx),
 * issues parallel fetches to the portal's own /api/* route handlers
 * (which route between fixtures and upstream api based on api mode),
 * and returns a single shaped object the dashboard page renders.
 *
 * shapeDashboardData() is the pure transform separated for unit
 * testing. It composes data from the four endpoint responses into
 * the dashboard's view model. The fourth input — dim_stores — supplies
 * real store names for the top-stores chart; without it the chart
 * falls back to a synthesized 'Store {N}' label.
 */

import { getApiMode } from "@/lib/api-mode";
import { getBaseUrl } from "@/lib/get-base-url";

const DASHBOARD_START_DATE = "2025-07-01";
const DASHBOARD_END_DATE = "2025-12-31";

export interface DashboardData {
  totalSales: number;
  totalTransactions: number;
  activeExceptions: number;
  avgLaborCostPct: number;
  dailyTrend: Array<{ date: string; totalSales: number }>;
  topStores: Array<{ storeId: string; storeName: string; totalSales: number }>;
  exceptionSeverityCounts: { info: number; warning: number; critical: number };
  storeNames: Record<number, string>;
}

interface DashboardSummaryRaw {
  total_sales: number;
  total_transactions: number;
  daily_sales_trend: Array<{ date: string; total_sales: number; transaction_count?: number }>;
  top_stores_by_revenue: Array<{ store_id: number | string; total_sales: number }>;
  exception_count_by_severity?: Array<{ severity_level: string; count: number }>;
}

interface AnomaliesRaw {
  total: number;
  limit?: number;
  offset?: number;
  items: Array<{ severity_level?: string }>;
}

interface StoreMetricsRaw {
  total: number;
  limit?: number;
  offset?: number;
  items: Array<{ labor_cost_pct?: number | null }>;
}

interface DimStoreRaw {
  store_id: number;
  store_name: string;
}

export function shapeDashboardData(
  summary: DashboardSummaryRaw,
  anomalies: AnomaliesRaw,
  storeMetrics: StoreMetricsRaw,
  dimStores: DimStoreRaw[],
): DashboardData {
  const storeNames: Record<number, string> = {};
  for (const store of dimStores) {
    storeNames[store.store_id] = store.store_name;
  }

  // Severity counts come from the dashboard-summary endpoint's
  // pre-computed exception_count_by_severity field. The /api/anomalies
  // endpoint paginates and the offline fixture caps items at 200, so
  // counting from items would underrepresent warning/critical buckets
  // when those rows fall after the cap. The summary's counts are
  // authoritative for the full population.
  const exceptionSeverityCounts = { info: 0, warning: 0, critical: 0 };
  for (const bucket of summary.exception_count_by_severity ?? []) {
    if (bucket.severity_level === "info") exceptionSeverityCounts.info = bucket.count;
    else if (bucket.severity_level === "warning") exceptionSeverityCounts.warning = bucket.count;
    else if (bucket.severity_level === "critical") exceptionSeverityCounts.critical = bucket.count;
  }

  const laborItems = storeMetrics.items ?? [];
  const laborWithValues = laborItems.filter(
    (item): item is { labor_cost_pct: number } =>
      typeof item.labor_cost_pct === "number",
  );
  const avgLaborCostPct =
    laborWithValues.length === 0
      ? 0
      : laborWithValues.reduce((sum, item) => sum + item.labor_cost_pct, 0) / laborWithValues.length;

  return {
    totalSales: summary.total_sales,
    totalTransactions: summary.total_transactions,
    activeExceptions: anomalies.total,
    avgLaborCostPct,
    dailyTrend: (summary.daily_sales_trend ?? []).map((d) => ({
      date: d.date,
      totalSales: d.total_sales,
    })),
    topStores: (summary.top_stores_by_revenue ?? []).map((s) => {
      const numericId = typeof s.store_id === "number" ? s.store_id : Number(s.store_id);
      return {
        storeId: String(s.store_id),
        storeName: storeNames[numericId] ?? `Store ${s.store_id}`,
        totalSales: s.total_sales,
      };
    }),
    exceptionSeverityCounts,
    storeNames,
  };
}

interface RawDashboardInputs {
  summary: DashboardSummaryRaw;
  anomalies: AnomaliesRaw;
  storeMetrics: StoreMetricsRaw;
  dimStores: DimStoreRaw[];
}

async function loadRawDashboardInputs(): Promise<RawDashboardInputs> {
  if (getApiMode() === "offline") {
    const [summaryMod, anomaliesMod, storeMetricsMod, dimStoresMod] = await Promise.all([
      import("@/fixtures/dashboard-summary.json"),
      import("@/fixtures/anomalies.json"),
      import("@/fixtures/store-metrics.json"),
      import("@/fixtures/dim-stores.json"),
    ]);
    return {
      summary: summaryMod.default as unknown as DashboardSummaryRaw,
      anomalies: anomaliesMod.default as unknown as AnomaliesRaw,
      storeMetrics: storeMetricsMod.default as unknown as StoreMetricsRaw,
      dimStores: dimStoresMod.default as unknown as DimStoreRaw[],
    };
  }

  const base = getBaseUrl();

  const [summaryRes, anomaliesRes, storeMetricsRes, dimStoresRes] = await Promise.all([
    fetch(
      `${base}/api/dashboard-summary?start_date=${DASHBOARD_START_DATE}&end_date=${DASHBOARD_END_DATE}`,
      { cache: "no-store" },
    ),
    fetch(`${base}/api/anomalies?limit=200`, { cache: "no-store" }),
    fetch(`${base}/api/store-metrics?limit=200`, { cache: "no-store" }),
    fetch(`${base}/api/dim-stores`, { cache: "no-store" }),
  ]);

  if (!summaryRes.ok || !anomaliesRes.ok || !storeMetricsRes.ok || !dimStoresRes.ok) {
    throw new Error(
      `Dashboard data fetch failed: summary=${summaryRes.status} anomalies=${anomaliesRes.status} storeMetrics=${storeMetricsRes.status} dimStores=${dimStoresRes.status}`,
    );
  }

  const [summary, anomalies, storeMetrics, dimStores] = await Promise.all([
    summaryRes.json() as Promise<DashboardSummaryRaw>,
    anomaliesRes.json() as Promise<AnomaliesRaw>,
    storeMetricsRes.json() as Promise<StoreMetricsRaw>,
    dimStoresRes.json() as Promise<DimStoreRaw[]>,
  ]);

  return { summary, anomalies, storeMetrics, dimStores };
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const { summary, anomalies, storeMetrics, dimStores } = await loadRawDashboardInputs();
  return shapeDashboardData(summary, anomalies, storeMetrics, dimStores);
}
