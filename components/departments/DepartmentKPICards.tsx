import { KPICard } from "@/components/dashboard/KPICard";
import { formatCurrency, formatCount, formatPercent } from "@/lib/formatters";

interface DepartmentKPICardsProps {
  totalSales: number;
  totalTransactions: number;
  avgDailySales: number;
  revenueShare: number;
}

export function DepartmentKPICards({
  totalSales,
  totalTransactions,
  avgDailySales,
  revenueShare,
}: DepartmentKPICardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        label="Total Sales"
        value={formatCurrency(totalSales)}
        helperText="Across all stores carrying this department"
        accent="kelp-green"
      />
      <KPICard
        label="Total Transactions"
        value={formatCount(totalTransactions)}
        helperText="In this department"
        accent="sea-glass"
      />
      <KPICard
        label="Avg Daily Sales"
        value={formatCurrency(avgDailySales)}
        helperText="Per day across the window"
        accent="deep-navy"
      />
      <KPICard
        label="Revenue Share"
        value={formatPercent(revenueShare)}
        helperText="Of all department sales"
        accent="shore-rust"
      />
    </div>
  );
}
