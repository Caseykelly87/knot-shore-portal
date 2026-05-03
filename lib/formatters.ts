/**
 * Display formatters for dashboard values.
 *
 * Currency uses USD by default with no fractional cents on the
 * dashboard's high-magnitude totals. Percentages are formatted
 * with one decimal place. Counts use locale-aware thousands
 * separators.
 */

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
