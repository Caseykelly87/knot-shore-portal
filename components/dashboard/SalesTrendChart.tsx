"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SalesTrendChartProps {
  data: Array<{ date: string; totalSales: number; priorYearSales: number | null }>;
}

// X-axis ticks span a multi-month window, so month + year ("Jul 2025") keeps
// the year visible without the clutter of a day on every tick.
export function formatAxisDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// The tooltip is where the current and prior-year lines (drawn at the same
// x-position) are disambiguated, so it carries the full date including year.
export function formatTooltipDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Derive the series years from the plotted dates rather than hardcoding them,
// so a changed dashboard window keeps the legend truthful. The current series
// year is the most common year among the rows (ties resolve to the later year);
// the prior series is that minus one. Returns null for empty data so the
// component can fall back to non-year labels.
export function deriveSeriesYears(
  data: Array<{ date: string }>,
): { currentYear: number; priorYear: number } | null {
  if (data.length === 0) return null;
  const counts: Record<number, number> = {};
  data.forEach((row) => {
    const year = new Date(row.date + "T00:00:00Z").getUTCFullYear();
    counts[year] = (counts[year] ?? 0) + 1;
  });
  let currentYear = -Infinity;
  let bestCount = -1;
  Object.keys(counts).forEach((key) => {
    const year = Number(key);
    const count = counts[year];
    if (count > bestCount || (count === bestCount && year > currentYear)) {
      bestCount = count;
      currentYear = year;
    }
  });
  return { currentYear, priorYear: currentYear - 1 };
}

function formatTickValue(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatTooltipValue(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function SalesTrendChart({ data }: SalesTrendChartProps) {
  const tickInterval = Math.floor(data.length / 6) || 1;
  const ticks = data
    .filter((_, i) => i % tickInterval === 0)
    .map((d) => d.date);
  const hasPriorYearData = data.some((d) => d.priorYearSales !== null);
  const seriesYears = deriveSeriesYears(data);
  const currentName = seriesYears ? String(seriesYears.currentYear) : "Current";
  const priorName = seriesYears ? String(seriesYears.priorYear) : "Prior year";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daily Sales Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 12, left: 12, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                ticks={ticks}
                tickFormatter={formatAxisDate}
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tickFormatter={formatTickValue}
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
                width={60}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatTooltipValue(value as number | null),
                  name as string,
                ]}
                labelFormatter={formatTooltipDate}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
              />
              {hasPriorYearData && <Legend wrapperStyle={{ fontSize: "0.875rem" }} />}
              {hasPriorYearData && (
                <Line
                  type="monotone"
                  dataKey="priorYearSales"
                  name={priorName}
                  stroke="var(--brand-sea-glass)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
              )}
              <Line
                type="monotone"
                dataKey="totalSales"
                name={currentName}
                stroke="var(--brand-kelp-green)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "var(--brand-kelp-green)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
