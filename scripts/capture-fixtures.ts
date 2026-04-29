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
 * Captures four endpoints — /health, /store-metrics, /anomalies, and
 * /dashboard-summary — and writes one json file per endpoint into
 * fixtures/. Run after a deliberate change to the upstream api's demo
 * data shape; the captured files are committed and become the portal's
 * offline-mode source of truth.
 */

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";
const FIXTURES_DIR = resolve(process.cwd(), "fixtures");

interface CaptureSpec {
  url: string;
  filename: string;
}

const TARGETS: CaptureSpec[] = [
  { url: "/health", filename: "health.json" },
  { url: "/store-metrics?limit=200", filename: "store-metrics.json" },
  { url: "/anomalies?limit=200", filename: "anomalies.json" },
  {
    url: "/dashboard-summary?start_date=2025-07-01&end_date=2025-12-31",
    filename: "dashboard-summary.json",
  },
];

async function main() {
  console.log(`Capturing fixtures from ${BASE_URL}`);
  for (const t of TARGETS) {
    const fullUrl = `${BASE_URL}${t.url}`;
    const res = await fetch(fullUrl);
    if (!res.ok && res.status !== 503) {
      console.error(`Failed: ${fullUrl} (status ${res.status})`);
      process.exit(1);
    }
    const body = await res.json();
    const outPath = resolve(FIXTURES_DIR, t.filename);
    writeFileSync(outPath, JSON.stringify(body, null, 2) + "\n");
    console.log(`Wrote ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
