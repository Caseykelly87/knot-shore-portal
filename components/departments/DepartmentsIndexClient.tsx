"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { DepartmentSummaryCard } from "./DepartmentSummaryCard";
import type { DepartmentsIndexEntry } from "@/lib/departments-index-data";

export type DepartmentSortField =
  | "totalSales"
  | "totalTransactions"
  | "storeCoverage"
  | "departmentName";
export type SortDirection = "asc" | "desc";

interface DepartmentsIndexClientProps {
  entries: DepartmentsIndexEntry[];
  totalStores: number;
}

const SORT_OPTIONS: Array<{
  field: DepartmentSortField;
  label: string;
  defaultDir: SortDirection;
}> = [
  { field: "totalSales", label: "Total Sales", defaultDir: "desc" },
  { field: "totalTransactions", label: "Transactions", defaultDir: "desc" },
  { field: "storeCoverage", label: "Store Coverage", defaultDir: "desc" },
  { field: "departmentName", label: "Department Name", defaultDir: "asc" },
];

export function sortDepartments(
  entries: DepartmentsIndexEntry[],
  field: DepartmentSortField,
  direction: SortDirection,
): DepartmentsIndexEntry[] {
  const sorted = [...entries].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "totalSales":
        cmp = a.totalSales - b.totalSales;
        break;
      case "totalTransactions":
        cmp = a.totalTransactions - b.totalTransactions;
        break;
      case "storeCoverage":
        cmp = a.storeCoverage - b.storeCoverage;
        break;
      case "departmentName":
        cmp = a.departmentName.localeCompare(b.departmentName);
        break;
    }
    if (cmp === 0) cmp = a.departmentId - b.departmentId;
    return direction === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function DepartmentsIndexClient({
  entries,
  totalStores,
}: DepartmentsIndexClientProps) {
  const [sortField, setSortField] = useState<DepartmentSortField>("totalSales");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSortClick = (field: DepartmentSortField, defaultDir: SortDirection) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(defaultDir);
    }
  };

  const sortedEntries = useMemo(
    () => sortDepartments(entries, sortField, sortDirection),
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
                {isActive &&
                  (sortDirection === "asc" ? (
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  ))}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedEntries.map((entry) => (
          <DepartmentSummaryCard
            key={entry.departmentId}
            entry={entry}
            totalStores={totalStores}
          />
        ))}
      </div>
    </div>
  );
}
