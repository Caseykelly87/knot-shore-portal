import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StoreError from "@/app/stores/[id]/error";

describe("stores/[id] error boundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders the failure heading, recovery copy, and digest when present", () => {
    const error = Object.assign(new Error("fetch failed"), { digest: "abc123" });
    render(<StoreError error={error} reset={() => {}} />);

    expect(
      screen.getByRole("heading", { name: /store didn't load/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/store drilldown hit an error/i)).toBeInTheDocument();
    expect(screen.getByText(/abc123/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to stores/i }),
    ).toHaveAttribute("href", "/stores");
  });

  it("invokes reset when the retry button is clicked", () => {
    const reset = vi.fn();
    render(<StoreError error={new Error("x")} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("omits the digest line when no digest is attached", () => {
    render(<StoreError error={new Error("x")} reset={() => {}} />);
    expect(screen.queryByText(/digest:/i)).not.toBeInTheDocument();
  });
});
