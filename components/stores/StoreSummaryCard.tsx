import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatCount } from "@/lib/formatters";
import type { StoresIndexEntry } from "@/lib/stores-index-data";

interface StoreSummaryCardProps {
  entry: StoresIndexEntry;
}

const TRADE_AREA_LABELS: Record<string, string> = {
  "suburban-family": "Suburban / Family",
  "urban-dense": "Urban / Dense",
  "value-market": "Value Market",
};

const TRADE_AREA_BADGE_STYLES: Record<string, string> = {
  "suburban-family":
    "bg-brand-kelp-green/10 text-brand-kelp-green border-brand-kelp-green/30",
  "urban-dense":
    "bg-brand-sea-glass/15 text-brand-deep-navy border-brand-sea-glass/40",
  "value-market":
    "bg-severity-warning/15 text-severity-warning-strong border-severity-warning/40",
};

const TRADE_AREA_BORDERS: Record<string, string> = {
  "suburban-family": "border-l-brand-kelp-green",
  "urban-dense": "border-l-brand-sea-glass",
  "value-market": "border-l-severity-warning",
};

export function StoreSummaryCard({ entry }: StoreSummaryCardProps) {
  const tradeLabel = TRADE_AREA_LABELS[entry.tradeAreaProfile] ?? entry.tradeAreaProfile;
  const tradeBadge =
    TRADE_AREA_BADGE_STYLES[entry.tradeAreaProfile] ??
    "bg-muted text-muted-foreground border-border";
  const borderAccent =
    TRADE_AREA_BORDERS[entry.tradeAreaProfile] ?? "border-l-brand-deep-navy";

  const hasCritical = entry.severityCounts.critical > 0;
  const hasExceptions = entry.exceptionCount > 0;
  const exceptionColor = hasCritical
    ? "text-brand-shore-rust"
    : hasExceptions
      ? "text-foreground"
      : "text-muted-foreground";

  return (
    <Link
      href={`/stores/${entry.storeId}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-sea-glass focus-visible:ring-offset-2 rounded-xl"
    >
      <Card
        className={cn(
          "border-l-4 h-full transition-shadow group-hover:shadow-md group-hover:ring-brand-sea-glass/60",
          borderAccent,
        )}
      >
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-xl tracking-tight text-brand-deep-navy leading-tight">
              {entry.storeName}
            </h3>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0",
                tradeBadge,
              )}
            >
              {tradeLabel}
            </span>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total Sales
            </p>
            <p className="font-sans text-2xl font-semibold tabular-nums text-brand-deep-navy mt-0.5">
              {formatCurrency(entry.totalSales)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="font-medium tabular-nums text-brand-deep-navy">
                {formatCount(entry.totalTransactions)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Exceptions</p>
              <p className={cn("font-medium tabular-nums", exceptionColor)}>
                {formatCount(entry.exceptionCount)}
                {hasCritical && (
                  <span className="ml-1 text-xs font-normal text-brand-shore-rust">
                    ({entry.severityCounts.critical} critical)
                  </span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
