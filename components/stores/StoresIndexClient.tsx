"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { StoreSummaryCard } from "./StoreSummaryCard";
import type { StoresIndexEntry } from "@/lib/stores-index-data";

export type StoreSortField = "totalSales" | "totalTransactions" | "exceptionCount" | "storeName";
export type SortDirection = "asc" | "desc";

interface StoresIndexClientProps {
  entries: StoresIndexEntry[];
}

const SORT_OPTIONS: Array<{ field: StoreSortField; label: string; defaultDir: SortDirection }> = [
  { field: "totalSales", label: "Total Sales", defaultDir: "desc" },
  { field: "totalTransactions", label: "Transactions", defaultDir: "desc" },
  { field: "exceptionCount", label: "Exceptions", defaultDir: "desc" },
  { field: "storeName", label: "Store Name", defaultDir: "asc" },
];

export function sortStores(
  entries: StoresIndexEntry[],
  field: StoreSortField,
  direction: SortDirection,
): StoresIndexEntry[] {
  const sorted = [...entries].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "totalSales":
        cmp = a.totalSales - b.totalSales;
        break;
      case "totalTransactions":
        cmp = a.totalTransactions - b.totalTransactions;
        break;
      case "exceptionCount":
        cmp = a.exceptionCount - b.exceptionCount;
        break;
      case "storeName":
        cmp = a.storeName.localeCompare(b.storeName);
        break;
    }
    if (cmp === 0) cmp = a.storeId - b.storeId;
    return direction === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function StoresIndexClient({ entries }: StoresIndexClientProps) {
  const [sortField, setSortField] = useState<StoreSortField>("totalSales");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSortClick = (field: StoreSortField, defaultDir: SortDirection) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(defaultDir);
    }
  };

  const sortedEntries = useMemo(
    () => sortStores(entries, sortField, sortDirection),
    [entries, sortField, sortDirection],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map(({ field, label, defaultDir }) => {
            const isActive = field === sortField;
            return (
              <button
                key={field}
                type="button"
                onClick={() => handleSortClick(field, defaultDir)}
                aria-pressed={isActive}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors",
                  isActive
                    ? "border-brand-sea-glass bg-brand-sea-glass/20 text-brand-deep-navy font-medium"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-brand-sea-glass/60",
                )}
              >
                {label}
                {isActive && (
                  sortDirection === "asc" ? (
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  )
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedEntries.map((entry) => (
          <StoreSummaryCard key={entry.storeId} entry={entry} />
        ))}
      </div>
    </div>
  );
}
