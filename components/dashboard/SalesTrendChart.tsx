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

function formatTickDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
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
                tickFormatter={formatTickDate}
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
                labelFormatter={formatTickDate}
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
                  name="Prior year"
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
                name="Current"
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
