import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatCount, formatPercent } from "@/lib/formatters";
import type { DepartmentsIndexEntry } from "@/lib/departments-index-data";

interface DepartmentSummaryCardProps {
  entry: DepartmentsIndexEntry;
  totalStores: number;
}

export function DepartmentSummaryCard({ entry, totalStores }: DepartmentSummaryCardProps) {
  const coverageText =
    totalStores > 0
      ? `Available in ${entry.storeCoverage}/${totalStores} stores`
      : `Available in ${entry.storeCoverage} stores`;

  return (
    <Link
      href={`/departments/${entry.departmentId}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-sea-glass focus-visible:ring-offset-2 rounded-xl"
    >
      <Card className="border-l-4 border-l-brand-kelp-green h-full transition-shadow group-hover:shadow-md group-hover:ring-brand-sea-glass/60">
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-xl tracking-tight text-brand-deep-navy leading-tight">
              {entry.departmentName}
            </h3>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total Sales
            </p>
            <p className="font-sans text-2xl font-semibold tabular-nums text-brand-deep-navy mt-0.5">
              {formatCurrency(entry.totalSales)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="font-medium tabular-nums text-brand-deep-navy">
                {formatCount(entry.totalTransactions)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Gross Margin</p>
              <p className="font-medium tabular-nums text-brand-deep-navy">
                {formatPercent(entry.avgGrossMarginPct)}
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{coverageText}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
