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

export interface Health {
  status: string;
  version: string;
  db: string;
  data_source: string;
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
