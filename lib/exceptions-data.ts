/**
 * Exceptions data shape transformer and client-side filter logic
 * for the /exceptions page.
 *
 * This module is pure (no server-only imports). The server-only
 * fetchExceptionsData lives in lib/exceptions-data-server.ts so that
 * client components can import shapeExceptionsData, applyFilters, and
 * the type definitions without pulling in next/headers.
 *
 * Filtering happens client-side via applyFilters; the dataset is
 * small enough (178 rows) that re-filtering on every keystroke is
 * imperceptible.
 */

export interface ExceptionRow {
  date: string;
  storeId: number;
  storeName: string;
  ruleId: string;
  severity: string;
  actualValue: number;
  expectedLow: number;
  expectedHigh: number;
  distanceFromBand: number;
  severityScore: number;
  description: string;
}

export interface ExceptionsData {
  rows: ExceptionRow[];
  uniqueSeverities: string[];
  uniqueRules: string[];
  uniqueStores: number[];
  storeNamesById: Record<number, string>;
}

export interface ExceptionsFilters {
  dateFrom?: string;
  dateTo?: string;
  severities?: string[];
  storeId?: number;
  ruleId?: string;
}

export interface AnomalyFlagRaw {
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

export interface AnomaliesEnvelope {
  total: number;
  limit: number;
  offset: number;
  items: AnomalyFlagRaw[];
}

export interface DimStoreRaw {
  store_id: number;
  store_name: string;
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

// Rule format families. The catalog matches the upstream rule_ids the API
// emits: revenue_band and avg_ticket_band carry dollar values, labor_pct_band
// carries a fraction, transactions_band carries an integer count, and
// yoy_comp carries a year-over-year ratio. The z-score rule carries
// dollars in actual_value and the rolling-mean baseline in expected_low,
// but reads off a different sentence shape (no upper/lower band), so it
// routes through its own description branch. Default branch is currency.
const PERCENT_RULES = new Set(["labor_pct_band"]);
const COUNT_RULES = new Set(["transactions_band"]);
const RATIO_RULES = new Set(["yoy_comp"]);
const ZSCORE_RULES = new Set(["revenue_zscore_28d"]);

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatRatio(value: number): string {
  return `${value.toFixed(2)}x`;
}

function formatValueForRule(ruleId: string, value: number): string {
  if (PERCENT_RULES.has(ruleId)) return formatPercent(value);
  if (COUNT_RULES.has(ruleId)) return formatCount(value);
  if (RATIO_RULES.has(ruleId)) return formatRatio(value);
  return formatCurrency(value);
}

function synthesizeDescription(row: AnomalyFlagRaw): string {
  if (ZSCORE_RULES.has(row.rule_id)) {
    const actual = formatCurrency(row.actual_value);
    const baseline = formatCurrency(row.expected_low);
    const zMagnitude = row.severity_score.toFixed(2);
    return `Actual ${actual} (${zMagnitude}σ from 28-day baseline ${baseline})`;
  }
  const actual = formatValueForRule(row.rule_id, row.actual_value);
  const low = formatValueForRule(row.rule_id, row.expected_low);
  const high = formatValueForRule(row.rule_id, row.expected_high);
  return `Actual ${actual} (expected ${low}–${high})`;
}

export function shapeExceptionsData(
  anomalies: AnomaliesEnvelope,
  dimStores: DimStoreRaw[],
): ExceptionsData {
  const storeNamesById: Record<number, string> = {};
  for (const s of dimStores) {
    storeNamesById[s.store_id] = s.store_name;
  }

  const rows: ExceptionRow[] = anomalies.items.map((item) => ({
    date: item.date,
    storeId: item.store_id,
    storeName: storeNamesById[item.store_id] ?? `Store ${item.store_id}`,
    ruleId: item.rule_id,
    severity: item.severity_level,
    actualValue: item.actual_value,
    expectedLow: item.expected_low,
    expectedHigh: item.expected_high,
    distanceFromBand: item.distance_from_band,
    severityScore: item.severity_score,
    description: synthesizeDescription(item),
  }));

  rows.sort((a, b) => {
    const sevDiff = (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99);
    if (sevDiff !== 0) return sevDiff;
    return b.date.localeCompare(a.date);
  });

  return {
    rows,
    uniqueSeverities: Array.from(new Set(rows.map((r) => r.severity))).sort(),
    uniqueRules: Array.from(new Set(rows.map((r) => r.ruleId))).sort(),
    uniqueStores: Array.from(new Set(rows.map((r) => r.storeId))).sort((a, b) => a - b),
    storeNamesById,
  };
}

export function applyFilters(rows: ExceptionRow[], filters: ExceptionsFilters): ExceptionRow[] {
  return rows.filter((row) => {
    // ISO 8601 dates sort lexically the same way they sort chronologically,
    // so string comparison is the correct operator here — no Date parse needed.
    if (filters.dateFrom && row.date < filters.dateFrom) return false;
    if (filters.dateTo && row.date > filters.dateTo) return false;
    if (filters.severities && filters.severities.length > 0 && !filters.severities.includes(row.severity)) {
      return false;
    }
    if (filters.storeId !== undefined && row.storeId !== filters.storeId) return false;
    if (filters.ruleId && row.ruleId !== filters.ruleId) return false;
    return true;
  });
}
