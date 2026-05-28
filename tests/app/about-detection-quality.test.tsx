import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { DetectionQuality } from "@/lib/types";

vi.mock("@/lib/detection-quality-data", () => ({
  fetchDetectionQuality: vi.fn(),
}));

import { fetchDetectionQuality } from "@/lib/detection-quality-data";
import DetectionQualityPage from "@/app/about/detection-quality/page";

const mockFetch = vi.mocked(fetchDetectionQuality);

function buildPayload(overrides: Partial<DetectionQuality> = {}): DetectionQuality {
  return {
    global: { injected_pairs: 100, matched_pairs: 45, recall: 0.45 },
    by_anomaly_type: {
      missing_department: { injected: 40, matched: 40, recall: 1.0 },
      integrity_breach: { injected: 60, matched: 5, recall: 0.083 },
    },
    false_positive_rate: 0.05,
    false_positives: 50,
    negative_universe: 1000,
    flag_rate: 0.1,
    total_flags: 100,
    total_metric_rows: 1000,
    contract: {
      global_recall_threshold: 0.35,
      fpr_threshold: 0.1,
      passes: true,
      reasons: [],
    },
    ...overrides,
  };
}

describe("/about/detection-quality page", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders the breadcrumb, heading, and the view-source link to evaluate_detection.py", async () => {
    mockFetch.mockResolvedValue(buildPayload());
    render(await DetectionQualityPage());

    expect(
      screen.getByRole("heading", { name: /detection quality/i, level: 1 }),
    ).toBeInTheDocument();
    const breadcrumb = screen.getByText(/about/i).closest("p");
    expect(breadcrumb).toHaveTextContent(/about\s*\/\s*detection quality/i);

    const sourceLink = screen.getByRole("link", { name: /view source on github/i });
    expect(sourceLink).toHaveAttribute(
      "href",
      expect.stringContaining("evaluate_detection.py"),
    );
  });

  it("renders the PASS verdict and no reasons when the contract passes", async () => {
    mockFetch.mockResolvedValue(buildPayload());
    render(await DetectionQualityPage());

    const banner = screen.getByTestId("verdict-banner");
    expect(banner).toHaveAttribute("data-passes", "true");
    expect(within(banner).getByText("PASS")).toBeInTheDocument();
    expect(screen.queryByTestId("verdict-reasons")).toBeNull();
  });

  it("renders the FAIL verdict and the failure reasons when the contract fails", async () => {
    mockFetch.mockResolvedValue(
      buildPayload({
        false_positive_rate: 0.19,
        contract: {
          global_recall_threshold: 0.35,
          fpr_threshold: 0.1,
          passes: false,
          reasons: ["false_positive_rate 0.190 above threshold 0.1"],
        },
      }),
    );
    render(await DetectionQualityPage());

    const banner = screen.getByTestId("verdict-banner");
    expect(banner).toHaveAttribute("data-passes", "false");
    expect(within(banner).getByText("FAIL")).toBeInTheDocument();
    const reasons = screen.getByTestId("verdict-reasons");
    expect(
      within(reasons).getByText(/false_positive_rate.*above threshold/i),
    ).toBeInTheDocument();
  });

  it("renders one table row per anomaly type with injected, matched, and recall", async () => {
    mockFetch.mockResolvedValue(buildPayload());
    render(await DetectionQualityPage());

    const table = screen.getByTestId("by-type-table");
    const rows = within(table).getAllByRole("row");
    // 1 header + 2 anomaly types
    expect(rows).toHaveLength(3);

    // sorted alphabetically: integrity_breach before missing_department
    const dataRows = rows.slice(1);
    const firstRowCells = within(dataRows[0]).getAllByRole("cell");
    expect(firstRowCells[0]).toHaveTextContent("integrity_breach");
    expect(firstRowCells[1]).toHaveTextContent("60");
    expect(firstRowCells[2]).toHaveTextContent("5");

    const secondRowCells = within(dataRows[1]).getAllByRole("cell");
    expect(secondRowCells[0]).toHaveTextContent("missing_department");
    expect(secondRowCells[1]).toHaveTextContent("40");
    expect(secondRowCells[2]).toHaveTextContent("40");
    expect(secondRowCells[3]).toHaveTextContent("100.0%");
  });

  it("renders the global recall and FPR percent values formatted with one decimal", async () => {
    mockFetch.mockResolvedValue(buildPayload());
    render(await DetectionQualityPage());

    // 0.45 -> 45.0%, 0.05 -> 5.0%
    expect(screen.getAllByText(/45\.0%/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/5\.0%/).length).toBeGreaterThanOrEqual(1);
  });
});
