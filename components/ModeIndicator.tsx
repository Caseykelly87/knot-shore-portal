import { getApiMode } from "@/lib/api-mode";

export function ModeIndicator() {
  const mode = getApiMode();
  const label = mode === "online" ? "Live Data" : "Demo Mode";
  const colorClasses =
    mode === "online"
      ? "bg-brand-kelp-green/10 text-brand-kelp-green border-brand-kelp-green/30"
      : "bg-severity-warning/10 text-severity-warning-strong border-severity-warning/30";
  const dotClasses =
    mode === "online" ? "bg-brand-kelp-green" : "bg-severity-warning";
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
