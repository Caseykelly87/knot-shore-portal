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

      <p className="max-w-3xl text-muted-foreground">
        This page is the start-of-day view for operations leads and regional managers across the
        eight Knot Shore Grocery stores. It shows period-level revenue and transaction totals
        against prior-period and year-over-year baselines, the leading stores by revenue, the
        exception severity breakdown, and a trade-area comparison. From here a viewer decides
        which stores need a closer look, which exceptions are worth triaging today, and which
        trade-area patterns are worth pursuing further.
      </p>

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
