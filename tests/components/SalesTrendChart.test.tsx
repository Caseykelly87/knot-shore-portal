import { describe, it, expect } from "vitest";
import {
  formatAxisDate,
  formatTooltipDate,
  deriveSeriesYears,
} from "@/components/dashboard/SalesTrendChart";

// The dashboard's default sales-trend window: H2 2025 against the same span
// shifted to 2024. These rows let the tests assert the exact years the chart
// must surface on the axis, in the tooltip, and in the legend.
const h2Window = [
  { date: "2025-07-01" },
  { date: "2025-09-15" },
  { date: "2025-12-31" },
];

describe("formatAxisDate", () => {
  // Business-correctness: the axis tick must carry the year (the regression
  // this PR fixes), formatted as month + year for a multi-month window.
  it("renders month and year, never stripping the year", () => {
    expect(formatAxisDate("2025-07-01")).toBe("Jul 2025");
    expect(formatAxisDate("2024-12-31")).toBe("Dec 2024");
  });
});

describe("formatTooltipDate", () => {
  // Business-correctness: the tooltip disambiguates current vs prior-year
  // points sharing an x-position, so it must show the full date with year.
  it("renders month, day, and year", () => {
    expect(formatTooltipDate("2025-07-01")).toBe("Jul 1, 2025");
    expect(formatTooltipDate("2024-09-15")).toBe("Sep 15, 2024");
  });
});

describe("deriveSeriesYears", () => {
  // Business-correctness: the legend years are derived from the data, not
  // hardcoded, so a shifted dashboard window stays truthful.
  it("uses the most common year as current and that minus one as prior", () => {
    expect(deriveSeriesYears(h2Window)).toEqual({
      currentYear: 2025,
      priorYear: 2024,
    });
  });

  it("resolves the dominant year when a window straddles two calendar years", () => {
    const straddling = [
      { date: "2025-12-30" },
      { date: "2025-12-31" },
      { date: "2026-01-01" },
    ];
    expect(deriveSeriesYears(straddling)).toEqual({
      currentYear: 2025,
      priorYear: 2024,
    });
  });

  it("breaks an even split toward the later year", () => {
    const tied = [{ date: "2025-12-31" }, { date: "2026-01-01" }];
    expect(deriveSeriesYears(tied)).toEqual({
      currentYear: 2026,
      priorYear: 2025,
    });
  });

  it("returns null for empty data so the component can fall back", () => {
    expect(deriveSeriesYears([])).toBeNull();
  });
});
