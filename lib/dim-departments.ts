/**
 * Department reference data.
 *
 * Hardcoded because departments are stable known values. The sim
 * engine's dim_departments.csv has 10 entries; the api doesn't expose
 * them via a /dim-departments endpoint — small enough to embed
 * client-side, and adding an endpoint is a downstream concern if the
 * list ever grows beyond a fixed taxonomy.
 *
 * Names match the canonical dim_departments.csv exactly. Keep in sync
 * if the sim engine's department list ever changes.
 */

export const DEPARTMENT_NAMES: Record<number, string> = {
  1: "Produce",
  2: "Meat & Seafood",
  3: "Dairy & Eggs",
  4: "Bakery",
  5: "Deli & Prepared",
  6: "Frozen",
  7: "Grocery (Center Store)",
  8: "Beverages",
  9: "Snacks & Candy",
  10: "Health/Beauty/Household",
};

export function getDepartmentName(departmentId: number): string {
  return DEPARTMENT_NAMES[departmentId] ?? `Department ${departmentId}`;
}
