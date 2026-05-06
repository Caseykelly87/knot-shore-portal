import { Suspense } from "react";
import { fetchExceptionsData } from "@/lib/exceptions-data-server";
import { ExceptionsContent } from "@/components/exceptions/ExceptionsContent";

export default async function ExceptionsPage() {
  const data = await fetchExceptionsData();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Exceptions</h1>
        <p className="text-muted-foreground">
          Operational triage view across all stores. {data.rows.length.toLocaleString()} exceptions in the canonical window.
        </p>
      </header>

      <Suspense>
        <ExceptionsContent data={data} />
      </Suspense>
    </div>
  );
}
