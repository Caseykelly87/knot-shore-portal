/**
 * Server-side exceptions data fetcher and client-side filter logic
 * for the /exceptions page.
 *
 * fetchExceptionsData fetches all anomalies (paginated via the api's
 * 200-row limit) plus dim_stores, then composes into a sorted view
 * model. Filtering happens client-side via applyFilters; the dataset
 * is small enough (983 rows) that re-filtering on every keystroke is
 * imperceptible.
 */

import { headers } from "next/headers";

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

interface AnomalyFlagRaw {
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

interface AnomaliesEnvelope {
  total: number;
  limit: number;
  offset: number;
  items: AnomalyFlagRaw[];
}

interface DimStoreRaw {
  store_id: number;
  store_name: string;
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

// Rule format families. Anything not listed defaults to currency formatting
// (revenue rules, yoy_comp, anything band-shaped that returns dollar values).
const PERCENT_RULES = new Set(["labor_cost_high", "labor_cost_low", "margin_low"]);
const COUNT_RULES = new Set(["transactions_band", "transactions_low", "transactions_high", "basket_low"]);

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

function formatValueForRule(ruleId: string, value: number): string {
  if (PERCENT_RULES.has(ruleId)) return formatPercent(value);
  if (COUNT_RULES.has(ruleId)) return formatCount(value);
  return formatCurrency(value);
}

function synthesizeDescription(row: AnomalyFlagRaw): string {
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

function getBaseUrl(): string {
  const h = headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function fetchExceptionsData(): Promise<ExceptionsData> {
  const base = getBaseUrl();

  const [anomaliesRes, dimStoresRes] = await Promise.all([
    fetch(`${base}/api/anomalies?limit=200`, { cache: "no-store" }),
    fetch(`${base}/api/dim-stores`, { cache: "no-store" }),
  ]);

  if (!anomaliesRes.ok || !dimStoresRes.ok) {
    throw new Error(
      `Exceptions data fetch failed: anomalies=${anomaliesRes.status} dimStores=${dimStoresRes.status}`,
    );
  }

  const [page1, dimStores] = await Promise.all([
    anomaliesRes.json() as Promise<AnomaliesEnvelope>,
    dimStoresRes.json() as Promise<DimStoreRaw[]>,
  ]);

  // Offline mode returns the full fixture in one call (route handler ignores
  // limit/offset). Online mode respects pagination, so we need to fan out
  // additional fetches for pages 2..N when the first page didn't cover total.
  let allItems = page1.items;

  if (page1.items.length < page1.total) {
    const remainingPages: Promise<AnomaliesEnvelope>[] = [];
    for (let offset = page1.items.length; offset < page1.total; offset += 200) {
      remainingPages.push(
        fetch(`${base}/api/anomalies?limit=200&offset=${offset}`, { cache: "no-store" }).then((r) => {
          if (!r.ok) throw new Error(`Pagination fetch failed at offset=${offset}: ${r.status}`);
          return r.json();
        }),
      );
    }
    const additionalPages = await Promise.all(remainingPages);
    for (const page of additionalPages) {
      allItems = allItems.concat(page.items);
    }
  }

  const fullEnvelope: AnomaliesEnvelope = {
    total: page1.total,
    limit: page1.limit,
    offset: 0,
    items: allItems,
  };

  return shapeExceptionsData(fullEnvelope, dimStores);
}
