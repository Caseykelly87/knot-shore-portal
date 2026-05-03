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

The portal supports two demo paths. Both are first-class operational modes.

### 30-second demo (offline)

For a fast local exploration without any backend setup. The portal serves
JSON snapshots committed to this repository.

```bash
git clone https://github.com/Caseykelly87/knot-shore-portal.git
cd knot-shore-portal
pnpm install && pnpm dev
```

Open http://localhost:3000 — the landing page renders with a "Demo Mode"
footer badge.

### Platform demo (online)

For seeing the full platform in action with end-to-end request correlation.
The portal proxies live requests to a running upstream API.

In one terminal, run the upstream API (clone and set up
[`economic-data-api`](https://github.com/Caseykelly87/economic-data-api) if
you haven't already):

```bash
cd economic-data-api
source venv/Scripts/activate     # or venv/bin/activate on macOS/Linux
uvicorn app.main:app --port 8000
```

In a second terminal, run the portal in online mode:

```bash
cd knot-shore-portal
API_MODE=online API_BASE_URL=http://localhost:8000 pnpm dev
```

Open http://localhost:3000 — the footer badge now reads "Live Data". A
single user's request flows through both services with one shared
`request_id`, visible in both terminals' structured logs.

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

## Logging

The portal emits structured logs via [pino](https://getpino.io/). Output is
human-readable colored text when stdout is a tty, single-line JSON otherwise.
Format and verbosity can be controlled via environment variables:

| Variable | Values | Default |
|---|---|---|
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error`, `fatal` | `info` |
| `LOG_FORMAT` | `pretty`, `json` | auto (pretty if tty, else json) |

### Request correlation

Every request to a `/api/*` route is tagged with a UUID. The route handler:

- Accepts the value of the incoming `X-Request-ID` header if the caller provides
  one, or generates a fresh UUID via `crypto.randomUUID()`.
- Constructs a per-request child logger so every log line emitted while
  handling the request includes a `request_id` field.
- In online mode, propagates the same ID to the upstream API via
  `X-Request-ID` header so the API uses the same correlation ID in its logs.
- Echoes the ID on the portal's response `X-Request-ID` header.

This means a single user's flow can be traced end-to-end by grepping for one
UUID across the portal's logs and the upstream API's logs.

### Output examples

Pretty mode (default in a terminal):

```
[2025-12-31 17:34:42.118 +0000] INFO: route completed
    request_id: "8c3f1a2b-..."
    event: "route_completed"
    path: "/api/store-metrics"
    mode: "offline"
    status_code: 200
    duration_ms: 4
```

JSON mode (default when piped, or when `LOG_FORMAT=json`):

```json
{"level":"info","time":"2025-12-31T17:34:42.118Z","service":"knot-shore-portal","request_id":"8c3f1a2b-...","event":"route_completed","path":"/api/store-metrics","mode":"offline","status_code":200,"duration_ms":4,"msg":"route completed"}
```

To run with debug-level logs:

```bash
LOG_LEVEL=debug pnpm dev
```

To capture structured logs for offline analysis:

```bash
LOG_FORMAT=json pnpm dev > portal.log 2>&1
```

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

Next.js 14 (App Router) · TypeScript (strict) · Tailwind v3 with shadcn/ui semantic theme tokens · Vitest · pnpm

## License

MIT
