import { describe, it, expect } from "vitest";
import {
  summarizeBySeverity,
  summarizeByRule,
  bucketByMonth,
} from "@/components/exceptions/ExceptionsSummary";
import type { ExceptionRow } from "@/lib/exceptions-data";

// Minimal rows carrying only the fields the summary helpers read. The shape is
// widened to ExceptionRow so the helpers are exercised against the real type.
function row(partial: Pick<ExceptionRow, "date" | "ruleId" | "severity">): ExceptionRow {
  return {
    storeId: 1,
    storeName: "Knot Shore — Test",
    actualValue: 0,
    expectedLow: 0,
    expectedHigh: 0,
    distanceFromBand: 0,
    severityScore: 0,
    description: "",
    ...partial,
  };
}

const rows: ExceptionRow[] = [
  row({ date: "2025-07-01", ruleId: "department_reconciliation", severity: "warning" }),
  row({ date: "2025-07-20", ruleId: "department_reconciliation", severity: "warning" }),
  row({ date: "2025-08-05", ruleId: "department_reconciliation", severity: "info" }),
  row({ date: "2025-08-15", ruleId: "gross_margin_band", severity: "critical" }),
  row({ date: "2024-12-31", ruleId: "gross_margin_band", severity: "info" }),
];

describe("summarizeBySeverity", () => {
  // Business-correctness: the strip's severity counts must equal the count of
  // each level in the (filtered) set, and ignore unknown levels.
  it("counts each known severity level", () => {
    expect(summarizeBySeverity(rows)).toEqual({ info: 2, warning: 2, critical: 1 });
  });

  it("returns zeros for an empty set and ignores unknown levels", () => {
    expect(summarizeBySeverity([])).toEqual({ info: 0, warning: 0, critical: 0 });
    const unknown = [row({ date: "2025-07-01", ruleId: "x", severity: "fatal" })];
    expect(summarizeBySeverity(unknown)).toEqual({ info: 0, warning: 0, critical: 0 });
  });
});

describe("summarizeByRule", () => {
  // Business-correctness: rules ranked by frequency descending, ties broken on
  // rule id ascending for a deterministic order, only rules present included.
  it("ranks rules by count descending with deterministic tie-break", () => {
    expect(summarizeByRule(rows)).toEqual([
      { ruleId: "department_reconciliation", count: 3 },
      { ruleId: "gross_margin_band", count: 2 },
    ]);
  });

  it("breaks count ties on rule id ascending", () => {
    const tied = [
      row({ date: "2025-07-01", ruleId: "zebra_rule", severity: "info" }),
      row({ date: "2025-07-02", ruleId: "alpha_rule", severity: "info" }),
    ];
    expect(summarizeByRule(tied).map((r) => r.ruleId)).toEqual(["alpha_rule", "zebra_rule"]);
  });

  it("returns an empty list for no rows", () => {
    expect(summarizeByRule([])).toEqual([]);
  });
});

describe("bucketByMonth", () => {
  // Business-correctness: rows grouped by YYYY-MM, chronologically ascending,
  // with same-month rows summed and distinct months kept separate.
  it("buckets rows by calendar month in chronological order", () => {
    expect(bucketByMonth(rows)).toEqual([
      { month: "2024-12", count: 1 },
      { month: "2025-07", count: 2 },
      { month: "2025-08", count: 2 },
    ]);
  });

  it("returns an empty list for no rows", () => {
    expect(bucketByMonth([])).toEqual([]);
  });
});
