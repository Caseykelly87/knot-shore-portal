import { fetchDashboardData } from "@/lib/dashboard-data";
import { KPICardsRow } from "@/components/dashboard/KPICardsRow";
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart";
import { TopStoresChart } from "@/components/dashboard/TopStoresChart";
import { ExceptionSeverityCard } from "@/components/dashboard/ExceptionSeverityCard";
import { DashboardWindowIndicator } from "@/components/dashboard/DashboardWindowIndicator";
import { TradeAreaComparison } from "@/components/dashboard/TradeAreaComparison";

export default async function DashboardPage() {
  const data = await fetchDashboardData();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <header className="space-y-3">
        <h1 className="font-display text-4xl tracking-tight text-brand-deep-navy">
          Performance Overview
        </h1>
        <DashboardWindowIndicator
          windowStartDate={data.windowStartDate}
          windowEndDate={data.windowEndDate}
          periods={data.periods}
        />
      </header>

      <KPICardsRow data={data} />
      <SalesTrendChart data={data.dailyTrend} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TopStoresChart data={data.topStores} />
        </div>
        <ExceptionSeverityCard counts={data.exceptionSeverityCounts} />
      </div>

      <TradeAreaComparison summaries={data.tradeAreaSummaries} />
    </div>
  );
}
