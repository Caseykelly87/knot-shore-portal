/**
 * Capture json snapshots of the upstream api's responses into fixtures/.
 *
 * Run against a locally-running economic-data-api instance:
 *
 *     pnpm tsx scripts/capture-fixtures.ts
 *
 * Or with a custom base url:
 *
 *     API_BASE_URL=http://localhost:8001 pnpm tsx scripts/capture-fixtures.ts
 *
 * Captures six endpoints — /health, /store-metrics, /anomalies,
 * /dashboard-summary, /department-metrics, and /dim-stores — and writes
 * one json file per endpoint into fixtures/. Run after a deliberate
 * change to the upstream api's demo data shape; the captured files are
 * committed and become the portal's offline-mode source of truth.
 *
 * The api caps page size at 200 per call, so paginated endpoints loop
 * with offset until the full population is gathered, then a single
 * envelope is written with items containing every row.
 */

import { writeFileSync } from "fs";
import { resolve } from "path";

import { logger } from "../lib/logger";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";
const FIXTURES_DIR = resolve(process.cwd(), "fixtures");
const PAGE_SIZE = 200;

type Shape = "single" | "paginated" | "array";

interface CaptureSpec {
  url: string;
  filename: string;
  shape: Shape;
}

interface PaginatedEnvelope {
  total: number;
  limit: number;
  offset: number;
  items: unknown[];
}

const TARGETS: CaptureSpec[] = [
  { url: "/health", filename: "health.json", shape: "single" },

  // store-metrics — full 2024+2025 canonical, paginated.
  { url: "/store-metrics", filename: "store-metrics.json", shape: "paginated" },

  // anomalies — full 2024+2025 canonical, paginated.
  { url: "/anomalies", filename: "anomalies.json", shape: "paginated" },

  // dashboard-summary — fixed 2025 window for the kpi canary.
  {
    url: "/dashboard-summary?start_date=2025-07-01&end_date=2025-12-31",
    filename: "dashboard-summary.json",
    shape: "single",
  },

  // department-metrics — full 2024+2025 canonical, paginated.
  { url: "/department-metrics", filename: "department-metrics.json", shape: "paginated" },

  // dim-stores — flat array of 8 store rows, no envelope.
  { url: "/dim-stores", filename: "dim-stores.json", shape: "array" },
];

function urlWithLimit(path: string, limit: number, offset: number): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}limit=${limit}&offset=${offset}`;
}

async function capturePaginated(baseUrl: string, path: string): Promise<PaginatedEnvelope> {
  let offset = 0;
  let total = 0;
  const items: unknown[] = [];

  while (true) {
    const fullUrl = `${baseUrl}${urlWithLimit(path, PAGE_SIZE, offset)}`;
    const res = await fetch(fullUrl);
    if (!res.ok) {
      throw new Error(`paginated capture failed: ${res.status} for ${fullUrl}`);
    }
    const body = (await res.json()) as PaginatedEnvelope;
    total = body.total;
    items.push(...body.items);
    if (items.length >= total || body.items.length === 0) break;
    offset += PAGE_SIZE;
  }

  return { total, limit: items.length, offset: 0, items };
}

async function captureSingle(baseUrl: string, path: string): Promise<unknown> {
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok && res.status !== 503) {
    throw new Error(`capture failed: ${res.status} for ${baseUrl}${path}`);
  }
  return res.json();
}

async function main() {
  logger.info({ event: "capture_started", base_url: BASE_URL }, "fixture capture started");
  let captured = 0;

  for (const t of TARGETS) {
    const start = Date.now();
    logger.info(
      { event: "capture_endpoint_started", url: `${BASE_URL}${t.url}`, filename: t.filename },
      "capturing endpoint",
    );

    let body: unknown;
    if (t.shape === "paginated") {
      body = await capturePaginated(BASE_URL, t.url);
    } else {
      body = await captureSingle(BASE_URL, t.url);
    }

    const outPath = resolve(FIXTURES_DIR, t.filename);
    writeFileSync(outPath, JSON.stringify(body, null, 2) + "\n");
    captured += 1;

    const itemCount =
      t.shape === "paginated"
        ? (body as PaginatedEnvelope).items.length
        : Array.isArray(body)
          ? body.length
          : 1;

    logger.info(
      {
        event: "capture_endpoint_completed",
        url: `${BASE_URL}${t.url}`,
        filename: t.filename,
        item_count: itemCount,
        duration_ms: Date.now() - start,
      },
      "endpoint captured",
    );
  }

  logger.info({ event: "capture_completed", count: captured }, "fixture capture completed");
}

main().catch((err) => {
  logger.error(
    { event: "capture_failed", error: err instanceof Error ? err.message : String(err) },
    "fixture capture failed",
  );
  process.exit(1);
});
