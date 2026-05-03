import storeMetricsRaw from "@/fixtures/store-metrics.json";
import anomaliesRaw from "@/fixtures/anomalies.json";
import dashboardSummaryRaw from "@/fixtures/dashboard-summary.json";
import healthRaw from "@/fixtures/health.json";

import { logger } from "@/lib/logger";
import type {
  PaginatedStoreMetrics,
  PaginatedAnomalies,
  DashboardSummary,
  Health,
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
