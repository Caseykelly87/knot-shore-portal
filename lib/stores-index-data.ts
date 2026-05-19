/**
 * Server-side stores index data fetcher and shaper for the /stores
 * listing page.
 *
 * fetchStoresIndexData() aggregates the full available window of
 * store-metrics and anomalies into a per-store summary the index
 * page renders. shapeStoresIndexData() is the pure transform
 * separated for unit testing.
 *
 * Totals are computed across the entire fixture window, matching
 * the convention established by the dashboard's KPI aggregates.
 */

import { getApiMode } from "@/lib/api-mode";
import { getBaseUrl } from "@/lib/get-base-url";

const STORE_METRICS_FETCH_LIMIT = 5000;
const ANOMALIES_FETCH_LIMIT = 5000;

export interface StoresIndexEntry {
  storeId: number;
  storeName: string;
  tradeAreaProfile: string;
  totalSales: number;
  totalTransactions: number;
  exceptionCount: number;
  severityCounts: { info: number; warning: number; critical: number };
}

interface StoreMetricItem {
  date: string;
  store_id: number;
  total_sales: number;
  transaction_count: number;
}

interface StoreMetricsRaw {
  total: number;
  limit?: number;
  offset?: number;
  items: StoreMetricItem[];
}

interface AnomalyItem {
  store_id: number;
  severity_level: string;
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
  trade_area_profile: string;
}

export function shapeStoresIndexData(
  dimStores: DimStoreRaw[],
  storeMetrics: StoreMetricsRaw,
  anomalies: AnomaliesRaw,
): StoresIndexEntry[] {
  const salesByStore = new Map<number, number>();
  const transactionsByStore = new Map<number, number>();
  for (const item of storeMetrics.items ?? []) {
    salesByStore.set(item.store_id, (salesByStore.get(item.store_id) ?? 0) + item.total_sales);
    transactionsByStore.set(
      item.store_id,
      (transactionsByStore.get(item.store_id) ?? 0) + item.transaction_count,
    );
  }

  const severityByStore = new Map<number, { info: number; warning: number; critical: number }>();
  for (const item of anomalies.items ?? []) {
    const bucket = severityByStore.get(item.store_id) ?? { info: 0, warning: 0, critical: 0 };
    if (item.severity_level === "info") bucket.info += 1;
    else if (item.severity_level === "warning") bucket.warning += 1;
    else if (item.severity_level === "critical") bucket.critical += 1;
    severityByStore.set(item.store_id, bucket);
  }

  return dimStores
    .map((store) => {
      const counts = severityByStore.get(store.store_id) ?? { info: 0, warning: 0, critical: 0 };
      return {
        storeId: store.store_id,
        storeName: store.store_name,
        tradeAreaProfile: store.trade_area_profile,
        totalSales: salesByStore.get(store.store_id) ?? 0,
        totalTransactions: transactionsByStore.get(store.store_id) ?? 0,
        exceptionCount: counts.info + counts.warning + counts.critical,
        severityCounts: counts,
      };
    })
    .sort((a, b) => a.storeId - b.storeId);
}

interface RawStoresIndexInputs {
  dimStores: DimStoreRaw[];
  storeMetrics: StoreMetricsRaw;
  anomalies: AnomaliesRaw;
}

async function loadRawStoresIndexInputs(): Promise<RawStoresIndexInputs> {
  if (getApiMode() === "offline") {
    const [dimStoresMod, storeMetricsMod, anomaliesMod] = await Promise.all([
      import("@/fixtures/dim-stores.json"),
      import("@/fixtures/store-metrics.json"),
      import("@/fixtures/anomalies.json"),
    ]);
    return {
      dimStores: dimStoresMod.default as unknown as DimStoreRaw[],
      storeMetrics: storeMetricsMod.default as unknown as StoreMetricsRaw,
      anomalies: anomaliesMod.default as unknown as AnomaliesRaw,
    };
  }

  const base = getBaseUrl();

  const [dimStoresRes, storeMetricsRes, anomaliesRes] = await Promise.all([
    fetch(`${base}/api/dim-stores`, { cache: "no-store" }),
    fetch(`${base}/api/store-metrics?limit=${STORE_METRICS_FETCH_LIMIT}`, { cache: "no-store" }),
    fetch(`${base}/api/anomalies?limit=${ANOMALIES_FETCH_LIMIT}`, { cache: "no-store" }),
  ]);

  if (!dimStoresRes.ok || !storeMetricsRes.ok || !anomaliesRes.ok) {
    throw new Error(
      `Stores index fetch failed: dimStores=${dimStoresRes.status} storeMetrics=${storeMetricsRes.status} anomalies=${anomaliesRes.status}`,
    );
  }

  const [dimStores, storeMetrics, anomalies] = await Promise.all([
    dimStoresRes.json() as Promise<DimStoreRaw[]>,
    storeMetricsRes.json() as Promise<StoreMetricsRaw>,
    anomaliesRes.json() as Promise<AnomaliesRaw>,
  ]);

  return { dimStores, storeMetrics, anomalies };
}

export async function fetchStoresIndexData(): Promise<StoresIndexEntry[]> {
  const { dimStores, storeMetrics, anomalies } = await loadRawStoresIndexInputs();
  return shapeStoresIndexData(dimStores, storeMetrics, anomalies);
}
