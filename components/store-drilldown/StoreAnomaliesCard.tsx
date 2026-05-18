import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StoreAnomaliesCardProps {
  anomalies: Array<{
    date: string;
    severity: string;
    ruleId: string;
    description: string;
  }>;
}

const SEVERITY_DOT_STYLES: Record<string, string> = {
  critical: "bg-severity-critical",
  warning: "bg-severity-warning",
  info: "bg-severity-info",
};

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export function StoreAnomaliesCard({ anomalies }: StoreAnomaliesCardProps) {
  const sorted = [...anomalies].sort((a, b) => {
    const sevDiff = (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99);
    if (sevDiff !== 0) return sevDiff;
    return b.date.localeCompare(a.date);
  });

  const display = sorted.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Exceptions</CardTitle>
      </CardHeader>
      <CardContent>
        {display.length === 0 ? (
          <p className="text-sm text-muted-foreground">No exceptions for this store.</p>
        ) : (
          <ul className="space-y-3">
            {display.map((a, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <div
                  className={cn(
                    "mt-1.5 h-2 w-2 rounded-full shrink-0",
                    SEVERITY_DOT_STYLES[a.severity] ?? "bg-muted-foreground",
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{a.ruleId}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(a.date)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {anomalies.length > display.length && (
          <p className="text-xs text-muted-foreground mt-4">
            Showing {display.length} of {anomalies.length} exceptions.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
