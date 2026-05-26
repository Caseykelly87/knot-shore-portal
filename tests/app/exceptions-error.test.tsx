import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ExceptionsError from "@/app/exceptions/error";

describe("exceptions error boundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders the failure heading, recovery copy, and digest when present", () => {
    const error = Object.assign(new Error("fetch failed"), { digest: "ghi789" });
    render(<ExceptionsError error={error} reset={() => {}} />);

    expect(
      screen.getByRole("heading", { name: /exceptions didn't load/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/exception triage view hit an error/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/ghi789/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to dashboard/i }),
    ).toHaveAttribute("href", "/");
  });

  it("invokes reset when the retry button is clicked", () => {
    const reset = vi.fn();
    render(<ExceptionsError error={new Error("x")} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
