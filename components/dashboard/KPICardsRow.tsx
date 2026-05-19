import { KPICard } from "./KPICard";
import { formatCurrency, formatCount, formatPercent } from "@/lib/formatters";
import type { DashboardData } from "@/lib/dashboard-data";

interface KPICardsRowProps {
  data: DashboardData;
}

export function KPICardsRow({ data }: KPICardsRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        label="Total Sales"
        value={formatCurrency(data.totalSales)}
        helperText="Jul 2024 – Dec 2025"
        accent="kelp-green"
      />
      <KPICard
        label="Total Transactions"
        value={formatCount(data.totalTransactions)}
        helperText="Across all stores"
        accent="sea-glass"
      />
      <KPICard
        label="Active Exceptions"
        value={formatCount(data.activeExceptions)}
        helperText={`${formatCount(data.exceptionSeverityCounts.critical)} critical, ${formatCount(data.exceptionSeverityCounts.warning)} warning, ${formatCount(data.exceptionSeverityCounts.info)} info`}
        accent="shore-rust"
      />
      <KPICard
        label="Avg Labor Cost Pct"
        value={formatPercent(data.avgLaborCostPct)}
        helperText="Average across stores"
        accent="deep-navy"
      />
    </div>
  );
}
