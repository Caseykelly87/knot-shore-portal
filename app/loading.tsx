import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-4xl tracking-tight text-brand-deep-navy">
          Daily Dashboard
        </h1>
        <p className="text-muted-foreground">
          Knot Shore Grocery — July 1 through December 31, 2025
        </p>
      </header>

      <DashboardSkeleton />
    </div>
  );
}
