"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ExceptionRow } from "@/lib/exceptions-data";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ExceptionTableProps {
  rows: ExceptionRow[];
  onRowSelect: (row: ExceptionRow) => void;
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

type SortField = "date" | "store" | "severity" | "rule";
type SortDir = "asc" | "desc";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export function ExceptionTable({ rows, onRowSelect }: ExceptionTableProps) {
  const [sortField, setSortField] = useState<SortField>("severity");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedRows = [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "date":
        cmp = a.date.localeCompare(b.date);
        break;
      case "store":
        cmp = a.storeName.localeCompare(b.storeName);
        if (cmp === 0) cmp = a.storeId - b.storeId;
        break;
      case "severity":
        cmp = (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99);
        if (cmp === 0) cmp = b.date.localeCompare(a.date);
        break;
      case "rule":
        cmp = a.ruleId.localeCompare(b.ruleId);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No exceptions match the current filters.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b border-border">
              <tr>
                <SortableHeader field="severity" current={sortField} dir={sortDir} onClick={handleSort} className="w-32">
                  Severity
                </SortableHeader>
                <SortableHeader field="date" current={sortField} dir={sortDir} onClick={handleSort} className="w-32">
                  Date
                </SortableHeader>
                <SortableHeader field="store" current={sortField} dir={sortDir} onClick={handleSort}>
                  Store
                </SortableHeader>
                <SortableHeader field="rule" current={sortField} dir={sortDir} onClick={handleSort} className="w-44">
                  Rule
                </SortableHeader>
                <th className="text-left px-4 py-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, i) => (
                <tr
                  key={`${row.date}-${row.storeId}-${row.ruleId}-${i}`}
                  onClick={() => onRowSelect(row)}
                  className="border-b border-border last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          SEVERITY_DOT_STYLES[row.severity] ?? "bg-muted-foreground",
                        )}
                      />
                      <span className="capitalize">{row.severity}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(row.date)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/stores/${row.storeId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-brand-deep-navy underline decoration-brand-sea-glass/60 underline-offset-2 hover:decoration-brand-sea-glass hover:text-brand-kelp-green"
                    >
                      {row.storeName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{row.ruleId}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

interface SortableHeaderProps {
  field: SortField;
  current: SortField;
  dir: SortDir;
  onClick: (field: SortField) => void;
  className?: string;
  children: React.ReactNode;
}

function SortableHeader({ field, current, dir, onClick, className, children }: SortableHeaderProps) {
  const isActive = current === field;
  return (
    <th className={cn("text-left px-4 py-3 font-medium", className)}>
      <button
        onClick={() => onClick(field)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground transition-colors",
          isActive ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {children}
        {isActive && (dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
    </th>
  );
}
