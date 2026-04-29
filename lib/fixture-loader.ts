import storeMetricsRaw from "@/fixtures/store-metrics.json";
import anomaliesRaw from "@/fixtures/anomalies.json";
import dashboardSummaryRaw from "@/fixtures/dashboard-summary.json";
import healthRaw from "@/fixtures/health.json";

import type {
  PaginatedStoreMetrics,
  PaginatedAnomalies,
  DashboardSummary,
  Health,
} from "./types";

export function loadStoreMetricsFixture(): PaginatedStoreMetrics {
  return storeMetricsRaw as PaginatedStoreMetrics;
}

export function loadAnomaliesFixture(): PaginatedAnomalies {
  return anomaliesRaw as PaginatedAnomalies;
}

export function loadDashboardSummaryFixture(): DashboardSummary {
  return dashboardSummaryRaw as DashboardSummary;
}

export function loadHealthFixture(): Health {
  return healthRaw as Health;
}
