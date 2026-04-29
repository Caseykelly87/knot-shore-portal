import { getApiMode } from "@/lib/api-mode";

export function ModeIndicator() {
  const mode = getApiMode();
  const label = mode === "online" ? "Live Data" : "Demo Mode";
  const colorClasses =
    mode === "online"
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-amber-100 text-amber-800 border-amber-200";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorClasses}`}
      data-testid="mode-indicator"
      aria-label={`Data source: ${label}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          mode === "online" ? "bg-green-500" : "bg-amber-500"
        }`}
      />
      {label}
    </span>
  );
}
