import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface DepartmentHeaderProps {
  departmentName: string;
  windowStart: string | null;
  windowEnd: string | null;
  storeCoverage: number;
  totalStores: number;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatLongDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export function DepartmentHeader({
  departmentName,
  windowStart,
  windowEnd,
  storeCoverage,
  totalStores,
}: DepartmentHeaderProps) {
  const windowText =
    windowStart && windowEnd
      ? `${formatLongDate(windowStart)} – ${formatLongDate(windowEnd)}`
      : null;

  return (
    <div className="space-y-3">
      <nav className="text-sm">
        <Link
          href="/departments"
          className="text-muted-foreground hover:text-brand-deep-navy transition-colors"
        >
          ← All departments
        </Link>
      </nav>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-2">
              <h1 className="font-display text-4xl tracking-tight text-brand-deep-navy">
                {departmentName}
              </h1>
              <p className="text-muted-foreground">
                {totalStores > 0
                  ? `Available in ${storeCoverage} of ${totalStores} stores`
                  : `Available in ${storeCoverage} stores`}
              </p>
            </div>
          </div>
          {windowText && (
            <div className="mt-4 text-sm text-muted-foreground">
              Window: <span className="font-medium text-brand-deep-navy">{windowText}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
