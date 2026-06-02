"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DepartmentTrendChartProps {
  data: Array<{ date: string; totalSales: number }>;
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

// The tooltip carries the full date including year so a hovered point is
// unambiguous regardless of how coarse the axis ticks are.
export function formatTooltipDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTickValue(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatTooltipValue(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function DepartmentTrendChart({ data }: DepartmentTrendChartProps) {
  const tickInterval = Math.max(1, Math.floor(data.length / 6));
  const ticks = data.filter((_, i) => i % tickInterval === 0).map((d) => d.date);

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
                formatter={(value: number) => [formatTooltipValue(value), "Sales"]}
                labelFormatter={formatTooltipDate}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
              />
              <Line
                type="monotone"
                dataKey="totalSales"
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
