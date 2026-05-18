"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TopStoresChartProps {
  data: Array<{ storeId: string; storeName: string; totalSales: number }>;
}

const BAR_PALETTE = [
  "var(--brand-deep-navy)",
  "#2C4356",
  "var(--brand-kelp-green)",
  "#52866A",
  "#6A988B",
  "var(--brand-sea-glass)",
  "#9CC1B8",
  "#B9D3CC",
];

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

export function TopStoresChart({ data }: TopStoresChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Stores by Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 12, left: 12, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={formatTickValue}
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                type="category"
                dataKey="storeName"
                width={120}
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                formatter={(value: number) => [formatTooltipValue(value), "Total Sales"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
                cursor={{ fill: "hsl(var(--muted))" }}
              />
              <Bar dataKey="totalSales" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={entry.storeId}
                    fill={BAR_PALETTE[index % BAR_PALETTE.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
