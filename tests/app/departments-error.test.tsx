import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DepartmentError from "@/app/departments/[id]/error";

describe("departments/[id] error boundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders the failure heading, recovery copy, and digest when present", () => {
    const error = Object.assign(new Error("fetch failed"), { digest: "def456" });
    render(<DepartmentError error={error} reset={() => {}} />);

    expect(
      screen.getByRole("heading", { name: /department didn't load/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/department drilldown hit an error/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/def456/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to departments/i }),
    ).toHaveAttribute("href", "/departments");
  });

  it("invokes reset when the retry button is clicked", () => {
    const reset = vi.fn();
    render(<DepartmentError error={new Error("x")} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
