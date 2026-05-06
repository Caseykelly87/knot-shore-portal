"use client";

import { FilterSidebar } from "@/components/exceptions/FilterSidebar";
import { useExceptionsFilters } from "@/lib/use-exceptions-filters";
import { applyFilters, type ExceptionsData } from "@/lib/exceptions-data";
import { useMemo } from "react";

interface ExceptionsContentProps {
  data: ExceptionsData;
}

export function ExceptionsContent({ data }: ExceptionsContentProps) {
  const { filters } = useExceptionsFilters();
  const filteredRows = useMemo(() => applyFilters(data.rows, filters), [data.rows, filters]);

  const storeOptions = useMemo(
    () =>
      data.uniqueStores.map((id) => ({
        id,
        name: data.storeNamesById[id] ?? `Store ${id}`,
      })),
    [data.uniqueStores, data.storeNamesById],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <FilterSidebar
          uniqueSeverities={data.uniqueSeverities}
          uniqueRules={data.uniqueRules}
          storeOptions={storeOptions}
          totalRowCount={data.rows.length}
          filteredRowCount={filteredRows.length}
        />
      </div>

      <div className="lg:col-span-3">
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          Exception table and detail panel land in commit 4.
          <p className="mt-2 text-xs">Currently showing {filteredRows.length} filtered rows.</p>
        </div>
      </div>
    </div>
  );
}
