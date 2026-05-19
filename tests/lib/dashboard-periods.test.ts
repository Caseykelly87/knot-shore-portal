import { describe, it, expect } from "vitest";
import { computeDashboardPeriods, computeDelta } from "@/lib/dashboard-periods";

describe("computeDashboardPeriods", () => {
  it("derives three periods from the canonical 18-month window", () => {
    const periods = computeDashboardPeriods("2024-07-01", "2025-12-31");
    expect(periods).not.toBeNull();
    expect(periods!.recent).toEqual({ start: "2025-07-01", end: "2025-12-31" });
    expect(periods!.pop).toEqual({ start: "2025-01-01", end: "2025-06-30" });
    expect(periods!.yoy).toEqual({ start: "2024-07-01", end: "2024-12-31" });
  });

  it("caps recent length at half the window once the window exceeds two years", () => {
    // 4 years of data: 48 months. half = 24 months, yoy capacity = 36.
    // Recent should be the most recent 24 months (Jan 2025 – Dec 2026),
    // pop the 24 months before (Jan 2023 – Dec 2024), yoy the recent
    // slice shifted back one year (Jan 2024 – Dec 2025).
    const periods = computeDashboardPeriods("2023-01-01", "2026-12-31");
    expect(periods).not.toBeNull();
    expect(periods!.recent).toEqual({ start: "2025-01-01", end: "2026-12-31" });
    expect(periods!.pop).toEqual({ start: "2023-01-01", end: "2024-12-31" });
    expect(periods!.yoy).toEqual({ start: "2024-01-01", end: "2025-12-31" });
  });

  it("returns only pop for a 12-month window", () => {
    const periods = computeDashboardPeriods("2024-01-01", "2024-12-31");
    expect(periods).not.toBeNull();
    expect(periods!.yoy).toBeNull();
    expect(periods!.recent).toEqual({ start: "2024-07-01", end: "2024-12-31" });
    expect(periods!.pop).toEqual({ start: "2024-01-01", end: "2024-06-30" });
  });

  it("splits short windows so pop is the months immediately before recent", () => {
    const periods = computeDashboardPeriods("2025-01-01", "2025-06-30");
    expect(periods!.recent).toEqual({ start: "2025-04-01", end: "2025-06-30" });
    expect(periods!.pop).toEqual({ start: "2025-01-01", end: "2025-03-31" });
    expect(periods!.yoy).toBeNull();
  });

  it("returns recent only for a single-month window", () => {
    const periods = computeDashboardPeriods("2025-12-01", "2025-12-31");
    expect(periods).not.toBeNull();
    expect(periods!.recent).toEqual({ start: "2025-12-01", end: "2025-12-31" });
    expect(periods!.pop).toBeNull();
    expect(periods!.yoy).toBeNull();
  });

  it("returns null when inputs are missing", () => {
    expect(computeDashboardPeriods(null, "2025-12-31")).toBeNull();
    expect(computeDashboardPeriods("2024-07-01", null)).toBeNull();
    expect(computeDashboardPeriods(null, null)).toBeNull();
  });

  it("returns null when end is before start", () => {
    expect(computeDashboardPeriods("2025-12-31", "2024-07-01")).toBeNull();
  });

  it("handles a 13-month window with a 1-month recent slice", () => {
    const periods = computeDashboardPeriods("2024-01-01", "2025-01-31");
    expect(periods).not.toBeNull();
    expect(periods!.recent).toEqual({ start: "2025-01-01", end: "2025-01-31" });
    expect(periods!.pop).toEqual({ start: "2024-12-01", end: "2024-12-31" });
    expect(periods!.yoy).toEqual({ start: "2024-01-01", end: "2024-01-31" });
  });

  it("derives periods using calendar months not raw days", () => {
    // Confirms the result is anchored to month boundaries rather than
    // day-count splits, which would otherwise drift across uneven
    // month lengths (Feb, the 30/31 split).
    const periods = computeDashboardPeriods("2024-07-01", "2025-12-31");
    expect(periods!.pop!.start).toBe("2025-01-01");
    expect(periods!.pop!.end).toBe("2025-06-30");
  });
});

describe("computeDelta", () => {
  it("returns the proportional change from baseline to recent", () => {
    expect(computeDelta(110, 100)).toBeCloseTo(0.1, 5);
    expect(computeDelta(80, 100)).toBeCloseTo(-0.2, 5);
  });

  it("returns null when baseline is missing", () => {
    expect(computeDelta(100, null)).toBeNull();
  });

  it("returns null when baseline is zero", () => {
    expect(computeDelta(100, 0)).toBeNull();
  });

  it("returns zero when recent equals baseline", () => {
    expect(computeDelta(100, 100)).toBe(0);
  });
});
