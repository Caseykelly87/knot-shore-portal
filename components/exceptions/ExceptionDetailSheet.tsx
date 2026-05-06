"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ExceptionRow } from "@/lib/exceptions-data";

interface ExceptionDetailSheetProps {
  row: ExceptionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SEVERITY_BADGE_STYLES: Record<string, string> = {
  critical: "bg-red-500/10 text-red-700 border-red-200",
  warning: "bg-amber-500/10 text-amber-700 border-amber-200",
  info: "bg-blue-500/10 text-blue-700 border-blue-200",
};

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

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

function formatNumber(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
}

export function ExceptionDetailSheet({ row, open, onOpenChange }: ExceptionDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {row && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <Badge
                  className={cn("border capitalize", SEVERITY_BADGE_STYLES[row.severity] ?? "")}
                >
                  {row.severity}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">{row.ruleId}</span>
              </div>
              <SheetTitle className="text-xl">{row.storeName}</SheetTitle>
              <SheetDescription>{formatDate(row.date)}</SheetDescription>
            </SheetHeader>

            <div className="px-4 pb-4 space-y-6">
              <DetailSection label="Summary" value={row.description} />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <DetailField label="Actual" value={formatNumber(row.actualValue)} />
                <DetailField label="Severity score" value={formatNumber(row.severityScore, 3)} />
                <DetailField label="Expected low" value={formatNumber(row.expectedLow)} />
                <DetailField label="Expected high" value={formatNumber(row.expectedHigh)} />
                <DetailField label="Distance from band" value={formatNumber(row.distanceFromBand)} />
                <DetailField label="Store ID" value={String(row.storeId)} />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailSection({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono">{value}</div>
    </div>
  );
}
