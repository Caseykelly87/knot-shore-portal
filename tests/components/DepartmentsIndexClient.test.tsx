import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  DepartmentsIndexClient,
  sortDepartments,
  type DepartmentSortField,
} from "@/components/departments/DepartmentsIndexClient";
import type { DepartmentsIndexEntry } from "@/lib/departments-index-data";

const fixtureEntries: DepartmentsIndexEntry[] = [
  {
    departmentId: 1,
    departmentName: "Alpha",
    totalSales: 100,
    totalTransactions: 50,
    totalUnitsSold: 200,
    storeCoverage: 4,
    avgGrossMarginPct: 0.40,
  },
  {
    departmentId: 2,
    departmentName: "Bravo",
    totalSales: 300,
    totalTransactions: 20,
    totalUnitsSold: 80,
    storeCoverage: 8,
    avgGrossMarginPct: 0.30,
  },
  {
    departmentId: 3,
    departmentName: "Charlie",
    totalSales: 200,
    totalTransactions: 80,
    totalUnitsSold: 300,
    storeCoverage: 6,
    avgGrossMarginPct: 0.26,
  },
];

describe("sortDepartments", () => {
  const ids = (entries: DepartmentsIndexEntry[]) => entries.map((e) => e.departmentId);

  it.each<[DepartmentSortField, "asc" | "desc", number[]]>([
    ["totalSales", "desc", [2, 3, 1]],
    ["totalSales", "asc", [1, 3, 2]],
    ["totalTransactions", "desc", [3, 1, 2]],
    ["storeCoverage", "desc", [2, 3, 1]],
    ["storeCoverage", "asc", [1, 3, 2]],
    ["departmentName", "asc", [1, 2, 3]],
    ["departmentName", "desc", [3, 2, 1]],
  ])("sorts by %s %s", (field, direction, expected) => {
    expect(ids(sortDepartments(fixtureEntries, field, direction))).toEqual(expected);
  });

  it("breaks ties by departmentId (direction-aware, matching the stores index pattern)", () => {
    const tied: DepartmentsIndexEntry[] = [
      { ...fixtureEntries[0], departmentId: 5, totalSales: 100 },
      { ...fixtureEntries[0], departmentId: 2, totalSales: 100 },
      { ...fixtureEntries[0], departmentId: 9, totalSales: 100 },
    ];
    expect(ids(sortDepartments(tied, "totalSales", "asc"))).toEqual([2, 5, 9]);
    expect(ids(sortDepartments(tied, "totalSales", "desc"))).toEqual([9, 5, 2]);
  });

  it("does not mutate the input array", () => {
    const before = ids(fixtureEntries);
    sortDepartments(fixtureEntries, "totalSales", "desc");
    expect(ids(fixtureEntries)).toEqual(before);
  });
});

describe("DepartmentsIndexClient", () => {
  const renderedHeadings = () =>
    screen.getAllByRole("heading", { level: 3 }).map((n) => n.textContent);

  it("renders all entries and defaults to Total Sales descending", () => {
    render(<DepartmentsIndexClient entries={fixtureEntries} totalStores={8} />);
    expect(renderedHeadings()).toEqual(["Bravo", "Charlie", "Alpha"]);
    const activeButton = screen.getByRole("button", { name: /Total Sales/ });
    expect(activeButton).toHaveAttribute("aria-pressed", "true");
  });

  it("renders cards as links to per-department detail pages", () => {
    render(<DepartmentsIndexClient entries={fixtureEntries} totalStores={8} />);
    const links = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href")?.startsWith("/departments/"));
    expect(links).toHaveLength(3);
    const hrefs = links.map((l) => l.getAttribute("href")).sort();
    expect(hrefs).toEqual(["/departments/1", "/departments/2", "/departments/3"]);
  });

  it("re-sorts when a different sort field is clicked", () => {
    render(<DepartmentsIndexClient entries={fixtureEntries} totalStores={8} />);
    fireEvent.click(screen.getByRole("button", { name: /Transactions/ }));
    expect(renderedHeadings()).toEqual(["Charlie", "Alpha", "Bravo"]);
  });

  it("toggles direction when the active sort is clicked again", () => {
    render(<DepartmentsIndexClient entries={fixtureEntries} totalStores={8} />);
    fireEvent.click(screen.getByRole("button", { name: /Total Sales/ }));
    expect(renderedHeadings()).toEqual(["Alpha", "Charlie", "Bravo"]);
  });

  it("uses the field's default direction when switching dimensions", () => {
    render(<DepartmentsIndexClient entries={fixtureEntries} totalStores={8} />);
    fireEvent.click(screen.getByRole("button", { name: /Department Name/ }));
    expect(renderedHeadings()).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("renders store coverage with the configured total", () => {
    render(<DepartmentsIndexClient entries={fixtureEntries} totalStores={8} />);
    expect(screen.getByText(/Available in 8\/8 stores/)).toBeInTheDocument();
    expect(screen.getByText(/Available in 4\/8 stores/)).toBeInTheDocument();
  });
});
