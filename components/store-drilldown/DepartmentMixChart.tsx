"use client";

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
import { formatCurrency, formatPercent } from "@/lib/formatters";

interface DepartmentMixChartProps {
  data: Array<{
    departmentId: number;
    departmentName: string;
    totalSales: number;
    revenueShare: number;
  }>;
}

function formatTickValue(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function DepartmentMixChart({ data }: DepartmentMixChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Department Mix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full">
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
                dataKey="departmentName"
                width={140}
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                formatter={(value: number, _name, props) => {
                  const share = (props.payload as { revenueShare?: number } | undefined)?.revenueShare ?? 0;
                  return [`${formatCurrency(value)} (${formatPercent(share)})`, "Revenue"];
                }}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
                cursor={{ fill: "hsl(var(--muted))" }}
              />
              <Bar dataKey="totalSales" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
