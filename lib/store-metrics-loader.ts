/**
 * Shared store-metrics and department-metrics loaders used by data
 * shapers that need the full available window. Offline mode imports
 * the bundled fixture; online mode fetches the portal's own /api/*
 * route handlers.
 *
 * Both fixtures cover the full canonical window. The loaders return
 * whatever the fixture or api contains, and downstream shapers reason
 * about the window from the min/max dates of the data they receive.
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

export interface DepartmentMetricItem {
  date: string;
  store_id: number;
  department_id: number;
  net_sales: number;
  transactions: number;
  units_sold: number;
  gross_margin_pct: number;
}

export interface DepartmentMetricsRaw {
  total: number;
  limit?: number;
  offset?: number;
  items: DepartmentMetricItem[];
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

export async function loadFullWindowDepartmentMetrics(): Promise<DepartmentMetricsRaw> {
  if (getApiMode() === "offline") {
    const mod = await import("@/fixtures/department-metrics.json");
    return mod.default as unknown as DepartmentMetricsRaw;
  }
  const base = getBaseUrl();
  const PAGE_SIZE = 200;
  let offset = 0;
  let total = 0;
  const items: DepartmentMetricItem[] = [];

  while (true) {
    const res = await fetch(
      `${base}/api/department-metrics?limit=${PAGE_SIZE}&offset=${offset}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      throw new Error(`Department metrics fetch failed: ${res.status}`);
    }
    const body = (await res.json()) as DepartmentMetricsRaw;
    total = body.total;
    items.push(...body.items);
    if (items.length >= total || body.items.length === 0) break;
    offset += PAGE_SIZE;
  }

  return { total, limit: items.length, offset: 0, items };
}
