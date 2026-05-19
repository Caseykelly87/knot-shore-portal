import { describe, it, expect } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import {
  StoresIndexClient,
  sortStores,
  type StoreSortField,
} from "@/components/stores/StoresIndexClient";
import type { StoresIndexEntry } from "@/lib/stores-index-data";

const fixtureEntries: StoresIndexEntry[] = [
  {
    storeId: 1,
    storeName: "Knot Shore — Alpha",
    tradeAreaProfile: "suburban-family",
    totalSales: 100,
    totalTransactions: 50,
    exceptionCount: 5,
    severityCounts: { info: 5, warning: 0, critical: 0 },
  },
  {
    storeId: 2,
    storeName: "Knot Shore — Bravo",
    tradeAreaProfile: "urban-dense",
    totalSales: 300,
    totalTransactions: 20,
    exceptionCount: 1,
    severityCounts: { info: 0, warning: 0, critical: 1 },
  },
  {
    storeId: 3,
    storeName: "Knot Shore — Charlie",
    tradeAreaProfile: "value-market",
    totalSales: 200,
    totalTransactions: 80,
    exceptionCount: 10,
    severityCounts: { info: 8, warning: 2, critical: 0 },
  },
];

describe("sortStores", () => {
  const ids = (entries: StoresIndexEntry[]) => entries.map((e) => e.storeId);

  it.each<[StoreSortField, "asc" | "desc", number[]]>([
    ["totalSales", "desc", [2, 3, 1]],
    ["totalSales", "asc", [1, 3, 2]],
    ["totalTransactions", "desc", [3, 1, 2]],
    ["exceptionCount", "desc", [3, 1, 2]],
    ["storeName", "asc", [1, 2, 3]],
    ["storeName", "desc", [3, 2, 1]],
  ])("sorts by %s %s", (field, direction, expected) => {
    expect(ids(sortStores(fixtureEntries, field, direction))).toEqual(expected);
  });

  it("does not mutate the input array", () => {
    const before = ids(fixtureEntries);
    sortStores(fixtureEntries, "totalSales", "desc");
    expect(ids(fixtureEntries)).toEqual(before);
  });
});

describe("StoresIndexClient", () => {
  const renderedHeadings = () =>
    screen.getAllByRole("heading", { level: 3 }).map((n) => n.textContent);

  it("renders all entries and defaults to Total Sales descending", () => {
    render(<StoresIndexClient entries={fixtureEntries} />);
    expect(renderedHeadings()).toEqual([
      "Knot Shore — Bravo",
      "Knot Shore — Charlie",
      "Knot Shore — Alpha",
    ]);
    const activeButton = screen.getByRole("button", { name: /Total Sales/ });
    expect(activeButton).toHaveAttribute("aria-pressed", "true");
  });

  it("renders cards as links to per-store detail pages", () => {
    render(<StoresIndexClient entries={fixtureEntries} />);
    const links = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href")?.startsWith("/stores/"));
    expect(links).toHaveLength(3);
    const hrefs = links.map((l) => l.getAttribute("href")).sort();
    expect(hrefs).toEqual(["/stores/1", "/stores/2", "/stores/3"]);
  });

  it("re-sorts the grid when a different sort field is clicked", () => {
    render(<StoresIndexClient entries={fixtureEntries} />);
    fireEvent.click(screen.getByRole("button", { name: /Exceptions/ }));
    expect(renderedHeadings()).toEqual([
      "Knot Shore — Charlie",
      "Knot Shore — Alpha",
      "Knot Shore — Bravo",
    ]);
  });

  it("toggles direction when the active sort is clicked again", () => {
    render(<StoresIndexClient entries={fixtureEntries} />);
    fireEvent.click(screen.getByRole("button", { name: /Total Sales/ }));
    expect(renderedHeadings()).toEqual([
      "Knot Shore — Alpha",
      "Knot Shore — Charlie",
      "Knot Shore — Bravo",
    ]);
  });

  it("uses the field's default direction when switching dimensions", () => {
    render(<StoresIndexClient entries={fixtureEntries} />);
    fireEvent.click(screen.getByRole("button", { name: /Store Name/ }));
    expect(renderedHeadings()).toEqual([
      "Knot Shore — Alpha",
      "Knot Shore — Bravo",
      "Knot Shore — Charlie",
    ]);
  });

  it("highlights critical exception counts for stores with criticals", () => {
    render(<StoresIndexClient entries={fixtureEntries} />);
    const bravoHeading = screen.getByRole("heading", { name: /Bravo/ });
    const bravoCard = bravoHeading.closest("a")!;
    expect(within(bravoCard).getByText(/1 critical/)).toBeInTheDocument();
  });
});
