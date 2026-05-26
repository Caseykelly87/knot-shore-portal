/**
 * Server-side per-store data fetcher and shape transformer for the
 * drilldown page at /stores/[id].
 *
 * fetchStoreData(storeId) issues five parallel fetches via the portal's
 * own /api/* route handlers (which route between fixtures and upstream
 * api based on api mode). shapeStoreData() is a pure transform separated
 * for unit testing — it composes the raw responses into a view model
 * the drilldown components render.
 *
 * The yoy alignment is by month-day (e.g., 'Jul 1') rather than absolute
 * date, so the prior-year line in the chart sits directly under the
 * current-year line for that calendar position.
 *
 * Anomaly descriptions are synthesized from rule_id + actual/expected
 * values because the upstream api doesn't return a free-text description
 * field; the synthesized form gives the operator the same 'actual vs
 * expected' summary the rule itself fired on.
 */

import { getApiMode } from "@/lib/api-mode";
import { getBaseUrl } from "@/lib/get-base-url";
import { getDepartmentName } from "@/lib/dim-departments";
import { fetchPaginated } from "@/lib/pagination";

const CURRENT_YEAR_START = "2025-07-01";
const CURRENT_YEAR_END = "2025-12-31";
const PRIOR_YEAR_START = "2024-07-01";
const PRIOR_YEAR_END = "2024-12-31";

export interface StoreData {
  storeId: number;
  storeName: string;
  address: string;
  city: string;
  zip: string;
  tradeAreaProfile: string;
  sqft: number;
  openDate: string;

  totalSales: number;
  totalTransactions: number;
  avgLaborCostPct: number;
  activeExceptions: number;

  yoyTrend: Array<{
    monthDay: string;
    currentYearSales: number;
    priorYearSales: number | null;
  }>;

  departmentMix: Array<{
    departmentId: number;
    departmentName: string;
    totalSales: number;
    revenueShare: number;
  }>;

  topDepartments: Array<{
    departmentId: number;
    departmentName: string;
    totalSales: number;
  }>;

  anomalies: Array<{
    date: string;
    severity: string;
    ruleId: string;
    description: string;
  }>;
}

export interface DimStoreRaw {
  store_id: number;
  store_name: string;
  address: string;
  city: string;
  zip: string;
  county_fips: string;
  trade_area_profile: string;
  sqft: number;
  open_date: string;
  base_daily_revenue: number;
}

export interface StoreMetricsRaw {
  total: number;
  items: Array<{
    date: string;
    store_id: number;
    total_sales: number;
    transaction_count: number;
    avg_basket_size?: number | null;
    labor_cost_pct?: number | null;
  }>;
}

export interface DeptMetricsRaw {
  total: number;
  items: Array<{
    date: string;
    store_id: number;
    department_id: number;
    net_sales: number;
    transactions: number;
    units_sold: number;
    gross_margin_pct: number;
  }>;
}

export interface AnomaliesRaw {
  total: number;
  items: Array<{
    date: string;
    store_id: number;
    rule_id: string;
    actual_value: number;
    expected_low: number;
    expected_high: number;
    distance_from_band: number;
    severity_score: number;
    severity_level: string;
  }>;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatMonthDay(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  const month = parts[1];
  const day = parts[2];
  return `${MONTH_NAMES[month - 1]} ${day}`;
}

function getMonthDayKey(dateStr: string): string {
  return dateStr.slice(5);
}

function formatBandValue(value: number, isCurrency: boolean): string {
  if (isCurrency) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function describeAnomaly(item: AnomaliesRaw["items"][number]): string {
  const isCurrency = item.rule_id.startsWith("revenue") || item.rule_id.startsWith("yoy");
  return `actual ${formatBandValue(item.actual_value, isCurrency)} (expected ${formatBandValue(item.expected_low, isCurrency)}–${formatBandValue(item.expected_high, isCurrency)})`;
}

export function shapeStoreData(
  storeId: number,
  dimStores: DimStoreRaw[],
  currentYearMetrics: StoreMetricsRaw,
  priorYearMetrics: StoreMetricsRaw,
  deptMetrics: DeptMetricsRaw,
  anomalies: AnomaliesRaw,
): StoreData {
  const dimStore = dimStores.find((s) => s.store_id === storeId);
  if (!dimStore) {
    throw new Error(`Store ${storeId} not found in dim_stores`);
  }

  // Defensive date-scoping: the offline route handlers return the full
  // fixture (both years) regardless of query params, so the shaper
  // re-applies the year window itself. Online mode is already scoped
  // by the upstream api but the redundant filter is cheap.
  const currentYearItems = currentYearMetrics.items.filter(
    (i) =>
      i.store_id === storeId &&
      i.date >= CURRENT_YEAR_START &&
      i.date <= CURRENT_YEAR_END,
  );
  const totalSales = currentYearItems.reduce((sum, r) => sum + r.total_sales, 0);
  const totalTransactions = currentYearItems.reduce((sum, r) => sum + r.transaction_count, 0);
  const laborWithValues = currentYearItems.filter(
    (i): i is typeof i & { labor_cost_pct: number } => typeof i.labor_cost_pct === "number",
  );
  const avgLaborCostPct =
    laborWithValues.length === 0
      ? 0
      : laborWithValues.reduce((sum, r) => sum + r.labor_cost_pct, 0) / laborWithValues.length;
  const storeAnomalyItems = anomalies.items.filter((a) => a.store_id === storeId);
  const activeExceptions = storeAnomalyItems.length;

  const priorYearByMonthDay = new Map<string, number>();
  for (const item of priorYearMetrics.items.filter(
    (i) => i.store_id === storeId && i.date >= PRIOR_YEAR_START && i.date <= PRIOR_YEAR_END,
  )) {
    priorYearByMonthDay.set(getMonthDayKey(item.date), item.total_sales);
  }

  const yoyTrend = [...currentYearItems]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => ({
      monthDay: formatMonthDay(item.date),
      currentYearSales: item.total_sales,
      priorYearSales: priorYearByMonthDay.get(getMonthDayKey(item.date)) ?? null,
    }));

  const deptItems = deptMetrics.items.filter(
    (i) =>
      i.store_id === storeId &&
      i.date >= CURRENT_YEAR_START &&
      i.date <= CURRENT_YEAR_END,
  );
  const deptTotalsMap = new Map<number, number>();
  for (const item of deptItems) {
    deptTotalsMap.set(item.department_id, (deptTotalsMap.get(item.department_id) ?? 0) + item.net_sales);
  }
  const totalDeptSales = Array.from(deptTotalsMap.values()).reduce((sum, v) => sum + v, 0);
  const departmentMix = Array.from(deptTotalsMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([deptId, sales]) => ({
      departmentId: deptId,
      departmentName: getDepartmentName(deptId),
      totalSales: sales,
      revenueShare: totalDeptSales === 0 ? 0 : sales / totalDeptSales,
    }));

  const topDepartments = [...departmentMix]
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 5)
    .map((d) => ({
      departmentId: d.departmentId,
      departmentName: d.departmentName,
      totalSales: d.totalSales,
    }));

