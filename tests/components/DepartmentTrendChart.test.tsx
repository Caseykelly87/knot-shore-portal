import { describe, it, expect } from "vitest";
import {
  formatAxisDate,
  formatTooltipDate,
} from "@/components/departments/DepartmentTrendChart";

describe("formatAxisDate", () => {
  // Business-correctness: the axis tick must carry the year (the regression
  // this fix addresses), formatted as month + year for a multi-month window.
  it("renders month and year, never stripping the year", () => {
    expect(formatAxisDate("2025-07-01")).toBe("Jul 2025");
    expect(formatAxisDate("2024-12-31")).toBe("Dec 2024");
  });
});

describe("formatTooltipDate", () => {
  // Business-correctness: a hovered point must be unambiguous, so the tooltip
  // shows the full date with year regardless of axis tick granularity.
  it("renders month, day, and year", () => {
    expect(formatTooltipDate("2025-07-01")).toBe("Jul 1, 2025");
    expect(formatTooltipDate("2024-09-15")).toBe("Sep 15, 2024");
  });
});
