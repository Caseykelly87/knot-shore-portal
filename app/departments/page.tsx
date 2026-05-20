import { fetchDepartmentsIndexData } from "@/lib/departments-index-data";
import { DepartmentsIndexClient } from "@/components/departments/DepartmentsIndexClient";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatMonthYear(iso: string): string {
  const [year, month] = iso.split("-").map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

export default async function DepartmentsIndexPage() {
  const { entries, windowStart, windowEnd } = await fetchDepartmentsIndexData();
  const totalStores = Math.max(...entries.map((e) => e.storeCoverage), 8);

  const windowText =
    windowStart && windowEnd
      ? `${formatMonthYear(windowStart)} through ${formatMonthYear(windowEnd)}`
      : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-4xl tracking-tight text-brand-deep-navy">
          Departments
        </h1>
        <p className="text-muted-foreground">
          Knot Shore Grocery — performance across product departments
        </p>
      </header>

      <p className="text-sm text-muted-foreground max-w-3xl">
        Ten product departments span the Knot Shore Grocery network. Each
        card aggregates sales, transactions, and gross-margin context across
        the {entries.length === 0 ? "available window" : "stores carrying that department"}
        {windowText ? ` (${windowText}).` : "."}
      </p>

      <DepartmentsIndexClient entries={entries} totalStores={totalStores} />
    </div>
  );
}
