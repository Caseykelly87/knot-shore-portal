"use client";

import { FilterSidebar } from "@/components/exceptions/FilterSidebar";
import { ExceptionTable } from "@/components/exceptions/ExceptionTable";
import { ExceptionDetailSheet } from "@/components/exceptions/ExceptionDetailSheet";
import { ExceptionsSummary } from "@/components/exceptions/ExceptionsSummary";
import { useExceptionsFilters } from "@/lib/use-exceptions-filters";
import { applyFilters, type ExceptionsData, type ExceptionRow } from "@/lib/exceptions-data";
import { useMemo, useState } from "react";

interface ExceptionsContentProps {
  data: ExceptionsData;
}

export function ExceptionsContent({ data }: ExceptionsContentProps) {
  const { filters } = useExceptionsFilters();
  const [selectedRow, setSelectedRow] = useState<ExceptionRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filteredRows = useMemo(() => applyFilters(data.rows, filters), [data.rows, filters]);

  const storeOptions = useMemo(
    () =>
      data.uniqueStores.map((id) => ({
        id,
        name: data.storeNamesById[id] ?? `Store ${id}`,
      })),
    [data.uniqueStores, data.storeNamesById],
  );

  const handleRowSelect = (row: ExceptionRow) => {
    setSelectedRow(row);
    setSheetOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <ExceptionsSummary rows={filteredRows} />

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
            <ExceptionTable rows={filteredRows} onRowSelect={handleRowSelect} />
          </div>
        </div>
      </div>

      <ExceptionDetailSheet row={selectedRow} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
