"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExceptionsFilters } from "@/lib/use-exceptions-filters";
import { cn } from "@/lib/utils";

interface FilterSidebarProps {
  uniqueSeverities: string[];
  uniqueRules: string[];
  storeOptions: Array<{ id: number; name: string }>;
  totalRowCount: number;
  filteredRowCount: number;
}

const SEVERITY_BADGE_STYLES: Record<string, string> = {
  critical: "bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-200",
  warning: "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-200",
  info: "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-200",
};

export function FilterSidebar({
  uniqueSeverities,
  uniqueRules,
  storeOptions,
  totalRowCount,
  filteredRowCount,
}: FilterSidebarProps) {
  const { filters, updateFilters, clearFilters, hasActiveFilters } = useExceptionsFilters();

  const toggleSeverity = (severity: string) => {
    const current = filters.severities ?? [];
    const next = current.includes(severity)
      ? current.filter((s) => s !== severity)
      : [...current, severity];
    updateFilters({ severities: next });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Filters</CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-1 text-xs">
              Clear
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {filteredRowCount.toLocaleString()} of {totalRowCount.toLocaleString()} exceptions
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium">Date range</label>
          <div className="space-y-2">
            <Input
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(e) => updateFilters({ dateFrom: e.target.value || undefined })}
              className="text-xs"
            />
            <Input
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(e) => updateFilters({ dateTo: e.target.value || undefined })}
              className="text-xs"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Severity</label>
          <div className="flex flex-wrap gap-2">
            {uniqueSeverities.map((severity) => {
              const isActive = filters.severities?.includes(severity) ?? false;
              return (
                <button
                  key={severity}
                  onClick={() => toggleSeverity(severity)}
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize transition-colors",
                    SEVERITY_BADGE_STYLES[severity] ?? "bg-muted text-muted-foreground border-border",
                    !isActive && "opacity-50",
                  )}
                >
                  {severity}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Store</label>
          <Select
            value={filters.storeId !== undefined ? String(filters.storeId) : "all"}
            onValueChange={(value) => {
              if (value === null || value === "all") {
                updateFilters({ storeId: undefined });
              } else {
                updateFilters({ storeId: parseInt(value, 10) });
              }
            }}
          >
            <SelectTrigger className="w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stores</SelectItem>
              {storeOptions.map((store) => (
                <SelectItem key={store.id} value={String(store.id)}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Rule</label>
          <Select
            value={filters.ruleId ?? "all"}
            onValueChange={(value) => {
              if (value === null || value === "all") {
                updateFilters({ ruleId: undefined });
              } else {
                updateFilters({ ruleId: value });
              }
            }}
          >
            <SelectTrigger className="w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All rules</SelectItem>
              {uniqueRules.map((rule) => (
                <SelectItem key={rule} value={rule}>
                  {rule}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
