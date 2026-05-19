import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type KPIAccent = "deep-navy" | "kelp-green" | "sea-glass" | "shore-rust";

export type DeltaSemantics = "higher-is-good" | "lower-is-good" | "neutral";

interface KPICardProps {
  label: string;
  value: string;
  helperText?: string;
  accent?: KPIAccent;
  className?: string;
  popDelta?: number | null;
  yoyDelta?: number | null;
  deltaSemantics?: DeltaSemantics;
}

const ACCENT_BORDER: Record<KPIAccent, string> = {
  "deep-navy": "border-l-brand-deep-navy",
  "kelp-green": "border-l-brand-kelp-green",
  "sea-glass": "border-l-brand-sea-glass",
  "shore-rust": "border-l-brand-shore-rust",
};

function classifyDelta(value: number, semantics: DeltaSemantics): string {
  if (semantics === "neutral") return "text-brand-sea-glass";
  if (value === 0) return "text-muted-foreground";
  const positive = value > 0;
  if (semantics === "higher-is-good") {
    return positive ? "text-brand-kelp-green" : "text-brand-shore-rust";
  }
  return positive ? "text-brand-shore-rust" : "text-brand-kelp-green";
}

function formatDeltaPercent(value: number): string {
  const pct = value * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function DeltaIndicator({
  label,
  value,
  semantics,
}: {
  label: string;
  value: number | null | undefined;
  semantics: DeltaSemantics;
}) {
  if (value === null || value === undefined) {
    return (
      <span className="text-muted-foreground/70 tabular-nums">
        <span className="font-medium">{label}:</span> —
      </span>
    );
  }
  const arrow = value > 0 ? "↑" : value < 0 ? "↓" : "·";
  return (
    <span className={cn("tabular-nums", classifyDelta(value, semantics))}>
      <span className="text-muted-foreground font-medium">{label}:</span>{" "}
      {formatDeltaPercent(value)} {arrow}
    </span>
  );
}

export function KPICard({
  label,
  value,
  helperText,
  accent,
  className,
  popDelta,
  yoyDelta,
  deltaSemantics = "higher-is-good",
}: KPICardProps) {
  const showDeltas = popDelta !== undefined || yoyDelta !== undefined;

  return (
    <Card
      className={cn(
        accent && `border-l-4 ${ACCENT_BORDER[accent]}`,
        className,
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight tabular-nums text-brand-deep-navy">
          {value}
        </div>
        {helperText && (
          <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
        )}
        {showDeltas && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
            <DeltaIndicator label="PoP" value={popDelta} semantics={deltaSemantics} />
            <DeltaIndicator label="YoY" value={yoyDelta} semantics={deltaSemantics} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
