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
import { fetchPaginated } from "@/lib/pagination";

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
  return fetchPaginated<StoreMetricItem>(base, "/api/store-metrics");
}

export async function loadFullWindowDepartmentMetrics(): Promise<DepartmentMetricsRaw> {
  if (getApiMode() === "offline") {
    const mod = await import("@/fixtures/department-metrics.json");
    return mod.default as unknown as DepartmentMetricsRaw;
  }

  const base = getBaseUrl();
  return fetchPaginated<DepartmentMetricItem>(base, "/api/department-metrics");
}
