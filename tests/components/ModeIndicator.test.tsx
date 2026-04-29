import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

describe("ModeIndicator", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
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

  it("renders 'Live Data' when API_MODE is online", async () => {
    process.env.API_MODE = "online";
    const { ModeIndicator } = await import("@/components/ModeIndicator");
    render(<ModeIndicator />);
    expect(screen.getByText(/live data/i)).toBeInTheDocument();
  });
});
