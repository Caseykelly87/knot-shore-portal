# Knot Shore Portal

Next.js 14 application that renders stakeholder dashboards for the Knot Shore Grocery analytics platform. The portal consumes JSON from the upstream `economic-data-api` and turns it into three primary user-facing pages — a daily dashboard, a per-store drilldown, and an exception triage interface — plus an architectural documentation hub at `/about`.

The portal supports two operational modes: offline (default, serves bundled JSON fixtures) and online (proxies to a running upstream API). Both modes are first-class production paths; neither is a degraded fallback. A clone-and-run demo against fixtures looks the same as a live deployment against an API.

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

## Pages

### Daily dashboard (`/`)

Platform-wide overview for a configurable date window. KPI cards (total sales, total transactions, average labor cost percentage), a top-5-stores-by-revenue chart, a daily sales trend chart, and an exception severity overview card showing counts at info / warning / critical levels.

The dashboard is a server component that fetches `/api/dashboard-summary` once on load. The window defaults to the canonical 2025 demo window; date range and store filters can be applied via the API's existing query parameters.

### Store drilldown (`/stores/[id]`)

Per-store deep dive for any of the 8 stores. KPI cards scoped to that store, a year-over-year revenue comparison chart (uses the paired-year canonical to plot 2025 alongside 2024), a top-departments chart, a department-mix breakdown chart, and a per-store anomalies card listing recent exceptions for that store.

The route accepts numeric IDs 1 through 8. Invalid IDs render a `not-found` UI rather than a 500. Store metadata (name, city, trade-area profile) comes from `/dim-stores`; the page renders real store identification rather than synthesized labels.

### Exception triage (`/exceptions`)

Operations-focused interface for reviewing all 983 anomaly flags from the canonical detection run. Filter sidebar with severity, store, and rule filters; the filter state is URL-synced via `useSearchParams`, so a `/exceptions?severity=warning&store=3` link reproduces the same view, browser back/forward navigates filter history, and refresh preserves filters.