  const storeAnomalies = storeAnomalyItems.map((a) => ({
    date: a.date,
    severity: a.severity_level,
    ruleId: a.rule_id,
    description: describeAnomaly(a),
  }));

  return {
    storeId: dimStore.store_id,
    storeName: dimStore.store_name,
    address: dimStore.address,
    city: dimStore.city,
    zip: dimStore.zip,
    tradeAreaProfile: dimStore.trade_area_profile,
    sqft: dimStore.sqft,
    openDate: dimStore.open_date,
    totalSales,
    totalTransactions,
    avgLaborCostPct,
    activeExceptions,
    yoyTrend,
    departmentMix,
    topDepartments,
    anomalies: storeAnomalies,
  };
}

interface RawStoreInputs {
  dimStores: DimStoreRaw[];
  currentYear: StoreMetricsRaw;
  priorYear: StoreMetricsRaw;
  deptMetrics: DeptMetricsRaw;
  anomalies: AnomaliesRaw;
}

async function loadRawStoreInputs(storeId: number): Promise<RawStoreInputs> {
  if (getApiMode() === "offline") {
    const [dimStoresMod, storeMetricsMod, deptMetricsMod, anomaliesMod] = await Promise.all([
      import("@/fixtures/dim-stores.json"),
      import("@/fixtures/store-metrics.json"),
      import("@/fixtures/department-metrics.json"),
      import("@/fixtures/anomalies.json"),
    ]);
    // shapeStoreData filters items by store_id and by date window, so the
    // unfiltered full fixture is sufficient for both year slices.
    const allStoreMetrics = storeMetricsMod.default as unknown as StoreMetricsRaw;
    return {
      dimStores: dimStoresMod.default as unknown as DimStoreRaw[],
      currentYear: allStoreMetrics,
      priorYear: allStoreMetrics,
      deptMetrics: deptMetricsMod.default as unknown as DeptMetricsRaw,
      anomalies: anomaliesMod.default as unknown as AnomaliesRaw,
    };
  }

  const base = getBaseUrl();

  const [dimStores, currentYear, priorYear, deptMetrics, anomalies] = await Promise.all([
    (async () => {
      const r = await fetch(`${base}/api/dim-stores`, { cache: "no-store" });
      if (!r.ok) throw new Error(`dim-stores fetch failed: ${r.status}`);
      return r.json() as Promise<DimStoreRaw[]>;
    })(),
    fetchPaginated<StoreMetricsRaw["items"][number]>(
      base,
      `/api/store-metrics?store_id=${storeId}&start_date=${CURRENT_YEAR_START}&end_date=${CURRENT_YEAR_END}`,
    ),
    fetchPaginated<StoreMetricsRaw["items"][number]>(
      base,
      `/api/store-metrics?store_id=${storeId}&start_date=${PRIOR_YEAR_START}&end_date=${PRIOR_YEAR_END}`,
    ),
    fetchPaginated<DeptMetricsRaw["items"][number]>(
      base,
      `/api/department-metrics?store_id=${storeId}&start_date=${CURRENT_YEAR_START}&end_date=${CURRENT_YEAR_END}`,
    ),
    fetchPaginated<AnomaliesRaw["items"][number]>(
      base,
      `/api/anomalies?store_id=${storeId}`,
    ),
  ]);

  return { dimStores, currentYear, priorYear, deptMetrics, anomalies };
}

export async function fetchStoreData(storeId: number): Promise<StoreData> {
  const { dimStores, currentYear, priorYear, deptMetrics, anomalies } =
    await loadRawStoreInputs(storeId);

  return shapeStoreData(storeId, dimStores, currentYear, priorYear, deptMetrics, anomalies);
}
