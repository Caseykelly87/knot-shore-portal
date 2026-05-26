import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

describe("ModeIndicator", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("renders 'Demo Mode' when API_MODE is unset", async () => {
    delete process.env.API_MODE;
    const { ModeIndicator } = await import("@/components/ModeIndicator");
    render(<ModeIndicator />);
    expect(screen.getByText(/demo mode/i)).toBeInTheDocument();
  });

  it("renders 'Demo Mode' when API_MODE is offline", async () => {
    process.env.API_MODE = "offline";
    const { ModeIndicator } = await import("@/components/ModeIndicator");
    render(<ModeIndicator />);
    expect(screen.getByText(/demo mode/i)).toBeInTheDocument();
  });

  it("renders 'Live Data' when API_MODE is online and no fallback was observed", async () => {
    process.env.API_MODE = "online";
    const { ModeIndicator } = await import("@/components/ModeIndicator");
    render(<ModeIndicator />);
    // The text is "Live Data" without the parenthetical; matching with
    // an exact string avoids accidental collision with "Live Data (Fallback)".
    expect(screen.getByText("Live Data")).toBeInTheDocument();
  });

  it("renders 'Live Data (Fallback)' when API_MODE is online and a fetch observed X-Data-Source: fallback", async () => {
    process.env.API_MODE = "online";
    const { markFallbackUsed } = await import("@/lib/data-source-state");
    markFallbackUsed();
    const { ModeIndicator } = await import("@/components/ModeIndicator");
    render(<ModeIndicator />);
    expect(screen.getByText(/live data \(fallback\)/i)).toBeInTheDocument();
  });
});
