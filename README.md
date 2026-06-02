# Knot Shore Portal

[![CI](https://github.com/Caseykelly87/knot-shore-portal/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/Caseykelly87/knot-shore-portal/actions/workflows/test.yml)

**Live demo:** https://knot-shore-portal.vercel.app — the portal alone, served against bundled JSON fixtures. For the full pipeline running end-to-end, see [knot-shore-platform](https://github.com/Caseykelly87/knot-shore-platform).

Next.js 14 application that renders stakeholder dashboards for the Knot Shore Grocery analytics platform. The portal consumes JSON from the upstream `economic-data-api` and turns it into three primary user-facing pages — a daily dashboard, a per-store drilldown, and an exception triage interface — plus an architectural documentation hub at `/about`.

The portal supports two operational modes: offline (default, serves bundled JSON fixtures) and online (proxies to a running upstream API). Both modes are first-class production paths; neither is a degraded fallback. A clone-and-run demo against fixtures looks the same as a live deployment against an API.

This README is written to do two things at once. As an operator's guide it covers how to run the portal locally in either mode, how to read its logs and metrics, and how to deploy it. As a frontend-engineering overview it describes how the App Router code is organized, where state lives, what the performance posture is, what the testing approach is, and where the design system lives in code. A reader who only wants to run the app can skip from [Quick start](#quick-start) to the end. A reader reviewing the codebase as an artifact can read [Frontend architecture](#frontend-architecture) through [Engineering practices](#engineering-practices) and then click into [`/about/decisions`](app/about/decisions/page.tsx), [`/about/lessons`](app/about/lessons/page.tsx), and [`/about/architecture`](app/about/architecture/page.tsx) for the deeper reasoning.

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

Operations-focused interface for reviewing all 178 anomaly flags from the canonical detection run. Filter sidebar with severity, store, and rule filters; the filter state is URL-synced via `useSearchParams`, so a `/exceptions?severity=warning&store=3` link reproduces the same view, browser back/forward navigates filter history, and refresh preserves filters.

The exception table sorts severity-first, then date-descending. Clicking a row opens a detail sheet showing the full anomaly record with a synthesized human-readable description (composed from `rule_id`, `actual_value`, and the expected band — the API doesn't provide a description field; the portal builds one client-side).

The page fetches all anomalies once on load (paginated through the API's 200-row cap) and filters client-side. 178 rows is small enough that filter latency is imperceptible.

### Documentation hub (`/about`)

Reader-grade documentation for the platform — what it does, how the four repos fit together, and the reasoning behind specific architectural choices. See [Where the docs live](#where-the-docs-live).

## Where the docs live

The portal hosts the platform's reader-grade documentation at `/about`. After `pnpm dev`, visit:

- `/about` — index of all documentation pages
- `/about/architecture` — platform-wide architectural narrative with a mermaid data-flow diagram
- `/about/decisions` — 30 architectural decisions in 6 categories (Architecture, Data integrity, Deliberate non-features, API design, Portal frontend, Engineering practices). Each entry has the same shape: title, what was decided, rationale, cost, when to revisit.
- `/about/lessons` — engineering lessons: bugs that took longer than expected, gotchas that revealed a boundary worth documenting, refactors that cleaned up earlier mistakes
- `/about/operations` — running, deploying, and observing the platform in either operating mode
- `/about/sim-engine` — simulation engine deep-dive: determinism, anomaly injection, paired-year mechanics
- `/about/etl` — ETL deep-dive: source-adapter / transform separation, canonical fixtures, detection rules, the macro pipeline
- `/about/api` — API deep-dive: dual-mode operation, endpoint catalog, schema discipline, observability stack
- `/about/portal` — portal deep-dive: server-component data flow, URL-synced state, the next/headers boundary, charts
- `/about/detection-quality` — current recall, false-positive rate, and per-anomaly-type recall for the detection layer, with the platform's detection contract verdict. Reads the upstream API's `/insights/detection-quality` endpoint at request time.

Most pages are static React Server Components — no auth, no API calls, just content. The `/about/detection-quality` page is the exception: it dynamically fetches the live measurement payload so the verdict reflects whatever the API is currently serving. The mermaid diagrams render via a small client component that lazy-loads mermaid from `cdn.jsdelivr.net` on mount; no npm package added.

## Frontend architecture

The portal is a Next.js 14 application using the App Router, written in TypeScript with strict mode on, styled with Tailwind, and built with `pnpm`. The codebase is small enough to read in a single sitting, and most of its real complexity lives in two places: the data layer that abstracts over the operating mode, and the exception triage page's client-side filter handling. The rest is conventional server-component rendering against pre-shaped data.

### App Router and rendering modes

Every route is a server component by default. The root layout at [app/layout.tsx](app/layout.tsx) wraps the page tree with the navigation chrome and the footer mode indicator; route segments under it render server-side and ship HTML directly to the browser. Client components are introduced by an explicit `"use client"` directive where interactivity needs the DOM — charts via recharts, popovers and sheets via Radix-derived primitives, sort controls on the index pages, and the URL-synced filter sidebar on `/exceptions`.

The route segments and how each one renders:

- `/` (daily dashboard) — server component that awaits `fetchDashboardData()` once per request. In offline mode the fetcher resolves via a dynamic JSON import and the page is statically prerendered at build time. In online mode the same fetcher proxies the upstream API and the page is dynamic per request.
- `/stores` and `/stores/[id]` — server components rendering pre-computed per-store data. The drilldown reads its `id` from `params`; invalid IDs render [app/stores/[id]/not-found.tsx](app/stores/[id]/not-found.tsx) instead of throwing.
- `/departments` and `/departments/[id]` — same shape as stores: a server-rendered index plus a per-department drilldown.
- `/exceptions` — server component that fetches all 178 anomaly rows once, then renders a client-side filter shell. Filtering happens client-side; the URL is the single source of state.
- `/about/*` — eight static documentation pages (`architecture`, `decisions`, `lessons`, `operations`, `sim-engine`, `etl`, `api`, `portal`) plus an index. Each is a server component returning JSX from typed constants under `lib/about/`. No data fetching, no client state. A ninth page, `/about/detection-quality`, is dynamic: it fetches the live measurement payload from the API at request time so the rendered verdict tracks whatever the upstream is currently serving.
- `/api/*` — route handlers, not pages. Each one inspects `getApiMode()` and either reads from `fixtures/` or proxies to `API_BASE_URL`, with structured logging and prom-client metric updates on every call.

The full lesson behind the rendering split lives at `/about/lessons` under "The Vercel deploy bug that became an architectural improvement". The short version: an earlier shape used `next/headers` to construct a self-fetch URL inside each server fetcher, which broke under Vercel's partial-prerender path. The fix restructured each fetcher so the offline branch reads JSON directly via dynamic `import()` and never calls `headers()`. The dashboard and `/exceptions` pages flipped from `ƒ (Dynamic)` to `○ (Static)` in the production build output as a side effect.

### Data fetching layer

The `lib/*-data.ts` modules are the data layer. Each module exposes a server-side fetcher (`fetchDashboardData`, `fetchStoreData`, `fetchExceptionsData`, and so on) that returns a TypeScript-typed shape mirroring the API's Pydantic response schemas, plus pure shape transformers that operate on the raw API output. Pages call the fetcher and receive a fully-shaped object; the shape transformer is what unit tests exercise.

Two patterns hold across all of them. The first is that fetchers are mode-agnostic at the call site: a page awaits `fetchStoreData(storeId)`, and the fetcher branches internally on `getApiMode()` to decide whether to dynamic-`import()` a fixture or to issue an HTTP request. Pages and components never know which branch ran. The contract test at [tests/contract/api-portal-contract.test.ts](tests/contract/api-portal-contract.test.ts) verifies that the offline shapes match what the online API returns. The second is that pure transforms stay separate from IO. The fetcher's IO step returns raw API rows; a synchronous shape function runs over those rows and produces the typed dashboard / store / department / exceptions shape the page consumes. The transformers have no IO of their own, which is what lets the unit tests assert specific derived values without spinning up a fixture loader.

The [lib/exceptions-data.ts](lib/exceptions-data.ts) and [lib/exceptions-data-server.ts](lib/exceptions-data-server.ts) split encodes a server/client boundary that took a build failure to surface. The first version of `exceptions-data.ts` imported `headers` from `next/headers` for request-correlation forwarding; that pulled a server-only dependency into a module the filter sidebar (a client component) imported. The build failed with the standard Next.js "you're importing a component that needs `next/headers`" diagnostic. The split that emerged: `exceptions-data.ts` is pure — types, filter predicates, the shape function — and safe to import from either side of the server/client boundary. `exceptions-data-server.ts` is server-only and holds the fetcher that uses `headers()`. The full write-up is at `/about/lessons` under "The next/headers error that revealed the server/client boundary".

### Client islands

Pages are server-rendered with small client islands where interactivity needs them. The islands are:

- **Charts.** Every recharts component is a client component. The dashboard's `SalesTrendChart` and `TopStoresChart`, the store drilldown's `YearOverYearChart`, `DepartmentMixChart`, and `TopDepartmentsChart`, and the department drilldown's `DepartmentTrendChart` and `DepartmentByStoreChart` all sit under `"use client"`. They receive pre-computed data arrays as props from the server components above them; no chart fetches anything itself.
- **Sort controls.** [components/stores/StoresIndexClient.tsx](components/stores/StoresIndexClient.tsx) and [components/departments/DepartmentsIndexClient.tsx](components/departments/DepartmentsIndexClient.tsx) own sort state in `useState`. Sort is in component state rather than URL state because a column sort is a local preference, not the kind of view someone would share via link.
- **The exceptions filter shell.** [components/exceptions/ExceptionsContent.tsx](components/exceptions/ExceptionsContent.tsx), [FilterSidebar.tsx](components/exceptions/FilterSidebar.tsx), [ExceptionTable.tsx](components/exceptions/ExceptionTable.tsx), and [ExceptionDetailSheet.tsx](components/exceptions/ExceptionDetailSheet.tsx) are client components that share filter state through the `useExceptionsFilters` hook described in the next section.
- **The mermaid loader.** [components/about/MermaidDiagram.tsx](components/about/MermaidDiagram.tsx) is a client component that lazy-loads the mermaid library from `cdn.jsdelivr.net` on mount. Only `/about/architecture` renders one, so the bundle never loads on any other route.
- **The mode indicator.** [components/ModeIndicator.tsx](components/ModeIndicator.tsx) displays "Demo Mode" or "Live Data" based on `getApiMode()`. It is a client component so the layout (a server component) does not need to thread the mode value through props.

### Component organization

Components are grouped by feature surface, not by component type. The directories are:

- [components/dashboard/](components/dashboard/) — surfaces specific to `/` (KPI cards, the sales-trend chart, the top-stores chart, the severity card, the window indicator, the trade-area comparison)
- [components/store-drilldown/](components/store-drilldown/) — surfaces specific to `/stores/[id]`
- [components/stores/](components/stores/) — the stores index
- [components/departments/](components/departments/) — both the departments index and the per-department drilldown
- [components/exceptions/](components/exceptions/) — the filter sidebar, table, and detail sheet
- [components/about/](components/about/) — the mermaid diagram loader (the only client component the about pages need)
- [components/ui/](components/ui/) — shadcn-derived primitives (button, card, sheet, input, select, popover, badge, skeleton)
- [components/TopNav.tsx](components/TopNav.tsx) and [components/ModeIndicator.tsx](components/ModeIndicator.tsx) — chrome shared across all pages

The split between `stores/` and `store-drilldown/` looks redundant at first read; it isn't. `stores/` holds the index view's single client component for the sortable table, and `store-drilldown/` holds the per-store charts and cards that the dynamic `[id]` route assembles. The two surfaces share no component code, and the directory split makes that explicit. Components reach across feature directories only through `components/ui/`. There is no shared "charts" or "tables" catch-all — the year-over-year chart on a store page and the sales-trend chart on the dashboard look similar but are different components with different data shapes.

## State management

The portal has no React Context, no Zustand, no Redux, and no state library of any kind. Every piece of state that lives longer than a single render is either in the URL or derived from a request parameter the server component reads. The interactivity surface is small enough that this works without contortion, and skipping a state library cuts hydration boundaries, prop-drilling alternatives, and client bundle weight.

### The URL as state

The exceptions filter set is the only nontrivial client state in the portal, and it lives entirely in the URL. [lib/use-exceptions-filters.ts](lib/use-exceptions-filters.ts) is a hook that reads filter values from `useSearchParams()` on every render and exposes an `updateFilters()` callback that pushes a new URL via `router.push()`. There is no internal `useState`; the URL is the source of truth.

This shape gives three things for free. A URL like `/exceptions?severity=warning&store=3` reproduces the filtered view exactly, so a link can be shared. Browser back and forward navigate filter history because each `router.push()` adds a history entry. A page refresh preserves the filters because they were never in component memory. The trade-off is that filter changes go through Next's routing layer rather than a synchronous setState, so there is a small added latency per change; for a four-field filter on a 178-row table the latency is not perceptible.

The filters themselves are narrow: a date range, one or more severities, an optional store ID, and an optional rule ID. The rendered table depends on those fields plus the static row set that the server component fetched once. Nothing else feeds into what renders, so nothing else needs to be state.

### Server-derived state

For routes parameterized on a segment — `/stores/[id]`, `/departments/[id]` — the URL segment IS the state. The server component reads `params.id`, validates it, and renders accordingly. There is no client-side store-id state object that synchronizes with the URL; the URL is read directly inside an `async` server component and that read is the only source.

The dashboard's date window works similarly. The page reads its window from the API's `/dashboard-summary` response (which carries the canonical demo dates as part of the payload) rather than from a client-managed date range. A future date-range picker on the dashboard would extend the same pattern: encode the range in `searchParams`, read it server-side, pass it into the fetcher.

### Why no global state library

The architectural decision to skip a state library is recorded under "Portal frontend" at `/about/decisions`. The short version: the platform's interactivity is filter-shaped, the filter sets are narrow, the data sets are bounded, and the URL already does what a client store would do — without the hydration boundary, the import weight, or the extra place a stale value can live. Adding a state library would buy nothing the current shape lacks. The cost noted in the decision body is that adding genuinely client-resident state (a drag-and-drop reordering of dashboard cards, say) would need to introduce one; the team would have to make that call when the requirement appeared.

## Performance

The portal serves three first-class user surfaces (dashboard, store drilldown, exceptions) plus a documentation hub. The performance posture is not the result of profile-and-tune; it is the result of architectural choices that keep the client bundle small and the render path direct. The headline facts: pages ship server-rendered HTML, charts receive pre-computed data rather than fetching client-side, the dashboard and `/exceptions` pages are statically prerendered, and the largest third-party dependency on the about pages is lazy-loaded outside the critical path.

### Server components first

Most of what reaches the browser is HTML, not JavaScript. The dashboard, store drilldown, department index and drilldown, exceptions, and every about page are server components at the top level. Client components are scoped to interactive surfaces — charts, sort controls, the filter sidebar, the mermaid loader, the mode indicator — so the JavaScript bundle ships only what those surfaces need.

The KPI cards on the dashboard, the trade-area comparison, the dashboard window indicator, and the store header are all server components: they receive numbers, they format and render them, and they never become interactive. None of them appear in the client bundle.

### Charts receive pre-computed data

Every recharts component is a client component (recharts needs the DOM and a layout-aware container), but no chart fetches anything itself. The year-over-year chart on `/stores/[id]`, the sales trend chart on `/`, the top-stores chart, the department mix chart, the department trend and per-store charts — each receives a fully-shaped data prop from the server component above it. The shape function that derives those arrays runs server-side, inside the page's `await` of the fetcher.

This matters for two reasons. First, no chart triggers a separate request after page mount, so time-to-interactive is not gated on a follow-up fetch. Second, the same shape function is unit-tested directly: the chart is the rendering of a value that the test asserts, rather than a thin wrapper around an in-component fetch.

### Static prerender on offline

In offline mode, the dashboard and `/exceptions` pages produce a `○ (Static)` line in the production build output. The fetcher reaches a dynamic `import()` of a JSON fixture, which Next can resolve at build time; no `headers()` call, no `searchParams` access, no other dynamic API touches the request path. The HTML is generated once at `pnpm build` and served from the CDN edge per request.

The route that switched from dynamic to static was the Vercel deploy lesson described under Frontend architecture. The before-state had the server fetcher calling `headers()` to construct a self-fetch URL; that call forced Next into the dynamic-render path even when no per-request information was actually needed. Removing it dropped the page back to static. The dashboard is the most-visited demo URL, and serving it from the edge with no server function invocation per request matters for cold-start latency on a Vercel free tier.

### Mermaid lazy-loaded from CDN

The architecture page renders a mermaid data-flow diagram. The mermaid library is roughly 400KB minified and is not in the portal's npm dependencies; it is loaded at runtime from `cdn.jsdelivr.net` by [components/about/MermaidDiagram.tsx](components/about/MermaidDiagram.tsx) on mount. Pages that do not render a mermaid diagram (every route outside `/about/architecture`) never trigger the load.

Two design notes worth flagging. The `<script>` tag is only appended after the component mounts, and the loader checks for an existing tag before adding a new one, so a page with multiple mermaid blocks does not download the library twice. The fallback if the CDN is unreachable is a styled error message rather than a crash; the diagram is documentation, and a broken diagram should not break the page that hosts it.

### Where the perf posture has not been measured

Nothing in this section has a Lighthouse score or a Real User Monitoring number behind it. The portal has no instrumentation for browser-side performance and no synthetic-monitoring suite. The claims above are derivable from reading the build output and the bundle composition; a true performance review would need numbers the codebase does not currently produce.

## Accessibility

Accessibility on the portal is more about discipline than instrumentation. There is no automated a11y testing in CI, no axe or pa11y dependency, and no formal audit. What does exist is a consistent use of semantic HTML and the Radix-derived primitives that come with keyboard and screen-reader behavior already wired in.

### Semantic markup

The exception table uses `<table>`, `<thead>`, `<tbody>`, and `<th>` elements rather than divs, so a screen reader announces it as a table with column headers. The filter sidebar uses `<label>` elements for each filter group. Page headings step down in order (`<h1>` per page, `<h2>` per major section, no skipped levels). The mode indicator carries an explicit `aria-label` (`Data source: Live Data` or `Data source: Demo Mode`) so the badge is announced as state rather than read as a stray word.

### Keyboard interaction

The interactive primitives the portal uses for filtering and overlays are Radix-derived (`Sheet`, `Select`, `Popover`). Each ships with keyboard interaction built in: arrow keys move focus inside a select, Escape closes a sheet, focus is trapped inside a sheet while it is open, and focus returns to the trigger when the sheet closes. The portal does not override or rebind any of those behaviors. Sort buttons on the index tables carry `aria-pressed` so the active column is exposed as state, and the up/down chevrons are `aria-hidden` so they do not get read as text content.

### Color and contrast

The Tailwind config defines the brand palette as Deep Navy (#1C2B3A), Shore Rust (#C05E35), Kelp Green (#3D6B52), Sea Glass (#7FAAA0), and Salt White (#F5F0E8), with separate severity tokens (`severity-critical`, `severity-warning`, `severity-info` and their `-strong` variants) for the exception severity badges. The body and heading colors against the page background are WCAG AA at standard sizes; the severity badges use the `-strong` variants when sitting on the lighter `sea-glass` background so the contrast still clears AA.

### Where this falls short

There is no automated accessibility check in CI. Chart components from recharts render SVG and do not produce table-grade structure underneath; a screen-reader user listening to the dashboard's sales trend chart hears the chart as a graphic, not as a series of values. Focus styles on a few of the custom-styled buttons rely on the Tailwind `ring` utility, which is visible but not as obviously the system focus ring; this has not been spot-checked against high-contrast OS themes. The about pages have no `lang` attribute set per page (the document-level `lang="en"` covers them, but per-section language tagging would help a screen reader in a mixed-language deployment, which this codebase does not target).

The honest summary: the portal is keyboard-navigable and uses semantic structure for the surfaces a triager would interact with, but it has not been audited against WCAG 2.2 AA as a deliberate program. Treating it that way would be a separate piece of work.

## Design system

The portal's visual language is a small set of brand color tokens and a three-typeface stack. There is no Figma file backing this; the tokens live in code, and the components consume them through Tailwind utilities and shadcn-derived primitives.

### Tokens

The Tailwind config at [tailwind.config.ts](tailwind.config.ts) defines the brand palette as five named tokens — `brand.deep-navy` (#1C2B3A), `brand.shore-rust` (#C05E35), `brand.kelp-green` (#3D6B52), `brand.sea-glass` (#7FAAA0), and `brand.salt-white` (#F5F0E8) — plus the severity-specific tokens (`severity.critical`, `severity.warning`, `severity.info` and their `-strong` variants) used for the exception badges. The semantic tokens that shadcn primitives consume (`primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `ring`, `background`, `foreground`, `card`, `popover`) are CSS custom properties defined in [app/globals.css](app/globals.css) and read into the Tailwind config as `hsl(var(--token))` references.

The typography stack uses three Google Fonts loaded via [`next/font/google`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) in [app/layout.tsx](app/layout.tsx): Playfair Display for display headings (`font-display`), Libre Baskerville for serif body copy on the about pages (`font-serif`), and DM Sans for UI chrome and dashboard text (`font-sans`). `next/font` self-hosts the fonts at build time, so there is no third-party request for typography after the page loads.

### Primitives

[components/ui/](components/ui/) holds the shadcn-derived primitives: `button`, `card`, `sheet`, `input`, `select`, `popover`, `badge`, `skeleton`. Each is a copy of the standard shadcn template with the brand's tokens applied through the Tailwind config; the underlying interaction primitives are Radix-based. There is no `dialog` or `dropdown-menu` primitive in the directory because no surface in the portal needed one yet — the shadcn convention of "copy it in when you need it" means the primitive directory grows with the surface area rather than being installed in bulk.

### Where the design system lives in code

If a reviewer wants to read the design system top-to-bottom: start at [tailwind.config.ts](tailwind.config.ts) for the brand color and font tokens, [app/globals.css](app/globals.css) for the semantic tokens and any base styles, then [components/ui/](components/ui/) for the primitives. Brand colors are referenced as `text-brand-deep-navy`, `bg-brand-salt-white`, and so on; severity colors as `text-severity-critical`. Components do not redefine these locally.

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

The capture script paginates through the API's 200-row cap and assembles the full dataset (store-metrics at 2,944 rows and department-metrics at 29,414 each take many 200-row calls, which the script walks by offset and concatenates; the 178-row anomalies set now fits in a single page).

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

## Testing approach

```bash
pnpm test          # Run the full suite once (221 tests across 28 files)
pnpm test:watch    # Watch mode
```

The suite is Vitest with the jsdom environment, `@testing-library/react` for component tests, and `@testing-library/jest-dom` matchers. The full run completes in about 25 seconds locally and is the same suite CI runs on every push. The detailed conventions live in [__TESTING_NOTES.md](__TESTING_NOTES.md); the summary below is the orientation a reader needs from the README.

### Categories of test

Tests are graded into the three categories the platform's other repositories use:

- **Business-correctness** — asserts a specific derived value that was computed independently of the implementation. A `shapeDashboardData` test that hand-reduces sample rows and asserts the shaper lands on the same total is business-correctness; a contract test that reconciles per-store sales against the full-window dashboard total is business-correctness.
- **Structural** — asserts shape (a property is present, a value has the right type, a row count matches) but not specific values. Useful as an entry-level floor; not sufficient on its own for hot-path code.
- **Ceremony** — runs code but verifies nothing beyond "no exception raised."

Most tests are business-correctness assertions against independently-derived expected values; the rest are structural shape checks covering logging and metrics interface shape, where the data hot path is elsewhere. The rationale for leaving each remaining structural test is in [__TESTING_NOTES.md](__TESTING_NOTES.md) under "Known weak areas".

### Test naming and structure

Each test file mirrors the source it covers. [lib/dashboard-data.ts](lib/dashboard-data.ts) is exercised by [tests/lib/dashboard-data.test.ts](tests/lib/dashboard-data.test.ts); [components/stores/StoresIndexClient.tsx](components/stores/StoresIndexClient.tsx) is exercised by [tests/components/StoresIndexClient.test.tsx](tests/components/StoresIndexClient.test.tsx). The file layout is the same shape as the source tree.

Tests are short — typically five to fifteen lines including setup. The unit tests for the shape transformers use small inline fixtures defined at the top of the file rather than reading from disk; the contract test uses the bundled JSON fixtures because its job is precisely to assert the API's output. Component tests drive interaction through `fireEvent`; `@testing-library/user-event` is not a dependency.

The 22 test files break down as:

| File | Tests | What it covers |
|---|---|---|
| [tests/api/proxy-route.test.ts](tests/api/proxy-route.test.ts) | 31 | Parameterized coverage of the six `/api/*` handlers built from `makeProxyRoute`: offline-fixture path, online-upstream success, online-upstream failure (fixture fallback with `X-Data-Source: fallback` for the five data routes, structured 503 body for health), and `x-request-id` propagation |
| [tests/api/store-metrics.test.ts](tests/api/store-metrics.test.ts) | 3 | Route handler in offline mode (fixture path), online mode (proxy path), and online-mode-with-upstream-failure (fixture fallback marked `X-Data-Source: fallback`) |
| [tests/app/departments-error.test.tsx](tests/app/departments-error.test.tsx) | 2 | Departments drilldown `error.tsx` boundary: heading, recovery copy, digest rendering, retry callback |
| [tests/app/departments-loading.test.tsx](tests/app/departments-loading.test.tsx) | 1 | Departments drilldown `loading.tsx` skeleton scaffold |
| [tests/app/departments-not-found.test.tsx](tests/app/departments-not-found.test.tsx) | 1 | Departments drilldown `not-found.tsx`: heading, valid-id hint, link back to index |
| [tests/app/exceptions-error.test.tsx](tests/app/exceptions-error.test.tsx) | 2 | Exceptions triage `error.tsx` boundary |
| [tests/app/stores-error.test.tsx](tests/app/stores-error.test.tsx) | 3 | Stores index and drilldown `error.tsx` boundaries |
| [tests/components/DepartmentsIndexClient.test.tsx](tests/components/DepartmentsIndexClient.test.tsx) | 15 | Default sort, re-sort on new field, direction toggle, per-field defaults, card links to detail routes |
| [tests/components/ModeIndicator.test.tsx](tests/components/ModeIndicator.test.tsx) | 4 | Mode-aware badge rendering (Demo Mode vs Live Data) |
| [tests/components/StoresIndexClient.test.tsx](tests/components/StoresIndexClient.test.tsx) | 13 | Default sort, re-sort, direction toggle, per-field defaults, card links |
| [tests/contract/api-portal-contract.test.ts](tests/contract/api-portal-contract.test.ts) | 6 | API → portal contract: dashboard, stores, departments, exceptions, cross-grain reconciliation, cross-endpoint reconciliation |
| [tests/lib/api-mode.test.ts](tests/lib/api-mode.test.ts) | 4 | `API_MODE` resolver, default behavior, env var override |
| [tests/lib/dashboard-data.test.ts](tests/lib/dashboard-data.test.ts) | 29 | Dashboard shape transformer: KPI aggregation, top-stores ranking, daily trend, severity breakdown, PoP and YoY deltas, trade-area summaries |
| [tests/lib/dashboard-periods.test.ts](tests/lib/dashboard-periods.test.ts) | 13 | Calendar-month period derivation and `computeDelta` |
| [tests/lib/department-data.test.ts](tests/lib/department-data.test.ts) | 15 | Per-department drilldown shape transformer (totals, PoP and YoY deltas, trend) |
| [tests/lib/departments-index-data.test.ts](tests/lib/departments-index-data.test.ts) | 8 | Departments index aggregation |
| [tests/lib/exceptions-data.test.ts](tests/lib/exceptions-data.test.ts) | 20 | `shapeExceptionsData` severity sort, rule-family description synthesis, `applyFilters` predicate composition |
| [tests/lib/fixture-loader.test.ts](tests/lib/fixture-loader.test.ts) | 5 | JSON fixture imports pinning canonical dataset values (178 exceptions, 2944 store-days, eight stores, Health envelope) |
| [tests/lib/get-base-url.test.ts](tests/lib/get-base-url.test.ts) | 3 | `getBaseUrl()` happy path plus the two static-prerender failure modes (`headers()` returns null, `headers()` throws) |
| [tests/lib/logger.test.ts](tests/lib/logger.test.ts) | 3 | pino configuration, child logger creation, `request_id` binding |
| [tests/lib/metrics.test.ts](tests/lib/metrics.test.ts) | 3 | prom-client Registry singleton, counter and histogram wiring |
| [tests/lib/store-data.test.ts](tests/lib/store-data.test.ts) | 9 | Store drilldown shape transformer (year-over-year alignment, department mix) |
| [tests/lib/stores-index-data.test.ts](tests/lib/stores-index-data.test.ts) | 6 | Stores index aggregation |
| **Total** | **199** | |

### Fixture-driven testing and the contract chain

The bundled JSON files in [fixtures/](fixtures/) (six of them: dashboard-summary, store-metrics, department-metrics, dim-stores, anomalies, health) are byte-identical captures of API responses. They serve two roles. At runtime in offline mode they are the data source the page server components consume. At test time they are the input the contract test exercises. A fixture change is verified by the same tests that catch a portal-side regression, and the contract test asserts the canonical totals (178 anomalies on the canonical run, with six of the nine rule definitions firing (`revenue_band`, `labor_pct_band`, and `avg_ticket_band` are within band on this dataset and don't fire); 2944 store-days across eight stores and 368 days; the dashboard window totals that the per-store and per-department aggregates reconcile back to).

This file is the last link in a contract chain that starts at the sim engine. The ETL pins sim engine → ETL with `test_sim_engine_contract.py`, the API pins ETL → API with `test_etl_contract.py`, and this repository pins API → portal with [tests/contract/api-portal-contract.test.ts](tests/contract/api-portal-contract.test.ts). A value asserted at one layer's contract test traces to the same value at the next; a fixture-out-of-date failure anywhere in the chain is the signal that the dataset moved and the layer below must catch up.

### What is not tested

No end-to-end browser tests run on this repo. There is no Playwright suite, no Cypress, no visual regression tooling, and no synthetic uptime monitor on the deployed instance. The about pages do not have individual test files; their content is reviewed in PR rather than asserted in code, on the rationale that asserting prose against a snapshot adds maintenance cost without catching anything a careful read would not. Chart components — KPI cards, recharts wrappers, card-shaped server components — are also not unit tested. The rendering is reviewed visually, and the data those components render is asserted at the shape-transformer layer, so a wrong number cannot escape to a chart without a test failing first.

## Engineering practices

### TypeScript and the contract surface

[tsconfig.json](tsconfig.json) has `"strict": true` and the codebase compiles cleanly under it. [lib/types.ts](lib/types.ts) mirrors the API's Pydantic response schemas one-for-one: the `Store`, `StoreMetric`, `DepartmentMetric`, `Anomaly`, `Health`, and `DashboardSummary` types match the field names, optionality, and types the API serves. The contract test at [tests/contract/api-portal-contract.test.ts](tests/contract/api-portal-contract.test.ts) verifies the types stay aligned with what the API actually returns; a schema drift surfaces there before it reaches a runtime error in a page.

### Linting and formatting

`pnpm lint` runs ESLint via `next lint` against the Next.js default config. No Prettier configuration is committed; the codebase is consistent enough by editor convention that adding a formatter would be more churn than payoff for the current contributor count. If a future contributor wants to add one, [`prettier` with `prettier-plugin-tailwindcss`](https://github.com/tailwindlabs/prettier-plugin-tailwindcss) is the canonical pairing for a Tailwind codebase.

### Git discipline

Commits follow the Conventional Commits format (`feat(scope):`, `fix(scope):`, `test(scope):`, `docs(scope):`, `refactor(scope):`, `chore(scope):`). Feature work happens on a branch named `feature/<descriptive>` or `fix/<descriptive>`, opened against `dev`. The `dev` branch is the default integration target; `main` advances when `dev` is cut for release. Commit subjects are in imperative voice and stay under 72 characters; bodies explain why rather than restating the diff.

### The about pages as engineering artifact

The most useful pointer this README can give a reviewer is to the `/about` pages. They are part of the codebase, deployed alongside it, and they hold the reasoning that does not fit in code comments or commit bodies. Three of them are worth a reader's time even on a short skim:

- [`/about/architecture`](app/about/architecture/page.tsx) — the platform-wide architectural narrative, with a mermaid data-flow diagram and per-layer responsibilities across the simulation engine, ETL, API, and this portal.
- [`/about/decisions`](app/about/decisions/page.tsx) — 30 architectural decisions across six categories (Architecture, Data integrity, Deliberate non-features, API design, Portal frontend, Engineering practices). Each entry has the same shape: title, what was decided, rationale, cost, when to revisit. The "Portal frontend" category is the one a frontend reviewer will spend the most time in.
- [`/about/lessons`](app/about/lessons/page.tsx) — engineering lessons from building the platform: bugs that took longer than they should have, gotchas that revealed a boundary worth documenting, and refactors that cleaned up an architectural mistake. The `next/headers` boundary story and the Vercel-deploy-static-prerender story are both there.

These pages exist to make the codebase legible to readers without the author's full context. If a reviewer reads three things in this repo, the README would point them at those three.

## Tech stack

Next.js 14 (App Router) · TypeScript (strict) · Tailwind v3 with shadcn/ui via base-ui-components · Vitest · pnpm · pino · prom-client · recharts (pinned to v2)

## Deployment

The portal has two production deployment targets that share the same Next.js application code:

- **Vercel** — the public demo URL. Builds on Vercel's infrastructure and serves Vercel's runtime. Does not use the `Dockerfile`.
- **Docker** — a portable container image used by the meta-repo compose stack and any container host that runs the platform end-to-end.

### Public deployment (Vercel)

The Vercel deployment is the public URL for the demo. Initial setup happens once in the Vercel UI:

1. Sign in to [vercel.com](https://vercel.com).
2. Click **Add New → Project** and authorize the GitHub integration if prompted.
3. Select the `knot-shore-portal` repository.
4. Vercel auto-detects the Next.js framework. The `vercel.json` at the repo root pins the install and build commands.
5. Under **Environment Variables**, add `API_MODE=offline`. The portal will serve bundled fixtures and needs no other configuration.
6. Click **Deploy** and wait for the build to finish.
7. Visit the deployed URL: `https://knot-shore-portal.vercel.app/` — the landing page should render with the "Demo Mode" footer badge.

Switching the deployment from offline to online is a future step: once the upstream `economic-data-api` is deployed, set `API_MODE=online` and `API_BASE_URL=<api-url>` in the Vercel project settings.

### Container deployment (Docker)

The `Dockerfile` produces a target-agnostic image using Next.js's standalone output mode. The final image runs as a non-root user on `node:20-alpine` and has no application dependencies beyond what the runtime bundle imports.

Build:

```bash
docker build -t knot-shore-portal .
```

Run in offline mode (default):

```bash
docker run --rm -p 3000:3000 knot-shore-portal
```

Open http://localhost:3000.

Run in online mode against a reachable upstream API:

```bash
docker run --rm -p 3000:3000 \
  -e API_MODE=online \
  -e API_BASE_URL=https://api.example.com \
  knot-shore-portal
```

The port the container binds to is configurable. To run on port 4000 (for example, to match a Cloud Run convention or to avoid a host port collision):

```bash
docker run --rm -p 4000:4000 -e PORT=4000 knot-shore-portal
```

### Smoke test

`scripts/smoke_test_container.sh` builds the image, runs a container in offline mode against bundled fixtures, polls `/api/health` until ready, and exercises four canonical endpoints. The container is cleaned up on exit.

```bash
./scripts/smoke_test_container.sh
```

The script requires Docker to be running. It does not require an upstream API.

### Environment variables

| Variable | Required? | Default | Description |
|---|---|---|---|
| `API_MODE` | optional | `offline` | `offline` serves bundled fixtures; `online` proxies to the upstream API. |
| `API_BASE_URL` | required when `API_MODE=online` | `http://localhost:8000` | Upstream `economic-data-api` URL. |
| `LOG_LEVEL` | optional | `info` | Log verbosity: `trace`, `debug`, `info`, `warn`, `error`, `fatal`. |
| `LOG_FORMAT` | optional | auto (pretty if tty, else json) | `pretty` for human-readable output; `json` for single-line structured logs. |
| `PORT` | optional | `3000` | Port the standalone server binds to. Read by the Next.js standalone runtime. |
| `HOSTNAME` | optional | `0.0.0.0` (set by `Dockerfile`) | Interface the standalone server binds to. |

`NODE_ENV` is set to `production` by both the `Dockerfile` runtime stage and the Vercel build, and is not typically set by operators.

### Notes on other container hosts

The image is platform-neutral. Notes for the most common targets:

- **AWS App Runner / ECS Fargate** — provide the image, set `API_MODE`, expose port 3000 (default) or set `PORT` to match the platform's expected port.
- **Google Cloud Run** — set `PORT=8080` so the container listens on Cloud Run's expected port. No other changes needed.
- **Railway / Render / Fly.io** — point the service at the repository or the built image; the platform supplies `PORT` automatically and the standalone server reads it.

## Adjacent repositories

- [`knot-shore-grocery-simulation-engine`](https://github.com/Caseykelly87/Knot-shore-grocery-simulation-engine) — generates the synthetic data that flows through the platform. Reader-grade narrative at [`/about/sim-engine`](https://github.com/Caseykelly87/knot-shore-portal/blob/main/app/about/sim-engine/page.tsx).
- [`economic-data-etl`](https://github.com/Caseykelly87/economic-data-etl) — ingests sim engine output into canonical parquet artifacts; runs the macro-economic pipeline (FRED, BLS, ERS). Reader-grade narrative at [`/about/etl`](https://github.com/Caseykelly87/knot-shore-portal/blob/main/app/about/etl/page.tsx).
- [`economic-data-api`](https://github.com/Caseykelly87/economic-data-api) — FastAPI service that this portal proxies to in online mode. Reader-grade narrative at [`/about/api`](https://github.com/Caseykelly87/knot-shore-portal/blob/main/app/about/api/page.tsx).
- [`knot-shore-platform`](https://github.com/Caseykelly87/knot-shore-platform) — orchestration repo that brings the four service repos together as Git submodules and runs the full pipeline locally with `docker compose up`. The only place the four services run end-to-end against live (rather than fixture-backed) data. Reader-grade narrative at [`/about/architecture`](https://github.com/Caseykelly87/knot-shore-portal/blob/main/app/about/architecture/page.tsx).

## License

MIT
