"use client";

import { useRouter } from "next/navigation";
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

interface DepartmentByStoreChartProps {
  data: Array<{
    storeId: number;
    storeName: string;
    tradeAreaProfile: string;
    totalSales: number;
  }>;
}

const TRADE_AREA_COLORS: Record<string, string> = {
  "suburban-family": "var(--brand-kelp-green)",
  "urban-dense": "var(--brand-sea-glass)",
  "value-market": "var(--severity-warning)",
};

const TRADE_AREA_LABELS: Record<string, string> = {
  "suburban-family": "Suburban / Family",
  "urban-dense": "Urban / Dense",
  "value-market": "Value Market",
};

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

export function DepartmentByStoreChart({ data }: DepartmentByStoreChartProps) {
  const router = useRouter();

  const handleBarClick = (payload: { storeId?: number } | undefined) => {
    if (payload?.storeId !== undefined) {
      router.push(`/stores/${payload.storeId}`);
    }
  };

  const presentProfiles = Array.from(new Set(data.map((d) => d.tradeAreaProfile)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sales by Store</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
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
                width={160}
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
              <Bar
                dataKey="totalSales"
                radius={[0, 4, 4, 0]}
                onClick={handleBarClick}
                cursor="pointer"
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.storeId}
                    fill={
                      TRADE_AREA_COLORS[entry.tradeAreaProfile] ?? "var(--brand-deep-navy)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {presentProfiles.map((profile) => (
            <div key={profile} className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-2 w-3 rounded-sm"
                style={{
                  backgroundColor:
                    TRADE_AREA_COLORS[profile] ?? "var(--brand-deep-navy)",
                }}
              />
              <span>{TRADE_AREA_LABELS[profile] ?? profile}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
