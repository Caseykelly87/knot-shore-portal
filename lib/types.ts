export interface StoreMetricItem {
  date: string;
  store_id: number;
  total_sales: number;
  transaction_count: number;
  avg_basket_size: number | null;
  labor_cost_pct: number | null;
}

export interface PaginatedStoreMetrics {
  total: number;
  limit: number;
  offset: number;
  items: StoreMetricItem[];
}

export interface AnomalyFlagItem {
  date: string;
  store_id: number;
  rule_id: string;
  actual_value: number;
  expected_low: number;
  expected_high: number;
  distance_from_band: number;
  severity_score: number;
  severity_level: string;
}

export interface PaginatedAnomalies {
  total: number;
  limit: number;
  offset: number;
  items: AnomalyFlagItem[];
}

export interface StoreRevenueRank {
  store_id: number;
  total_sales: number;
}

export interface SeverityCount {
  severity_level: string;
  count: number;
}

export interface DailySalesPoint {
  date: string;
  total_sales: number;
  transaction_count: number;
}

export interface DashboardSummary {
  start_date: string;
  end_date: string;
  total_sales: number;
  total_transactions: number;
  average_labor_cost_pct: number | null;
  top_stores_by_revenue: StoreRevenueRank[];
  exception_count_by_severity: SeverityCount[];
  daily_sales_trend: DailySalesPoint[];
}

export interface HealthPipeline {
  status: string;
  mode?: string;
  canonical_path?: string;
  reason?: string;
}

export interface Health {
  status: string;
  version: string;
  grocery_pipeline: HealthPipeline;
  macro_pipeline: HealthPipeline;
}

export interface DimStore {
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

export interface DepartmentMetricItem {
  date: string;
  store_id: number;
  department_id: number;
  net_sales: number;
  transactions: number;
  units_sold: number;
  gross_margin_pct: number;
}

export interface PaginatedDepartmentMetrics {
  total: number;
  limit: number;
  offset: number;
  items: DepartmentMetricItem[];
}

export interface DetectionQualityGlobal {
  injected_pairs: number;
  matched_pairs: number;
  recall: number;
}

export interface DetectionQualityAnomalyTypeStats {
  injected: number;
  matched: number;
  recall: number;
}

export interface DetectionQualityContract {
  global_recall_threshold: number;
  fpr_threshold: number;
  passes: boolean;
  reasons: string[];
}

export interface DetectionQuality {
  global: DetectionQualityGlobal;
  by_anomaly_type: Record<string, DetectionQualityAnomalyTypeStats>;
  false_positive_rate: number;
  false_positives: number;
  negative_universe: number;
  flag_rate: number;
  total_flags: number;
  total_metric_rows: number;
  contract: DetectionQualityContract;
}
