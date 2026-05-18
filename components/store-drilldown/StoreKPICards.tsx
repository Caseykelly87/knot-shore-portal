import { KPICard } from "@/components/dashboard/KPICard";
import { formatCurrency, formatCount, formatPercent } from "@/lib/formatters";

interface StoreKPICardsProps {
  totalSales: number;
  totalTransactions: number;
  activeExceptions: number;
  avgLaborCostPct: number;
}

export function StoreKPICards({
  totalSales,
  totalTransactions,
  activeExceptions,
  avgLaborCostPct,
}: StoreKPICardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        label="Total Sales"
        value={formatCurrency(totalSales)}
        helperText="Jul 1 – Dec 31, 2025"
        accent="kelp-green"
      />
      <KPICard
        label="Total Transactions"
        value={formatCount(totalTransactions)}
        helperText="At this store"
        accent="sea-glass"
      />
      <KPICard
        label="Active Exceptions"
        value={formatCount(activeExceptions)}
        helperText="At this store"
        accent="shore-rust"
      />
      <KPICard
        label="Avg Labor Cost Pct"
        value={formatPercent(avgLaborCostPct)}
        helperText="Daily average"
        accent="deep-navy"
      />
    </div>
  );
}
