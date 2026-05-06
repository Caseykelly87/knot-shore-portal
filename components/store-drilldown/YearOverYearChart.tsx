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

interface YearOverYearChartProps {
  data: Array<{
    monthDay: string;
    currentYearSales: number;
    priorYearSales: number | null;
  }>;
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

export function YearOverYearChart({ data }: YearOverYearChartProps) {
  // Show ~6 ticks across the 184-day window for readability.
  const tickInterval = Math.max(1, Math.floor(data.length / 6));
  const ticks = data.filter((_, i) => i % tickInterval === 0).map((d) => d.monthDay);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Year-Over-Year Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 12, left: 12, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="monthDay"
                ticks={ticks}
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
                formatter={(value, name) => [formatTooltipValue(value as number | null), name as string]}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "0.875rem" }} />
              <Line
                type="monotone"
                dataKey="priorYearSales"
                name="2024"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="currentYearSales"
                name="2025"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
