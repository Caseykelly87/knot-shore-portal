import { notFound } from "next/navigation";

interface StorePageProps {
  params: { id: string };
}

export default async function StorePage({ params }: StorePageProps) {
  const storeId = parseInt(params.id, 10);
  if (isNaN(storeId) || storeId < 1 || storeId > 8) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Store {storeId}</h1>
        <p className="text-muted-foreground">
          Drilldown content lands in subsequent commits.
        </p>
      </header>

      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Per-store data fetcher and components in commits 2-6.
      </div>
    </div>
  );
}
