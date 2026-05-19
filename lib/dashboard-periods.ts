/**
 * Period boundary derivation for the dashboard's PoP and YoY deltas.
 *
 * computeDashboardPeriods() takes the data window (the actual min/max
 * dates present in store-metrics) and derives three comparison periods:
 *
 * - recent: the slice of the window the deltas measure
 * - pop:    the slice immediately preceding recent, same length
 * - yoy:    the slice one year before recent, same length
 *
 * Windows are reasoned about in calendar months so the boundaries line
 * up with familiar period descriptors (e.g., Jul–Dec). For windows long
 * enough to support YoY (>= 13 months), the recent slice length is
 * min(totalMonths - 12, floor(totalMonths / 2)); the floor cap keeps
 * recent at most half the window once the window grows past two years.
 * For 2-to-12-month windows only PoP is available (window split in
 * half). For single-month windows no comparisons are computed.
 *
 * Dates are treated as calendar days in UTC; ISO YYYY-MM-DD strings
 * round-trip through Date with UTC midnight to avoid timezone drift.
 */

export interface DashboardPeriod {
  start: string;
  end: string;
}

export interface DashboardPeriods {
  recent: DashboardPeriod;
  pop: DashboardPeriod | null;
  yoy: DashboardPeriod | null;
}

function parseDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function firstDayOfMonth(year: number, monthZeroBased: number): Date {
  return new Date(Date.UTC(year, monthZeroBased, 1));
}

function lastDayOfMonth(year: number, monthZeroBased: number): Date {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0));
}

function monthSpan(start: Date, end: Date): number {
  return (
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth()) +
    1
  );
}

interface MonthCoord {
  year: number;
  month: number;
}

function addMonths(coord: MonthCoord, delta: number): MonthCoord {
  const totalMonths = coord.year * 12 + coord.month + delta;
  return { year: Math.floor(totalMonths / 12), month: ((totalMonths % 12) + 12) % 12 };
}

function periodFromMonths(start: MonthCoord, end: MonthCoord): DashboardPeriod {
  return {
    start: formatDate(firstDayOfMonth(start.year, start.month)),
    end: formatDate(lastDayOfMonth(end.year, end.month)),
  };
}

export function computeDashboardPeriods(
  windowStartIso: string | null,
  windowEndIso: string | null,
): DashboardPeriods | null {
  if (!windowStartIso || !windowEndIso) return null;

  const windowStart = parseDate(windowStartIso);
  const windowEnd = parseDate(windowEndIso);
  if (windowEnd < windowStart) return null;

  const startCoord: MonthCoord = {
    year: windowStart.getUTCFullYear(),
    month: windowStart.getUTCMonth(),
  };
  const endCoord: MonthCoord = {
    year: windowEnd.getUTCFullYear(),
    month: windowEnd.getUTCMonth(),
  };
  const totalMonths = monthSpan(windowStart, windowEnd);

  if (totalMonths >= 13) {
    const recentLength = Math.min(totalMonths - 12, Math.floor(totalMonths / 2));
    const recentStart = addMonths(endCoord, -(recentLength - 1));
    const popEnd = addMonths(recentStart, -1);
    const popStart = addMonths(popEnd, -(recentLength - 1));
    const yoyStart = addMonths(recentStart, -12);
    const yoyEnd = addMonths(endCoord, -12);

    return {
      recent: periodFromMonths(recentStart, endCoord),
      pop: periodFromMonths(popStart, popEnd),
      yoy: periodFromMonths(yoyStart, yoyEnd),
    };
  }

  if (totalMonths >= 2) {
    const recentLength = Math.floor(totalMonths / 2);
    const recentStart = addMonths(endCoord, -(recentLength - 1));
    const popEnd = addMonths(recentStart, -1);
    const popStart = addMonths(popEnd, -(recentLength - 1));
    return {
      recent: periodFromMonths(recentStart, endCoord),
      pop: popStart.year * 12 + popStart.month >= startCoord.year * 12 + startCoord.month
        ? periodFromMonths(popStart, popEnd)
        : null,
      yoy: null,
    };
  }

  return {
    recent: { start: windowStartIso, end: windowEndIso },
    pop: null,
    yoy: null,
  };
}

export interface KPIDelta {
  pop: number | null;
  yoy: number | null;
}

export function computeDelta(recent: number, baseline: number | null): number | null {
  if (baseline === null) return null;
  if (baseline === 0) return null;
  return (recent - baseline) / baseline;
}
