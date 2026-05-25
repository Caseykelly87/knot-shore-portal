import { describe, it, expect } from "vitest";
import { shapeExceptionsData, applyFilters } from "@/lib/exceptions-data";

describe("shapeExceptionsData", () => {
  const sampleAnomalies = {
    total: 7,
    limit: 200,
    offset: 0,
    items: [
      {
        date: "2025-09-15",
        store_id: 3,
        rule_id: "revenue_band",
        actual_value: 45000.0,
        expected_low: 50000.0,
        expected_high: 75000.0,
        distance_from_band: -5000.0,
        severity_score: 0.65,
        severity_level: "warning",
      },
      {
        date: "2025-07-20",
        store_id: 5,
        rule_id: "yoy_comp",
        actual_value: 1.05,
        expected_low: 0.95,
        expected_high: 1.15,
        distance_from_band: 0.0,
        severity_score: 0.15,
        severity_level: "info",
      },
      {
        date: "2025-12-01",
        store_id: 1,
        rule_id: "labor_pct_band",
        actual_value: 0.18,
        expected_low: 0.08,
        expected_high: 0.13,
        distance_from_band: 0.05,
        severity_score: 0.92,
        severity_level: "critical",
      },
      {
        date: "2025-08-05",
        store_id: 2,
        rule_id: "avg_ticket_band",
        actual_value: 38.0,
        expected_low: 42.0,
        expected_high: 55.0,
        distance_from_band: -4.0,
        severity_score: 0.55,
        severity_level: "warning",
      },
      {
        date: "2025-11-10",
        store_id: 4,
        rule_id: "transactions_band",
        actual_value: 1200,
        expected_low: 1500,
        expected_high: 2200,
        distance_from_band: -300,
        severity_score: 0.45,
        severity_level: "info",
      },
      {
        date: "2025-09-20",
        store_id: 5,
        rule_id: "revenue_zscore_28d",
        actual_value: 88000,
        expected_low: 72000,
        expected_high: 72000,
        distance_from_band: 16000,
        severity_score: 2.71,
        severity_level: "warning",
      },
      {
        date: "2024-09-24",
        store_id: 4,
        rule_id: "revenue_zscore_28d",
        actual_value: 50215.27,
        expected_low: 70707.48392857143,
        expected_high: 70707.48392857143,
        distance_from_band: 20492.21392857143,
        severity_score: 4.01693390549636,
        severity_level: "critical",
      },
    ],
  };

  const sampleDimStores = [
    { store_id: 1, store_name: "Knot Shore — Kirkwood" },
    { store_id: 2, store_name: "Knot Shore — Chesterfield" },
    { store_id: 3, store_name: "Knot Shore — Oakville" },
    { store_id: 4, store_name: "Knot Shore — Central West End" },
    { store_id: 5, store_name: "Knot Shore — Soulard" },
  ];

  it("returns all rows from the input", () => {
    const shaped = shapeExceptionsData(sampleAnomalies, sampleDimStores);
    expect(shaped.rows).toHaveLength(7);
  });

  it("attaches store_name to each row from dim_stores", () => {
    const shaped = shapeExceptionsData(sampleAnomalies, sampleDimStores);
    const kirkwoodRow = shaped.rows.find((r) => r.storeId === 1);
    expect(kirkwoodRow?.storeName).toBe("Knot Shore — Kirkwood");
  });

  it("falls back to synthesized name when store missing from dim_stores", () => {
    const shaped = shapeExceptionsData(sampleAnomalies, []);
    const row = shaped.rows.find((r) => r.storeId === 1);
    expect(row?.storeName).toBe("Store 1");
  });

  it("sorts rows by severity (critical > warning > info), then date desc within severity", () => {
    const shaped = shapeExceptionsData(sampleAnomalies, sampleDimStores);
    expect(shaped.rows[0].severity).toBe("critical");
    expect(shaped.rows[0].date).toBe("2025-12-01");
    expect(shaped.rows[1].severity).toBe("critical");
    expect(shaped.rows[1].date).toBe("2024-09-24");
    expect(shaped.rows[2].severity).toBe("warning");
    expect(shaped.rows[2].date).toBe("2025-09-20");
    expect(shaped.rows[3].severity).toBe("warning");
    expect(shaped.rows[3].date).toBe("2025-09-15");
    expect(shaped.rows[4].severity).toBe("warning");
    expect(shaped.rows[4].date).toBe("2025-08-05");
    expect(shaped.rows[5].severity).toBe("info");
    expect(shaped.rows[5].date).toBe("2025-11-10");
    expect(shaped.rows[6].severity).toBe("info");
    expect(shaped.rows[6].date).toBe("2025-07-20");
  });

  it("synthesizes description for revenue_band rules (currency formatting)", () => {
    const shaped = shapeExceptionsData(sampleAnomalies, sampleDimStores);
    const revenueRow = shaped.rows.find((r) => r.ruleId === "revenue_band");
    expect(revenueRow?.description).toMatch(/\$45,000.*\$50,000.*\$75,000/);
  });

  it("synthesizes description for avg_ticket_band rules (currency formatting)", () => {
    const shaped = shapeExceptionsData(sampleAnomalies, sampleDimStores);
    const ticketRow = shaped.rows.find((r) => r.ruleId === "avg_ticket_band");
    expect(ticketRow?.description).toMatch(/\$38.*\$42.*\$55/);
  });

  it("synthesizes description for labor_pct_band rules (percent formatting)", () => {
    const shaped = shapeExceptionsData(sampleAnomalies, sampleDimStores);
    const laborRow = shaped.rows.find((r) => r.ruleId === "labor_pct_band");
    expect(laborRow?.description).toBe("Actual 18.0% (expected 8.0%–13.0%)");
  });

  it("synthesizes description for transactions_band rules (count formatting)", () => {
    const shaped = shapeExceptionsData(sampleAnomalies, sampleDimStores);
    const txRow = shaped.rows.find((r) => r.ruleId === "transactions_band");
    expect(txRow?.description).toMatch(/1,200.*1,500.*2,200/);
  });

  it("synthesizes description for yoy_comp rules (ratio formatting)", () => {
    const shaped = shapeExceptionsData(sampleAnomalies, sampleDimStores);
    const yoyRow = shaped.rows.find((r) => r.ruleId === "yoy_comp");
    expect(yoyRow?.description).toBe("Actual 1.05x (expected 0.95x–1.15x)");
  });

  it("synthesizes description for revenue_zscore_28d rules (currency plus z-magnitude)", () => {
    // Business-correctness: the z-score rule carries the rolling-mean
    // baseline in expected_low and the z-score magnitude in
    // severity_score. The description has to surface all three numeric
    // facts (actual, z-magnitude, baseline) for an analyst to triage
    // the flag without re-opening the raw row.
    const shaped = shapeExceptionsData(sampleAnomalies, sampleDimStores);
    const zRow = shaped.rows.find(
      (r) => r.ruleId === "revenue_zscore_28d" && r.date === "2025-09-20",
    );
    expect(zRow?.description).toBe("Actual $88,000 (2.71σ from 28-day baseline $72,000)");
  });

  it("formats the critical-severity z-score row with two-decimal magnitude and zero-fraction currency", () => {
    // Business-correctness: pins the description of the only
    // critical-severity row in the canonical set (store 4, 2024-09-24).
    // The raw severity_score is 4.01693... and the raw expected_low is
    // 70707.48392...; the rendered description must round magnitude to
    // two decimals and currency to whole dollars per the file's local
    // formatter conventions.
    const shaped = shapeExceptionsData(sampleAnomalies, sampleDimStores);
    const critRow = shaped.rows.find(
      (r) => r.ruleId === "revenue_zscore_28d" && r.date === "2024-09-24",
    );
    expect(critRow?.severity).toBe("critical");
    expect(critRow?.description).toBe("Actual $50,215 (4.02σ from 28-day baseline $70,707)");
  });

  it("returns metadata about the dataset", () => {
    const shaped = shapeExceptionsData(sampleAnomalies, sampleDimStores);
    expect(shaped.uniqueSeverities).toEqual(["critical", "info", "warning"]);
    expect(shaped.uniqueRules).toEqual([
      "avg_ticket_band",
      "labor_pct_band",
      "revenue_band",
      "revenue_zscore_28d",
      "transactions_band",
      "yoy_comp",
    ]);
    expect(shaped.uniqueStores).toEqual([1, 2, 3, 4, 5]);
  });

  it("handles empty input", () => {
    const shaped = shapeExceptionsData(
      { total: 0, limit: 200, offset: 0, items: [] },
      sampleDimStores,
    );
    expect(shaped.rows).toEqual([]);
    expect(shaped.uniqueSeverities).toEqual([]);
    expect(shaped.uniqueRules).toEqual([]);
    expect(shaped.uniqueStores).toEqual([]);
  });
});

