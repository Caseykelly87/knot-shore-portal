import { fetchStoresIndexData } from "@/lib/stores-index-data";
import { StoresIndexClient } from "@/components/stores/StoresIndexClient";

export default async function StoresIndexPage() {
  const entries = await fetchStoresIndexData();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-4xl tracking-tight text-brand-deep-navy">
          Stores
        </h1>
        <p className="text-muted-foreground">
          Knot Shore Grocery — {entries.length} store locations
        </p>
      </header>

      <p className="text-sm text-muted-foreground max-w-3xl">
        Eight Knot Shore Grocery locations across the network. Each store operates
        within one of three trade-area profiles. Sales totals and exception counts
        cover the full available window.
      </p>

      <StoresIndexClient entries={entries} />
    </div>
  );
}
