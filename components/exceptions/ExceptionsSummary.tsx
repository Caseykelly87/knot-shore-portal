"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExceptionSeverityCard } from "@/components/dashboard/ExceptionSeverityCard";
import { formatCount } from "@/lib/formatters";
import type { ExceptionRow } from "@/lib/exceptions-data";

export interface SeveritySummary {
  info: number;
  warning: number;
  critical: number;
}

// Count rows by severity level. Only the three known levels are tracked
// because that is the vocabulary the severity card renders; any other level
// is ignored rather than silently folded into one of these buckets.
export function summarizeBySeverity(rows: ExceptionRow[]): SeveritySummary {
  const summary: SeveritySummary = { info: 0, warning: 0, critical: 0 };
  rows.forEach((row) => {
    if (
      row.severity === "info" ||
      row.severity === "warning" ||
      row.severity === "critical"
    ) {
      summary[row.severity] += 1;
    }
  });
  return summary;
}

export interface RuleCount {
  ruleId: string;
  count: number;
}

// Count rows per rule id, ranked most-frequent first. Ties break on rule id
// ascending so the order is stable across renders.
export function summarizeByRule(rows: ExceptionRow[]): RuleCount[] {
  const counts: Record<string, number> = {};
  rows.forEach((row) => {
    counts[row.ruleId] = (counts[row.ruleId] ?? 0) + 1;
  });
  return Object.keys(counts)
    .map((ruleId) => ({ ruleId, count: counts[ruleId] }))
    .sort((a, b) => b.count - a.count || a.ruleId.localeCompare(b.ruleId));
}

export interface MonthBucket {
  month: string; // "YYYY-MM"
  count: number;
}

// Bucket rows by calendar month, chronologically ascending. Slicing the ISO
// date avoids a Date parse and its timezone pitfalls: "2025-07-15" -> "2025-07".
export function bucketByMonth(rows: ExceptionRow[]): MonthBucket[] {
  const counts: Record<string, number> = {};
  rows.forEach((row) => {
    const month = row.date.slice(0, 7);
    counts[month] = (counts[month] ?? 0) + 1;
  });
  return Object.keys(counts)
    .sort()
    .map((month) => ({ month, count: counts[month] }));
}

// "2025-07" -> "Jul 2025" for axis ticks and the tooltip label.
function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split("-");
  const d = new Date(Date.UTC(Number(year), Number(monthNum) - 1, 1));
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function RuleSummaryCard({ ruleCounts }: { ruleCounts: RuleCount[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Exceptions by Rule</CardTitle>
      </CardHeader>
      <CardContent>
        {ruleCounts.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            No exceptions match the current filters.
          </p>
        ) : (
          <div className="space-y-1">
            {ruleCounts.map(({ ruleId, count }) => (
              <div
                key={ruleId}
                className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0"
              >
                <span
                  className="truncate font-mono text-xs text-muted-foreground"
                  title={ruleId}
                >
                  {ruleId}
                </span>
                <span className="text-sm font-mono tabular-nums">{formatCount(count)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrendCard({ buckets }: { buckets: MonthBucket[] }) {
  const chartData = buckets.map((b) => ({ ...b, label: formatMonthLabel(b.month) }));
  // Show ~6 evenly-spaced ticks; the card is only a third of the strip's width,
  // so labelling every month would crowd. Hovering a bar gives the exact month.
  const tickInterval = Math.max(1, Math.floor(chartData.length / 6));
  const ticks = chartData.filter((_, i) => i % tickInterval === 0).map((d) => d.label);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Exceptions Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full">
          {chartData.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              No exceptions match the current filters.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 8, left: -8, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="label"
                  ticks={ticks}
                  className="text-xs"
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  allowDecimals={false}
                  className="text-xs"
                  stroke="hsl(var(--muted-foreground))"
                  width={32}
                />
                <Tooltip
                  formatter={(value: number) => [formatCount(value), "Exceptions"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                  }}
                  cursor={{ fill: "hsl(var(--muted))" }}
                />
                <Bar dataKey="count" fill="var(--brand-kelp-green)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ExceptionsSummaryProps {
  rows: ExceptionRow[];
}

export function ExceptionsSummary({ rows }: ExceptionsSummaryProps) {
  // rows is the already-memoized filteredRows from ExceptionsContent, so this
  // recomputes only when the active filters change, keeping the strip a live
  // triage view of exactly what the table shows.
  const { severity, ruleCounts, buckets } = useMemo(
    () => ({
      severity: summarizeBySeverity(rows),
      ruleCounts: summarizeByRule(rows),
      buckets: bucketByMonth(rows),
    }),
    [rows],
  );

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <ExceptionSeverityCard counts={severity} />
      <RuleSummaryCard ruleCounts={ruleCounts} />
      <TrendCard buckets={buckets} />
    </div>
  );
}
