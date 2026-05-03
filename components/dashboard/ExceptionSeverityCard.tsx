import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCount } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface ExceptionSeverityCardProps {
  counts: { info: number; warning: number; critical: number };
}

interface SeverityRowProps {
  severity: "info" | "warning" | "critical";
  count: number;
}

function SeverityRow({ severity, count }: SeverityRowProps) {
  const severityStyles = {
    info: "bg-blue-500",
    warning: "bg-amber-500",
    critical: "bg-red-500",
  };

  const severityLabels = {
    info: "Info",
    warning: "Warning",
    critical: "Critical",
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className={cn("h-2.5 w-2.5 rounded-full", severityStyles[severity])} />
        <span className="text-sm font-medium">{severityLabels[severity]}</span>
      </div>
      <span className="text-sm font-mono tabular-nums">{formatCount(count)}</span>
    </div>
  );
}

export function ExceptionSeverityCard({ counts }: ExceptionSeverityCardProps) {
  const total = counts.info + counts.warning + counts.critical;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Exceptions by Severity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <SeverityRow severity="critical" count={counts.critical} />
          <SeverityRow severity="warning" count={counts.warning} />
          <SeverityRow severity="info" count={counts.info} />
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-border">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <span className="text-sm font-mono tabular-nums font-semibold">
              {formatCount(total)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
