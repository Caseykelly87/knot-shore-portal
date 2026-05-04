/**
 * Server-side dashboard data fetcher and shaper.
 *
 * fetchDashboardData() runs on the server (called from app/page.tsx),
 * issues parallel fetches to the portal's own /api/* route handlers
 * (which route between fixtures and upstream api based on api mode),
 * and returns a single shaped object the dashboard page renders.
 *
 * shapeDashboardData() is the pure transform separated for unit
 * testing. It composes data from the three endpoint responses into
 * the dashboard's view model.
 */

import { headers } from "next/headers";

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

export function shapeDashboardData(
  summary: DashboardSummaryRaw,
  anomalies: AnomaliesRaw,
  storeMetrics: StoreMetricsRaw,
): DashboardData {
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
    topStores: (summary.top_stores_by_revenue ?? []).map((s) => ({
      storeId: String(s.store_id),
      storeName: `Store ${s.store_id}`,
      totalSales: s.total_sales,
    })),
    exceptionSeverityCounts,
  };
}

function getBaseUrl(): string {
  const h = headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const base = getBaseUrl();

  const [summaryRes, anomaliesRes, storeMetricsRes] = await Promise.all([
    fetch(
      `${base}/api/dashboard-summary?start_date=${DASHBOARD_START_DATE}&end_date=${DASHBOARD_END_DATE}`,
      { cache: "no-store" },
    ),
    fetch(`${base}/api/anomalies?limit=1000`, { cache: "no-store" }),
    fetch(`${base}/api/store-metrics?limit=2000`, { cache: "no-store" }),
  ]);

  if (!summaryRes.ok || !anomaliesRes.ok || !storeMetricsRes.ok) {
    throw new Error(
      `Dashboard data fetch failed: summary=${summaryRes.status} anomalies=${anomaliesRes.status} storeMetrics=${storeMetricsRes.status}`,
    );
  }

  const [summary, anomalies, storeMetrics] = await Promise.all([
    summaryRes.json() as Promise<DashboardSummaryRaw>,
    anomaliesRes.json() as Promise<AnomaliesRaw>,
    storeMetricsRes.json() as Promise<StoreMetricsRaw>,
  ]);

  return shapeDashboardData(summary, anomalies, storeMetrics);
}
