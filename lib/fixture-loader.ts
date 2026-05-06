import storeMetricsRaw from "@/fixtures/store-metrics.json";
import anomaliesRaw from "@/fixtures/anomalies.json";
import dashboardSummaryRaw from "@/fixtures/dashboard-summary.json";
import healthRaw from "@/fixtures/health.json";
import dimStoresRaw from "@/fixtures/dim-stores.json";
import departmentMetricsRaw from "@/fixtures/department-metrics.json";

import { logger } from "@/lib/logger";
import type {
  PaginatedStoreMetrics,
  PaginatedAnomalies,
  DashboardSummary,
  Health,
  DimStore,
  PaginatedDepartmentMetrics,
} from "./types";

export function loadStoreMetricsFixture(): PaginatedStoreMetrics {
  logger.debug({ event: "fixture_loaded", source: "store_metrics" }, "fixture loaded");
  return storeMetricsRaw as PaginatedStoreMetrics;
}

export function loadAnomaliesFixture(): PaginatedAnomalies {
  logger.debug({ event: "fixture_loaded", source: "anomalies" }, "fixture loaded");
  return anomaliesRaw as PaginatedAnomalies;
}

export function loadDashboardSummaryFixture(): DashboardSummary {
  logger.debug({ event: "fixture_loaded", source: "dashboard_summary" }, "fixture loaded");
  return dashboardSummaryRaw as DashboardSummary;
}

export function loadHealthFixture(): Health {
  logger.debug({ event: "fixture_loaded", source: "health" }, "fixture loaded");
  return healthRaw as Health;
}

export function loadDimStoresFixture(): DimStore[] {
  logger.debug({ event: "fixture_loaded", source: "dim_stores" }, "fixture loaded");
  return dimStoresRaw as DimStore[];
}

export function loadDepartmentMetricsFixture(): PaginatedDepartmentMetrics {
  logger.debug({ event: "fixture_loaded", source: "department_metrics" }, "fixture loaded");
  return departmentMetricsRaw as PaginatedDepartmentMetrics;
}