The exception table sorts severity-first, then date-descending. Clicking a row opens a detail sheet showing the full anomaly record with a synthesized human-readable description (composed from `rule_id`, `actual_value`, and the expected band — the API doesn't provide a description field; the portal builds one client-side).

The page fetches all anomalies once on load (paginated through the API's 200-row cap) and filters client-side. 983 rows is small enough that filter latency is imperceptible.

### Documentation hub (`/about`)

Reader-grade documentation for the platform — what it does, how the four repos fit together, and the reasoning behind specific architectural choices. See [Where the docs live](#where-the-docs-live).

## Where the docs live

The portal hosts the platform's reader-grade documentation at `/about`. After `pnpm dev`, visit:

- `/about` — index of all documentation pages
- `/about/architecture` — platform-wide architectural narrative with a mermaid data-flow diagram
- `/about/decisions` — index of 28 architectural decisions in 6 categories (data integrity, architecture, API design, portal frontend, engineering practices, deliberate non-features). Each entry has the same shape: title, what was decided, rationale, cost, when to revisit.
- `/about/sim-engine` — sim engine deep-dive: determinism, anomaly injection, paired-year mechanics
- `/about/etl` — ETL deep-dive: source-adapter / transform separation, canonical fixtures, detection rules, the macro pipeline
- `/about/api` — API deep-dive: dual-mode operation, endpoint catalog, schema discipline, observability stack
- `/about/portal` — portal deep-dive: server-component data flow, URL-synced state, the next/headers boundary, charts

Each page is a static React Server Component — no auth, no API calls, just content. The mermaid diagrams render via a small client component that lazy-loads mermaid from `cdn.jsdelivr.net` on mount; no npm package added.

## Quick start

The portal supports two demo paths. Both are first-class operational modes.

### 30-second demo (offline)

For a fast local exploration without any backend setup. The portal serves JSON snapshots committed to this repository.

```bash
git clone https://github.com/Caseykelly87/knot-shore-portal.git
cd knot-shore-portal
pnpm install && pnpm dev
```

Open http://localhost:3000 — the landing page renders with a "Demo Mode" footer badge.

### Platform demo (online)

For seeing the full platform in action with end-to-end request correlation. The portal proxies live requests to a running upstream API.

In one terminal, run the upstream API (clone and set up [`economic-data-api`](https://github.com/Caseykelly87/economic-data-api) if you haven't already):

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

Open http://localhost:3000 — the footer badge now reads "Live Data". A single user's request flows through both services with one shared `request_id`, visible in both terminals' structured logs.

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

The mode resolution lives in `lib/api-mode.ts` and is read once at module load. Each portal-side `/api/*` route handler inspects the mode and either reads a JSON fixture (offline) or proxies the request to `API_BASE_URL` (online). The data shape is identical between modes; the page server components don't know or care which mode produced the data they receive.

## Refreshing demo fixtures

The bundled fixtures in `fixtures/` are JSON snapshots of API responses. They are committed in this repo and need to be refreshed only when the upstream API's response shape or canonical demo data changes.

To refresh:

1. Start the upstream API: `cd economic-data-api && uvicorn app.main:app --port 8000`
2. From this repo: `pnpm tsx scripts/capture-fixtures.ts`
3. Verify the captured files in `fixtures/`, commit them.

The capture script paginates through the API's 200-row cap and assembles the full dataset (the portal needs all 983 anomalies in one fixture, but the API caps each request at 200 rows, so the script makes 5 calls and concatenates).

## Logging

The portal emits structured logs via [pino](https://getpino.io/). Output is human-readable colored text when stdout is a tty, single-line JSON otherwise. Format and verbosity are controlled via environment variables:

| Variable | Values | Default |
|---|---|---|
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error`, `fatal` | `info` |
| `LOG_FORMAT` | `pretty`, `json` | auto (pretty if tty, else json) |

### Request correlation

Every request to a `/api/*` route is tagged with a UUID. The route handler:

- Accepts the value of the incoming `X-Request-ID` header if the caller provides one, or generates a fresh UUID via `crypto.randomUUID()`.
- Constructs a per-request child logger so every log line emitted while handling the request includes a `request_id` field.
- In online mode, propagates the same ID to the upstream API via `X-Request-ID` header so the API uses the same correlation ID in its logs.
- Echoes the ID on the portal's response `X-Request-ID` header.

This means a single user's flow can be traced end-to-end by grepping for one UUID across the portal's logs and the upstream API's logs.

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

## Metrics

The portal exposes a `/api/metrics` endpoint in Prometheus text exposition format. Any Prometheus-compatible scraper can poll this endpoint to collect time-series data on request rates, latencies, and Node.js process health.

```bash
curl http://localhost:3000/api/metrics
```

### Application metrics

| Metric | Type | Labels | Description |
|---|---|---|---|
| `portal_requests_total` | Counter | `route`, `mode`, `status_code` | Increments per `/api/*` request the portal handles. `mode` is `offline` or `online`. |
| `portal_request_duration_seconds` | Histogram | `route`, `mode` | Latency distribution per route and mode. Default prom-client histogram buckets. |
| `portal_upstream_unreachable_total` | Counter | _none_ | Increments only when `/api/health` in online mode can't reach the upstream API. |

The `route` label is the original Next.js path (`/api/store-metrics`, `/api/health`, etc.), so operators see the path that hit the portal — not a rewritten upstream path. `status_code` is a string (`"200"`, `"503"`); prom-client requires labels to be strings.

The metric calls live in each route handler immediately before the existing `route_completed` pino log call, sharing the same duration calculation. Logs and metrics observe the same operational facts at the same call site — pino gives per-call detail with `request_id`, prom-client gives aggregate rates that scrapers can plot over time.

The prom-client `Registry` is cached on `globalThis.__portalMetrics` rather than imported as a module-level singleton. Next.js App Router bundles each route handler into a separate webpack chunk; without `globalThis` caching, each route would create its own Registry instance and metric increments wouldn't aggregate. The pattern is the documented Next.js workaround.

### Default Node.js metrics

The endpoint also exposes default Node.js process metrics via prom-client's `collectDefaultMetrics`: heap memory, GC duration, event loop lag, file descriptor count, CPU time, and others. Useful for spotting deployment problems independent of HTTP traffic (e.g., a memory leak that doesn't yet show up as elevated request latency).

### Example output

```
# HELP portal_requests_total Total /api/* requests handled by the portal, labeled by route, mode, and status code.
# TYPE portal_requests_total counter
portal_requests_total{route="/api/store-metrics",mode="offline",status_code="200"} 5
portal_requests_total{route="/api/health",mode="offline",status_code="200"} 1

# HELP portal_request_duration_seconds Latency of /api/* requests in seconds, labeled by route and mode.
# TYPE portal_request_duration_seconds histogram
portal_request_duration_seconds_bucket{route="/api/store-metrics",mode="offline",le="0.005"} 5
portal_request_duration_seconds_bucket{route="/api/store-metrics",mode="offline",le="+Inf"} 5
portal_request_duration_seconds_count{route="/api/store-metrics",mode="offline"} 5
```

### Authentication

The `/api/metrics` endpoint is unauthenticated. Production deployments should restrict access via firewall rules, an authenticating reverse proxy, or a service mesh — Prometheus convention is metrics endpoints sit inside trusted networks.

## Project structure

```
knot-shore-portal/
├── app/
│   ├── api/                              # Portal-side route handlers (proxy or fixture)
│   │   ├── health/
│   │   ├── store-metrics/
│   │   ├── anomalies/
│   │   ├── dashboard-summary/
│   │   ├── department-metrics/
│   │   ├── dim-stores/
│   │   └── metrics/                      # Prometheus exposition endpoint
│   ├── about/                            # Documentation hub (server components)
│   │   ├── page.tsx                      # /about index
│   │   ├── architecture/
│   │   ├── decisions/
│   │   ├── sim-engine/
│   │   ├── etl/
│   │   ├── api/
│   │   └── portal/
│   ├── stores/[id]/                      # Store drilldown
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── not-found.tsx
│   ├── exceptions/                       # Exception triage
│   │   ├── page.tsx
│   │   └── loading.tsx
│   ├── globals.css
│   ├── layout.tsx                        # Root layout with TopNav + ModeIndicator
│   ├── loading.tsx
│   └── page.tsx                          # Daily dashboard
├── components/
│   ├── dashboard/
│   │   ├── KPICard.tsx
│   │   ├── KPICardsRow.tsx
│   │   ├── TopStoresChart.tsx
│   │   ├── SalesTrendChart.tsx
│   │   ├── ExceptionSeverityCard.tsx
│   │   └── DashboardSkeleton.tsx
│   ├── store-drilldown/
│   │   ├── StoreHeader.tsx
│   │   ├── StoreKPICards.tsx
│   │   ├── YearOverYearChart.tsx
│   │   ├── TopDepartmentsChart.tsx
│   │   ├── DepartmentMixChart.tsx
│   │   └── StoreAnomaliesCard.tsx
│   ├── exceptions/
│   │   ├── FilterSidebar.tsx
│   │   ├── ExceptionsContent.tsx
│   │   ├── ExceptionTable.tsx
│   │   └── ExceptionDetailSheet.tsx
│   ├── about/
│   │   └── MermaidDiagram.tsx            # Lazy-loads mermaid from cdn.jsdelivr.net
│   ├── ui/                               # shadcn primitives via base-ui-components
│   ├── TopNav.tsx
│   └── ModeIndicator.tsx                 # Demo Mode / Live Data badge
├── lib/
│   ├── about/
│   │   └── decisions.ts                  # Typed constant for /about/decisions
│   ├── api-mode.ts                       # Reads API_MODE env var at module load
│   ├── dashboard-data.ts                 # Dashboard data layer (fetcher + shape transformer)
│   ├── store-data.ts                     # Store drilldown data layer
│   ├── exceptions-data.ts                # Exceptions: types + filter applicator (isomorphic)
│   ├── exceptions-data-server.ts         # Exceptions: server fetcher (uses next/headers)
│   ├── use-exceptions-filters.ts         # URL-synced filter hook for /exceptions
│   ├── fixture-loader.ts                 # JSON fixture imports
│   ├── logger.ts                         # pino with sync streams + request-bound child loggers
│   ├── metrics.ts                        # prom-client Registry on globalThis singleton
│   ├── dim-departments.ts                # 10 department names (stable reference data)
│   ├── formatters.ts                     # Currency, percent, number formatters
│   ├── types.ts                          # TypeScript shapes mirroring the API
│   └── utils.ts                          # cn() class-name utility
├── fixtures/                             # Captured API response snapshots (committed)
│   ├── dashboard-summary.json
│   ├── store-metrics.json
│   ├── department-metrics.json
│   ├── dim-stores.json
│   ├── anomalies.json
│   └── health.json
├── scripts/
│   └── capture-fixtures.ts               # Refresh fixtures from a running upstream API
├── tests/                                # Vitest + React Testing Library
│   ├── api/
│   ├── components/
│   ├── lib/
│   └── setup.ts
├── components.json                       # shadcn config
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

## Testing

```bash
pnpm test          # Run once (51 tests)
pnpm test:watch    # Watch mode
```

Coverage emphasizes the pure shape transformers and infrastructure boundaries. Presentational components (charts, KPI cards, table rows) are not unit tested — recharts internals are fragile to assert against, and visual review catches rendering issues more reliably than DOM tests would.

The 9 test files:

| File | Coverage |
|---|---|
| `tests/api/store-metrics.test.ts` | Route handler in offline mode (fixture path) and online mode (proxy path) |
| `tests/components/ModeIndicator.test.tsx` | Mode-aware badge rendering (Demo Mode vs Live Data) |
| `tests/lib/api-mode.test.ts` | API_MODE resolver, default behavior, env var override |
| `tests/lib/dashboard-data.test.ts` | Dashboard shape transformer (KPI aggregation, top stores ranking) |
| `tests/lib/exceptions-data.test.ts` | Exception filter applicator, sort logic, description synthesis |
| `tests/lib/fixture-loader.test.ts` | JSON fixture imports and shape validation |
| `tests/lib/logger.test.ts` | pino configuration, child logger creation, request_id binding |
| `tests/lib/metrics.test.ts` | prom-client Registry singleton, counter/histogram wiring |
| `tests/lib/store-data.test.ts` | Store drilldown shape transformer (year-over-year alignment, dept mix) |

The split is deliberate: pure logic gets dense unit coverage; rendering gets visual review.

## Tech stack

Next.js 14 (App Router) · TypeScript (strict) · Tailwind v3 with shadcn/ui via base-ui-components · Vitest · pnpm · pino · prom-client · recharts (pinned to v2)

## Adjacent repositories

- [`knot-shore-grocery-simulation-engine`](https://github.com/Caseykelly87/Knot-shore-grocery-simulation-engine) — generates the synthetic data that flows through the platform. Reader-grade narrative at [`/about/sim-engine`](https://github.com/Caseykelly87/knot-shore-portal/blob/main/app/about/sim-engine/page.tsx).
- [`economic-data-etl`](https://github.com/Caseykelly87/economic-data-etl) — ingests sim engine output into canonical parquet artifacts; runs the macro-economic pipeline (FRED, BLS, ERS). Reader-grade narrative at [`/about/etl`](https://github.com/Caseykelly87/knot-shore-portal/blob/main/app/about/etl/page.tsx).
- [`economic-data-api`](https://github.com/Caseykelly87/economic-data-api) — FastAPI service that this portal proxies to in online mode. Reader-grade narrative at [`/about/api`](https://github.com/Caseykelly87/knot-shore-portal/blob/main/app/about/api/page.tsx).

## License

MIT