describe("applyFilters", () => {
  const sampleRows = [
    {
      date: "2025-07-15",
      storeId: 1,
      storeName: "A",
      ruleId: "revenue_band",
      severity: "warning",
      actualValue: 1000,
      expectedLow: 1500,
      expectedHigh: 2500,
      distanceFromBand: -500,
      severityScore: 0.6,
      description: "x",
    },
    {
      date: "2025-08-01",
      storeId: 2,
      storeName: "B",
      ruleId: "yoy_comp",
      severity: "info",
      actualValue: 1.05,
      expectedLow: 0.95,
      expectedHigh: 1.15,
      distanceFromBand: 0,
      severityScore: 0.2,
      description: "x",
    },
    {
      date: "2025-12-15",
      storeId: 1,
      storeName: "A",
      ruleId: "labor_pct_band",
      severity: "critical",
      actualValue: 0.18,
      expectedLow: 0.08,
      expectedHigh: 0.13,
      distanceFromBand: 0.05,
      severityScore: 0.95,
      description: "x",
    },
  ];

  it("returns all rows when no filters applied", () => {
    const filtered = applyFilters(sampleRows, {});
    expect(filtered).toHaveLength(3);
  });

  it("filters by date range (inclusive)", () => {
    const filtered = applyFilters(sampleRows, { dateFrom: "2025-08-01", dateTo: "2025-12-15" });
    expect(filtered).toHaveLength(2);
    expect(filtered.map((r) => r.date)).toEqual(["2025-08-01", "2025-12-15"]);
  });

  it("filters by severity (includes only matching severities)", () => {
    const filtered = applyFilters(sampleRows, { severities: ["warning", "info"] });
    expect(filtered).toHaveLength(2);
    expect(filtered.map((r) => r.severity).sort()).toEqual(["info", "warning"]);
  });

  it("filters by store id", () => {
    const filtered = applyFilters(sampleRows, { storeId: 1 });
    expect(filtered).toHaveLength(2);
    expect(filtered.every((r) => r.storeId === 1)).toBe(true);
  });

  it("filters by rule id", () => {
    const filtered = applyFilters(sampleRows, { ruleId: "revenue_band" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].ruleId).toBe("revenue_band");
  });

  it("composes multiple filters with AND semantics", () => {
    const filtered = applyFilters(sampleRows, {
      severities: ["warning", "critical"],
      storeId: 1,
    });
    expect(filtered).toHaveLength(2);
    expect(filtered.every((r) => r.storeId === 1)).toBe(true);
    expect(filtered.every((r) => ["warning", "critical"].includes(r.severity))).toBe(true);
  });

  it("returns empty array when filters match nothing", () => {
    const filtered = applyFilters(sampleRows, { storeId: 99 });
    expect(filtered).toEqual([]);
  });
});
