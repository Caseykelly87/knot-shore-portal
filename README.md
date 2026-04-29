# Knot Shore Portal

Stakeholder portal for the Knot Shore Grocery analytics platform — the front door of a four-repo data engineering project demonstrating end-to-end pipeline ownership.

## The platform

```
knot-shore-grocery-simulation-engine    →  generates synthetic store-day data
                ↓
economic-data-etl                       →  ingests, normalizes, runs anomaly detection
                ↓
economic-data-api                       →  serves data as JSON (FastAPI)
                ↓
knot-shore-portal                       →  this repo (Next.js 14)
```

This portal renders dashboards over the data the API exposes. No business logic lives in the frontend — totals, rankings, and aggregations all come from the API.

## Quick start

Three commands and you have a working portal:

```bash
git clone https://github.com/Caseykelly87/knot-shore-portal.git
cd knot-shore-portal
pnpm install && pnpm dev
```

Open http://localhost:3000 — the landing page renders with a "Demo Mode" footer badge. The portal serves bundled JSON fixtures committed to this repository; no upstream API setup needed.

## Operating modes

| Mode | Behavior | When to use |
|---|---|---|
| `offline` (default) | Serves fixtures from `fixtures/` | Demo, local exploration, CI |
| `online` | Proxies to upstream API | Real platform integration |

To switch to online mode, create `.env.local`:

```
API_MODE=online
API_BASE_URL=http://localhost:8000
```

Then start the upstream `economic-data-api` separately and restart `pnpm dev`. The footer badge will turn green and read "Live Data."

## Refreshing demo fixtures

The bundled fixtures in `fixtures/` are JSON snapshots of API responses. They are committed in this repo and need to be refreshed only when the upstream API's response shape or canonical demo data changes.

To refresh:

1. Start the upstream API: `cd economic-data-api && uvicorn app.main:app --port 8000`
2. From this repo: `pnpm tsx scripts/capture-fixtures.ts`
3. Verify the captured files in `fixtures/`, commit them.

## Project structure

```
knot-shore-portal/
├── app/
│   ├── api/                   # Portal-side proxy route handlers
│   │   ├── health/
│   │   ├── store-metrics/
│   │   ├── anomalies/
│   │   └── dashboard-summary/
│   ├── layout.tsx             # Root layout with footer ModeIndicator
│   └── page.tsx               # Landing page
├── components/
│   ├── ui/                    # shadcn/ui components
│   └── ModeIndicator.tsx      # Demo Mode / Live Data badge
├── lib/
│   ├── api-mode.ts            # Reads API_MODE env var at module load
│   ├── fixture-loader.ts      # Imports JSON fixtures
│   └── types.ts               # TypeScript shapes mirroring the API
├── fixtures/                  # Captured API response snapshots (committed)
├── scripts/
│   └── capture-fixtures.ts    # Refresh fixtures from a running upstream API
└── tests/                     # Vitest + React Testing Library
```

## Testing

```bash
pnpm test          # Run once
pnpm test:watch    # Watch mode
```

Tests cover the API-mode resolver, fixture loader shape, the proxy route handler in offline mode, and the ModeIndicator's mode-aware rendering. Tests are kept narrow and behavioral — only what would silently break the portal if wrong.

## Tech stack

Next.js 14 (App Router) · TypeScript (strict) · Tailwind v3 · shadcn/ui · Vitest · pnpm

## License

MIT
