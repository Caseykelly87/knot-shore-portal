import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("getApiMode", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns 'offline' when API_MODE is not set", async () => {
    delete process.env.API_MODE;
    const { getApiMode } = await import("@/lib/api-mode");
    expect(getApiMode()).toBe("offline");
  });

  it("returns 'offline' when API_MODE is the literal string 'offline'", async () => {
    process.env.API_MODE = "offline";
    const { getApiMode } = await import("@/lib/api-mode");
    expect(getApiMode()).toBe("offline");
  });

  it("returns 'online' when API_MODE is 'online'", async () => {
    process.env.API_MODE = "online";
    const { getApiMode } = await import("@/lib/api-mode");
    expect(getApiMode()).toBe("online");
  });

  it("falls back to 'offline' for unrecognized values", async () => {
    process.env.API_MODE = "bogus";
    const { getApiMode } = await import("@/lib/api-mode");
    expect(getApiMode()).toBe("offline");
  });
});
