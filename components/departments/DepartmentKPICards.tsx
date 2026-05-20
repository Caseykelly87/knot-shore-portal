import { KPICard } from "@/components/dashboard/KPICard";
import { formatCurrency, formatCount, formatPercent } from "@/lib/formatters";
import type { DepartmentKpiDeltas } from "@/lib/department-data";

interface DepartmentKPICardsProps {
  totalSales: number;
  totalTransactions: number;
  avgDailySales: number;
  revenueShare: number;
  kpiDeltas: DepartmentKpiDeltas;
}

export function DepartmentKPICards({
  totalSales,
  totalTransactions,
  avgDailySales,
  revenueShare,
  kpiDeltas,
}: DepartmentKPICardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        label="Total Sales"
        value={formatCurrency(totalSales)}
        helperText="Across all stores carrying this department"
        accent="kelp-green"
        popDelta={kpiDeltas.totalSales.pop}
        yoyDelta={kpiDeltas.totalSales.yoy}
        deltaSemantics="higher-is-good"
      />
      <KPICard
        label="Total Transactions"
        value={formatCount(totalTransactions)}
        helperText="In this department"
        accent="sea-glass"
        popDelta={kpiDeltas.totalTransactions.pop}
        yoyDelta={kpiDeltas.totalTransactions.yoy}
        deltaSemantics="higher-is-good"
      />
      <KPICard
        label="Avg Daily Sales"
        value={formatCurrency(avgDailySales)}
        helperText="Per day across the window"
        accent="deep-navy"
        popDelta={kpiDeltas.avgDailySales.pop}
        yoyDelta={kpiDeltas.avgDailySales.yoy}
        deltaSemantics="higher-is-good"
      />
      <KPICard
        label="Revenue Share"
        value={formatPercent(revenueShare)}
        helperText="Of all department sales"
        accent="shore-rust"
        popDelta={kpiDeltas.revenueShare.pop}
        yoyDelta={kpiDeltas.revenueShare.yoy}
        deltaSemantics="higher-is-good"
      />
    </div>
  );
}
