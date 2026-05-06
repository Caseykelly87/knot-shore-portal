export default function ExceptionsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Exceptions</h1>
        <p className="text-muted-foreground">
          Operational triage view for canonical exception flags across all stores.
        </p>
      </header>

      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Filter sidebar, table, and detail panel land in subsequent commits.
      </div>
    </div>
  );
}
