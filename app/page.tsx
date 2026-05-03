import { fetchDashboardData } from "@/lib/dashboard-data";
import { KPICardsRow } from "@/components/dashboard/KPICardsRow";
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart";

export default async function DashboardPage() {
  const data = await fetchDashboardData();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Daily Dashboard</h1>
        <p className="text-muted-foreground">
          Knot Shore Grocery — July 1 through December 31, 2025
        </p>
      </header>

      <KPICardsRow data={data} />
      <SalesTrendChart data={data.dailyTrend} />

      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Top stores and exception severity card land in the next commit.
      </div>
    </div>
  );
}
