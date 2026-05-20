import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatCount } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { TradeAreaSummary } from "@/lib/dashboard-data";

interface TradeAreaComparisonProps {
  summaries: TradeAreaSummary[];
}

const TRADE_AREA_LABELS: Record<string, string> = {
  "suburban-family": "Suburban / Family",
  "urban-dense": "Urban / Dense",
  "value-market": "Value Market",
};

const TRADE_AREA_BORDERS: Record<string, string> = {
  "suburban-family": "border-l-brand-kelp-green",
  "urban-dense": "border-l-brand-sea-glass",
  "value-market": "border-l-severity-warning",
};

const TRADE_AREA_BADGE_STYLES: Record<string, string> = {
  "suburban-family":
    "bg-brand-kelp-green/10 text-brand-kelp-green border-brand-kelp-green/30",
  "urban-dense":
    "bg-brand-sea-glass/15 text-brand-deep-navy border-brand-sea-glass/40",
  "value-market":
    "bg-severity-warning/15 text-severity-warning-strong border-severity-warning/40",
};

export function TradeAreaComparison({ summaries }: TradeAreaComparisonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trade-Area Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {summaries.map((s) => {
            const label = TRADE_AREA_LABELS[s.tradeArea] ?? s.tradeArea;
            const borderAccent =
              TRADE_AREA_BORDERS[s.tradeArea] ?? "border-l-brand-deep-navy";
            const badge =
              TRADE_AREA_BADGE_STYLES[s.tradeArea] ??
              "bg-muted text-muted-foreground border-border";
            return (
              <div
                key={s.tradeArea}
                className={cn(
                  "rounded-md border border-border bg-card border-l-4 p-4 space-y-3",
                  borderAccent,
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                      badge,
                    )}
                  >
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatCount(s.storeCount)}{" "}
                    {s.storeCount === 1 ? "store" : "stores"}
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Total Sales
                  </p>
                  <p className="font-sans text-xl font-semibold tabular-nums text-brand-deep-navy mt-0.5">
                    {formatCurrency(s.totalSales)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Avg per Store</p>
                    <p className="font-medium tabular-nums text-brand-deep-navy">
                      {formatCurrency(s.avgSalesPerStore)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Exceptions</p>
                    <p className="font-medium tabular-nums text-brand-deep-navy">
                      {formatCount(s.totalExceptions)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
