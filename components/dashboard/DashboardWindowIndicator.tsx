import type { DashboardPeriod, DashboardPeriods } from "@/lib/dashboard-periods";

interface DashboardWindowIndicatorProps {
  windowStartDate: string | null;
  windowEndDate: string | null;
  periods: DashboardPeriods | null;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function parseIso(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

function formatMonthYear(iso: string): string {
  const { year, month } = parseIso(iso);
  return `${MONTHS[month - 1]} ${year}`;
}

function formatRange(period: DashboardPeriod): string {
  const start = parseIso(period.start);
  const end = parseIso(period.end);
  if (start.year === end.year) {
    return `${MONTHS[start.month - 1]}–${MONTHS[end.month - 1]} ${end.year}`;
  }
  return `${MONTHS[start.month - 1]} ${start.year} – ${MONTHS[end.month - 1]} ${end.year}`;
}

export function DashboardWindowIndicator({
  windowStartDate,
  windowEndDate,
  periods,
}: DashboardWindowIndicatorProps) {
  if (!windowStartDate || !windowEndDate) return null;

  const windowText = `Knot Shore Grocery — ${formatMonthYear(windowStartDate)} through ${formatMonthYear(windowEndDate)}`;

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground">{windowText}</p>
      {periods && (
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2 w-3 rounded-sm bg-brand-kelp-green"
            />
            <dt className="font-medium text-foreground/80">Recent</dt>
            <dd className="tabular-nums">{formatRange(periods.recent)}</dd>
          </div>
          {periods.pop && (
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-2 w-3 rounded-sm bg-brand-sea-glass"
              />
              <dt className="font-medium text-foreground/80">PoP</dt>
              <dd className="tabular-nums">{formatRange(periods.pop)}</dd>
            </div>
          )}
          {periods.yoy && (
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-2 w-3 rounded-sm bg-brand-deep-navy/60"
              />
              <dt className="font-medium text-foreground/80">YoY</dt>
              <dd className="tabular-nums">{formatRange(periods.yoy)}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
