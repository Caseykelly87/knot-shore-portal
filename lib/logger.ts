/**
 * Structured logger for the portal.
 *
 * Output format
 * -------------
 * - Auto-detect: pretty (colored, human-friendly) when stdout is a tty,
 *   json (single-line, machine-parseable) otherwise.
 * - Override: set LOG_FORMAT=pretty or LOG_FORMAT=json.
 *
 * Log level
 * ---------
 * - LOG_LEVEL env var (case-insensitive). Defaults to info.
 * - Valid values: debug, info, warn, error, fatal.
 *
 * Request correlation
 * -------------------
 * Use getRequestLogger(requestId) inside a route handler to obtain a
 * child logger with `request_id` bound. Every log call on the child
 * logger automatically includes the field. Pair with the route handler's
 * X-Request-ID header for end-to-end correlation across the portal and
 * the upstream API.
 */

import pino, { Logger, LoggerOptions } from "pino";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export function getApiLogLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  const valid: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];
  return (valid.includes(raw as LogLevel) ? raw : "info") as LogLevel;
}

function shouldUsePretty(): boolean {
  const raw = (process.env.LOG_FORMAT ?? "").toLowerCase();
  if (raw === "pretty") return true;
  if (raw === "json") return false;
  return Boolean(process.stdout.isTTY);
}

function buildOptions(): LoggerOptions {
  return {
    level: getApiLogLevel(),
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      service: "knot-shore-portal",
    },
  };
}

function buildLogger(): Logger {
  const options = buildOptions();
  if (shouldUsePretty()) {
    // pino-pretty as a sync stream rather than a worker-thread transport;
    // worker transports require module resolution that webpack rewrites in
    // bundled environments. The sync stream needs no out-of-process worker.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pretty = require("pino-pretty");
    const stream = pretty({
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname,service",
      destination: process.stdout,
      sync: true,
    });
    return pino(options, stream);
  }
  return pino(options, process.stdout);
}

export const logger: Logger = buildLogger();

/**
 * Build a child logger with request_id bound. Every log call on the
 * returned logger automatically includes the field.
 */
export function getRequestLogger(requestId: string): Logger {
  return logger.child({ request_id: requestId });
}
