import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("logger module", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("exports a default logger that has expected level methods", async () => {
    const { logger } = await import("@/lib/logger");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("getRequestLogger returns a child logger with request_id bound", async () => {
    process.env.LOG_FORMAT = "json";
    const { getRequestLogger } = await import("@/lib/logger");
    const reqLogger = getRequestLogger("test-request-id-1234");

    expect(typeof reqLogger.info).toBe("function");

    const writes: string[] = [];
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: any) => {
      writes.push(typeof chunk === "string" ? chunk : chunk.toString());
      return true;
    }) as any;

    try {
      reqLogger.info({ event: "test_event", value: 42 }, "test message");
    } finally {
      process.stdout.write = originalWrite;
    }

    const output = writes.join("");
    expect(output).toContain("test-request-id-1234");
  });

  it("getApiLogLevel resolves from LOG_LEVEL env var", async () => {
    process.env.LOG_LEVEL = "debug";
    const { getApiLogLevel } = await import("@/lib/logger");
    expect(getApiLogLevel()).toBe("debug");
  });
});
