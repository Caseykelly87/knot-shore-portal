/**
 * Shared store-metrics loader used by data shapers that need the full
 * available window (currently the dashboard and the stores index).
 *
 * loadFullWindowStoreMetrics() handles the offline/online branching so
 * each consumer only owns its shaping logic. Offline mode imports the
 * bundled fixture; online mode fetches from the portal's own
 * /api/store-metrics route handler with the project's standard limit.
 */

import { getApiMode } from "@/lib/api-mode";
import { getBaseUrl } from "@/lib/get-base-url";

const STORE_METRICS_FETCH_LIMIT = 5000;

export interface StoreMetricItem {
  date: string;
  store_id: number;
  total_sales: number;
  transaction_count: number;
  labor_cost_pct?: number | null;
}

export interface StoreMetricsRaw {
  total: number;
  limit?: number;
  offset?: number;
  items: StoreMetricItem[];
}

export async function loadFullWindowStoreMetrics(): Promise<StoreMetricsRaw> {
  if (getApiMode() === "offline") {
    const mod = await import("@/fixtures/store-metrics.json");
    return mod.default as unknown as StoreMetricsRaw;
  }

  const base = getBaseUrl();
  const res = await fetch(`${base}/api/store-metrics?limit=${STORE_METRICS_FETCH_LIMIT}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Store metrics fetch failed: ${res.status}`);
  }

  return (await res.json()) as StoreMetricsRaw;
}
