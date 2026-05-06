import { notFound } from "next/navigation";
import { fetchStoreData, type StoreData } from "@/lib/store-data";
import { StoreHeader } from "@/components/store-drilldown/StoreHeader";
import { StoreKPICards } from "@/components/store-drilldown/StoreKPICards";

interface StorePageProps {
  params: { id: string };
}

export default async function StorePage({ params }: StorePageProps) {
  const storeId = parseInt(params.id, 10);
  if (isNaN(storeId) || storeId < 1 || storeId > 8) {
    notFound();
  }

  let data: StoreData;
  try {
    data = await fetchStoreData(storeId);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <StoreHeader
        storeName={data.storeName}
        address={data.address}
        city={data.city}
        zip={data.zip}
        tradeAreaProfile={data.tradeAreaProfile}
        sqft={data.sqft}
        openDate={data.openDate}
      />

      <StoreKPICards
        totalSales={data.totalSales}
        totalTransactions={data.totalTransactions}
        activeExceptions={data.activeExceptions}
        avgLaborCostPct={data.avgLaborCostPct}
      />

      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Department mix, year-over-year trend, and top departments land in the next three commits.
      </div>
    </div>
  );
}
