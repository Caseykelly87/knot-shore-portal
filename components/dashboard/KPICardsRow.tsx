import { KPICard } from "./KPICard";
import { formatCurrency, formatCount, formatPercent } from "@/lib/formatters";
import type { DashboardData } from "@/lib/dashboard-data";

interface KPICardsRowProps {
  data: DashboardData;
}

export function KPICardsRow({ data }: KPICardsRowProps) {
  const { kpiDeltas } = data;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        label="Total Sales"
        value={formatCurrency(data.totalSales)}
        helperText="Jul 2024 – Dec 2025"
        accent="kelp-green"
        popDelta={kpiDeltas.totalSales.popDelta}
        yoyDelta={kpiDeltas.totalSales.yoyDelta}
        deltaSemantics="higher-is-good"
      />
      <KPICard
        label="Total Transactions"
        value={formatCount(data.totalTransactions)}
        helperText="Across all stores"
        accent="sea-glass"
        popDelta={kpiDeltas.totalTransactions.popDelta}
        yoyDelta={kpiDeltas.totalTransactions.yoyDelta}
        deltaSemantics="higher-is-good"
      />
      <KPICard
        label="Active Exceptions"
        value={formatCount(data.activeExceptions)}
        helperText={`${formatCount(data.exceptionSeverityCounts.critical)} critical, ${formatCount(data.exceptionSeverityCounts.warning)} warning, ${formatCount(data.exceptionSeverityCounts.info)} info`}
        accent="shore-rust"
        popDelta={kpiDeltas.activeExceptions.popDelta}
        yoyDelta={kpiDeltas.activeExceptions.yoyDelta}
        deltaSemantics="lower-is-good"
      />
      <KPICard
        label="Avg Labor Cost Pct"
        value={formatPercent(data.avgLaborCostPct)}
        helperText="Average across stores"
        accent="deep-navy"
        popDelta={kpiDeltas.avgLaborCostPct.popDelta}
        yoyDelta={kpiDeltas.avgLaborCostPct.yoyDelta}
        deltaSemantics="neutral"
      />
    </div>
  );
}
