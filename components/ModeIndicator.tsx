import { getApiMode } from "@/lib/api-mode";
import { wasFallbackUsed } from "@/lib/data-source-state";

type IndicatorState = "demo" | "live" | "live-fallback";

function resolveState(): IndicatorState {
  if (getApiMode() !== "online") return "demo";
  return wasFallbackUsed() ? "live-fallback" : "live";
}

export function ModeIndicator() {
  const state = resolveState();
  const label =
    state === "demo"
      ? "Demo Mode"
      : state === "live-fallback"
        ? "Live Data (Fallback)"
        : "Live Data";
  const colorClasses =
    state === "live"
      ? "bg-brand-kelp-green/10 text-brand-kelp-green border-brand-kelp-green/30"
      : "bg-severity-warning/10 text-severity-warning-strong border-severity-warning/30";
  const dotClasses =
    state === "live" ? "bg-brand-kelp-green" : "bg-severity-warning";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorClasses}`}
      data-testid="mode-indicator"
      aria-label={`Data source: ${label}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClasses}`} />
      {label}
    </span>
  );
}
