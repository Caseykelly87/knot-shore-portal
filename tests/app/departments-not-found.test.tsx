import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DepartmentNotFound from "@/app/departments/[id]/not-found";

describe("departments/[id] not-found boundary", () => {
  it("renders the not-found heading, valid-id hint, and a link back to the index", () => {
    render(<DepartmentNotFound />);

    expect(
      screen.getByRole("heading", { name: /department not found/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/valid ids are 1 through 10/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to departments/i }),
    ).toHaveAttribute("href", "/departments");
  });
});
