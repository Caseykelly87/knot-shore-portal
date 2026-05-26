import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Loading from "@/app/departments/[id]/loading";

describe("departments/[id] loading boundary", () => {
  it("renders a skeleton scaffold matching the drilldown layout (header, four KPIs, two charts)", () => {
    const { container } = render(<Loading />);

    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);

    const kpiCards = container.querySelectorAll(
      ".grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4 > *",
    );
    expect(kpiCards.length).toBe(4);
  });
});
