import { describe, it, expect, vi, beforeEach } from "vitest";

const headersMock = vi.fn();

vi.mock("next/headers", () => ({
  headers: () => headersMock(),
}));

describe("getBaseUrl", () => {
  beforeEach(() => {
    headersMock.mockReset();
  });

  it("composes proto://host from the incoming request headers", async () => {
    headersMock.mockReturnValue(
      new Map<string, string>([
        ["host", "portal.example.com"],
        ["x-forwarded-proto", "https"],
      ]),
    );
    const { getBaseUrl } = await import("@/lib/get-base-url");
    expect(getBaseUrl()).toBe("https://portal.example.com");
  });

  it("throws a named error when headers() returns null (static prerender)", async () => {
    headersMock.mockReturnValue(null);
    const { getBaseUrl } = await import("@/lib/get-base-url");
    expect(() => getBaseUrl()).toThrow(
      /non-request context.*dynamically-rendered server components or route handlers/i,
    );
  });

  it("throws the same named error when headers() itself throws", async () => {
    headersMock.mockImplementation(() => {
      throw new Error("invariant: headers() called outside of a server context");
    });
    const { getBaseUrl } = await import("@/lib/get-base-url");
    expect(() => getBaseUrl()).toThrow(
      /non-request context.*dynamically-rendered server components or route handlers/i,
    );
  });
});
