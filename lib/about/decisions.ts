/**
 * Architectural decisions made during the platform build. Each entry
 * follows a consistent shape so the index page renders uniformly.
 *
 * Two shapes coexist:
 *  - Short-form entries: decision, rationale, cost, revisitWhen.
 *  - Deep-treatment entries: problem, decision (what I chose), rejected,
 *    cost (read as "Tradeoff accepted"), revisitWhen (read as "When this
 *    breaks down"), and an optional honestNote. Deep entries omit rationale
 *    because `problem` and the decision text together carry that load.
 *
 * The renderer chooses shape based on whether `problem` is present.
 * Decisions are grouped into categories for navigability.
 */

export interface DecisionEntry {
  title: string;
  decision: string;
  cost: string;
  revisitWhen: string;
  rationale?: string;
  problem?: string;
  rejected?: string;
  honestNote?: string;
}

export interface DecisionCategory {
  name: string;
  description: string;
  entries: DecisionEntry[];
}

export const DECISIONS: DecisionCategory[] = [
  {
    name: "Architecture",
    description: "Decisions about the structural shape of the platform.",
    entries: [
      {
        title: "Two-mode demo as first-class",
        problem:
          "Configuration mistakes are common. A partial config — three of four paths set — shouldn't yield a half-broken API where some endpoints work and others 500. It should either work entirely or transparently fall back. Separately, the platform needs a coherent story for \"how do I see this run\" — a clone-and-demo path that works without infrastructure alongside a production path that uses live data.",
        decision:
          "Both the API and the portal support offline mode (bundled fixtures) and online mode (live data) as production-ready paths. On the API, mode resolution is all-or-nothing: the four grocery file-path env vars (`STORE_METRICS_PATH`, `ANOMALY_FLAGS_PATH`, `DEPARTMENT_METRICS_PATH`, `DIM_STORES_PATH`) must all resolve to readable files for live mode to engage; otherwise the API serves bundled fixtures. The `resolved_*_path` properties on the Settings model check `Path(...).is_file()` per-property; `grocery_data_source` returns \"live\" only when all four resolve. The `/health` endpoint reports the current mode so an operator can see it. Neither mode is degraded; both serve the same dashboards with the same shape.",
        rejected:
          "Per-endpoint mode resolution — would let some endpoints serve live data while others served fixtures, confusing to debug. Failing loudly on partial config — would block local dev where you might want to point only one path at a custom file. Live-only operation — operationally fragile for a demo.",
        cost:
          "Two code paths to maintain in route handlers and config. Mode selection logic in two places (API config, portal route handlers). A misconfigured live deployment looks indistinguishable from an intentional fixture deployment unless you check `/health` — an operator who set three of four paths might not realize the API silently fell back.",
        revisitWhen:
          "At any production scale where silent fallback would be a critical operational concern. Production deploys should be configured to fail loudly on missing config; the all-or-nothing pattern is a demo-mode convenience. If the maintenance burden of dual modes ever exceeds the demo-portability benefit, the modes can collapse to one.",
        honestNote:
          "The choice I rejected — \"fail loudly\" — would have been correct in production but wrong for a demo. The current behavior makes the dual-mode story cleaner for reviewers but is the wrong default for real use. The production-scale answer is [alerting on operational signals](/about/operations#alerting-on-operational-signals) rather than silent fallback.",
      },
      {
        title: "Offline mode as the public-deploy default",
        problem:
          "The public deployment needed to work reliably for any reviewer landing on the URL. Pointing at a live API adds: a separate API deployment, CORS configuration, the API needing to be always-up, and a larger surface area for things that can break in production. None of that serves the portfolio purpose.",
        decision:
          "The deployed Vercel portal serves bundled JSON fixtures rather than fetching from the live API. The portal supports both modes via a `DataSource` abstraction with `LiveAPIDataSource` and `StaticFixtureDataSource` implementations; the mode is determined by environment variable at deploy time. The frontend code is identical across modes — the abstraction swaps implementations transparently.",
        rejected:
          "Live-only deployment — operationally fragile for a demo. Lazy-load fixtures from a CDN — adds complexity for no clear benefit. Server-side rendering against the API with build-time caching — works but defeats the point of demonstrating the dual-mode design.",
        cost:
          "The deployed portal can't show real-time updates or demonstrate live-API failure modes. The fixtures are a snapshot — they don't reflect API changes until the canonical regeneration sequence runs and the fixtures are recommitted.",
        revisitWhen:
          "When demonstrating the platform to someone who wants to see live-API integration behavior. At that point, a separate online-mode deployment, or a `?mode=live` URL parameter that triggers live fetching, makes sense. For now offline mode is the better default for the public surface.",
        honestNote:
          "The cleanest version of this design — where offline mode imports JSON fixtures directly via dynamic import instead of fetching the portal's own routes — was the second design. The first version had server data-fetcher modules calling `headers()` and self-fetching the portal's own `/api/*` routes, which broke in Vercel's partial-prerender. The refactor into mode-branching fetchers is what made the page statically prerenderable. The bug was the gift — without it, the design wouldn't have been pushed to the cleaner shape.",
      },
      {
        title: "Source-adapter / transform separation in ETL",
        decision:
          "The ETL repo's grocery ingestion strictly separates source-format-aware code (sim_ingest.py) from source-format-agnostic transform code (sim_transform.py).",
        rationale:
          "If the sim engine ever changes its CSV layout, only sim_ingest.py needs updating. The transforms operate on typed in-memory records and don't know whether the data came from CSV, JSON, or Avro. This boundary is the basic discipline of pipeline engineering.",
        cost:
          "An extra translation layer (raw rows -> typed records). Slight verbosity in the type definitions.",
        revisitWhen: "Never. This is foundational pipeline architecture.",
      },
      {
        title: "Daily aggregates only",
        decision:
          "The platform operates at daily grain. No real-time data, no streaming, no SSE/WebSockets.",
        rationale:
          "Stakeholder dashboards answer end-of-day questions, not minute-by-minute questions. The data sources (FRED, BLS, ERS) and the simulated retail data are themselves daily-grain. Adding real-time would multiply complexity without serving a real user need.",
        cost:
          "The platform cannot answer questions like 'what is happening right now.' Acceptable given the user audience.",
        revisitWhen:
          "Operations users (not stakeholder users) become a target audience.",
      },
      {
        title: "Static-band rules over ML for detection",
        problem:
          "Anomaly detection on retail data has obvious appeal for ML — seasonal baselines, store-level fitted distributions, multivariate outlier scoring. But the actual constraints were narrower: the detection contract is recall at least 0.35 and false-positive rate at most 0.10 on injected anomalies; every flagged exception has to answer \"why was this flagged\" with an expected range the operator can read.",
        decision:
          "Anomaly detection uses rule-based logic with documented thresholds, not machine-learning models. Three rule kinds in `config/detection_rules.yaml`. Five static-band rules over the store-day grain: revenue band ±25%, labor_pct band ±5pp around the profile center, avg_ticket band ±20% around the profile center, transactions band ±25%, yoy_comp [0.85, 1.25]. One structural-integrity rule over the department grain — `department_coverage` — flags store-days whose department row count deviates from the canonical 10. One rolling-window rule — `revenue_zscore_28d` — flags store-days where revenue is at least 2.5 standard deviations from each store's trailing 28-day mean; it's still rule-based in the same sense (no model training, no fitted parameters) but learns its baseline from data rather than reading it from config, and fires only when at least 14 days of trailing history exist per store. Severity buckets come from distance past the expected range. Each store has a `trade_area_profile` (suburban-family, urban-dense, value-market) and the static-band thresholds are configured per profile. The yoy_comp rule fires only where a T-365 baseline exists; otherwise it's silently skipped. All three rule kinds write to the same `anomaly_flags` schema so downstream consumers triage them through a single surface. The rules are interpretable, debuggable, and meet the recall and false-positive contracts.",
        rejected:
          "Per-store fitted baselines from historical data — there's no real historical data; this is synthetic. Seasonal decomposition or STL outlier detection — overkill for deterministic test inputs. Isolation Forest or autoencoders — would have looked impressive on a resume but would have been unjustifiable here.",
        cost:
          "The static bands are deliberately wide because they don't adjust for day-of-week or seasonal variance, which produces some false positives on legitimate weekly cycles. Acceptable because the demo dataset is small and the detection contract is met. The `revenue_zscore_28d` rule is the first instance of the learned-baseline pattern the YAML config calls out as the future direction — empirical per-store expectations rather than configured per-profile thresholds — but it covers one metric only. Extending that pattern across labor_pct, avg_ticket, transactions, and yoy_comp is the next step where the static bands could be narrowed or replaced.",
        revisitWhen:
          "Real retail data with seasonality and promotion calendars would produce false-positive rates against the static bands well above the 0.10 contract. The z-score rule is the seed of an empirical-baseline approach but covers one metric; a full baselines phase would extend it across the metric set.",
        honestNote:
          "ML-based detection here would have been engineering theater. The platform handles 8 stores and 184 days of synthetic data. The rule-based approach is more honest than ML would have been, because the question is whether the rules' parameters match the simulator's parameters, which is a transparent test. ML would have hidden the question behind training data.",
      },
      {
        title: "Paired-year canonical",
        decision:
          "The canonical fixtures contain both 2024 and 2025 data, not just the demo window.",
        rationale:
          "Year-over-year comparison is a natural analytical question for stakeholder dashboards. The sim engine produces paired-year data natively (each run-command anchor generates the same calendar date one year prior). Including both years in the canonical lets the YoY chart on the store drilldown work without any new data sources or fetch patterns.",
        cost:
          "Canonical size doubles. Goes from ~250KB to ~500KB total. The yoy_comp anomaly rule fires for 2025 dates because there's now a 2024 baseline (extra 184 info-severity flags).",
        revisitWhen:
          "If a third year is needed, or if the canonical grows past ~50MB.",
      },
    ],
  },
  {
    name: "Data integrity",
    description:
      "Decisions that govern how data flows through the platform without losing identity or coherence.",
    entries: [
      {
        title: "Byte-identical fixtures across repos",
        problem:
          "A demo of the API needs working data. Three options: bundle test data and treat the API as standalone; require the user to run the full upstream pipeline first; keep data out of git and require a separate data-loading step.",
        decision:
          "The same parquet files exist byte-identically in the ETL repo's canonical directory and the API repo's `app/fixtures/` directory. The portal's JSON snapshots are captured from the API and live in the portal's `fixtures/`. Each repo owns its own copy because each repo is independently cloneable; a clone-and-run demo against any single repo produces the same data as a coordinated multi-repo run. Verification is mechanical: `cmp` at each boundary.",
        rejected:
          "Storing in S3 or a database that the API populates on startup — too much infra for a demo. Generating fixtures on API boot from a checked-in sim engine seed — would couple the API to the sim engine as a runtime dependency. Keeping them out of git entirely — the canonical state would be invisible in PR diffs.",
        cost:
          "Parquet files are binary; they don't diff well in PRs. The integrity depends on the two repos staying in sync — a regeneration in the ETL repo must be followed by a fixture copy to the API repo, or they drift. There's no automated check. At ~500KB total for the canonical, the on-disk cost is negligible.",
        revisitWhen:
          "When the canonical dataset grows beyond a few MB, or if the platform adds a fifth repo that needs the data. Right now the largest fixture is around 600KB.",
        honestNote:
          "I should have written a script to verify byte-identity between the two repos as a pre-commit hook. I didn't. Nothing actively enforces the invariant; it's enforced by remembering to copy. This is the highest-value automation I skipped.",
      },
      {
        title: "Anomaly_log boundary",
        problem:
          "Detection metrics (recall, false-positive rate) need ground truth. But if the detector knows the ground truth, it isn't detecting — it's looking up. The temptation to \"just join the anomaly log into the detection output\" is real because it makes evaluation trivial.",
        decision:
          "The sim engine's `anomaly_log.csv` is internal QA ground truth. Only one file in the entire platform may read it: `scripts/evaluate_detection.py` in the ETL repo. The ETL package itself must remain importable and runnable without the log existing. A social contract enforced by file location, not by mechanism.",
        rejected:
          "Encrypting or obfuscating the log — no real benefit; the contract is for the engineer, not an attacker. Moving the log out of the repo entirely — would make CI testing harder. Splitting the sim engine into \"generator\" and \"diary writer\" subprocesses — overkill.",
        cost:
          "Enforcement is purely social. Code review catches violations; nothing automated stops a future contributor from importing the log in detection code.",
        revisitWhen:
          "If the team grows past one engineer, or if detection rules become complex enough that the temptation grows. At that point a stricter mechanical enforcement — a lint rule or a CI grep check — would be needed.",
        honestNote:
          "I felt the temptation. The eval script lives in `scripts/` specifically so I could rationalize \"but this is just for measurement\" without it leaking into the package. The boundary works because I named it and put the resolution in the directory structure, not because I had discipline.",
      },
      {
        title: "Per-date deterministic seeding",
        problem:
          "Synthetic data has to support paired-year regeneration — the 2024 window must be byte-identical when regenerated. It also has to support partial regeneration: re-running a single date in the middle of the canonical window can't shift the surrounding dates. And the detection metrics need stable inputs across runs so the recall and false-positive contracts hold.",
        decision:
          "The sim engine seeds each generated day with `global_seed + date.toordinal()` rather than advancing a single RNG across dates. Per-date RNGs (sales, anomalies, realism) seed from this base, with anomaly injection offsetting by +1,000,000 and realism by +999,999 to isolate their distributions. Same date and same seed produces byte-identical output regardless of generation order — backfilling 2024-07-01 produces the same data whether it was generated as part of a 2024 backfill, a 2025 anchor's T-365 paired generation, or a single-day regeneration.",
        rejected:
          "A single global RNG that walks forward in time — the obvious naive approach. Rejected because any single-date regeneration cascades through every following date; you can't fix a bug in 2025-08-15 without invalidating every date after it. Also rejected: hashing the date string for the seed. The `toordinal()` approach is cheaper, deterministic across Python versions, and produces a uniform integer space that the offset isolation pattern relies on.",
        cost:
          "Slight overhead per date — a new RNG initialization per day. The offset constants (+1,000,000, +999,999) look like magic numbers and are.",
        revisitWhen:
          "If anomaly injection ever needs cross-date state — for example, \"exactly one anomaly per week per store\" — this scheme can't represent it without redesign.",
        honestNote:
          "I picked the offset constants without much thought. They're large enough that they can't collide with realistic seeds, but the actual rationale (orders of magnitude apart so distributions don't accidentally overlap) was post-hoc. They work; they're slightly embarrassing.",
      },
      {
        title: "Mirror-don't-modify when adding new grains",
        decision:
          "When new data grains or features are added, existing code paths stay byte-identical. New functions, schemas, and endpoints are added alongside rather than parameterizing existing ones.",
        rationale:
          "Department-grain ingestion didn't generalize the existing store-grain functions; it added load_department_sales alongside load_store_summaries. The /department-metrics endpoint mirrors /store-metrics rather than parameterizing one shared function. This trades duplication for explicitness — every existing test continues to pass byte-identically because no shared code changed.",
        cost:
          "More duplication than a maximally generic design would have. Some patterns appear three or four times.",
        revisitWhen:
          "If a fifth or sixth grain is added and the duplication tax exceeds the explicitness benefit.",
      },
    ],
  },
  {
    name: "Deliberate non-features",
    description:
      "Things the platform deliberately does not do, and the reasoning for each.",
    entries: [
      {
        title: "No user authentication",
        decision:
          "The portal has no login, no session management, no per-user state.",
        rationale:
          "The deployment pattern this targets is internal analytics tooling at 50-200 users, served inside a corporate network or behind a reverse-proxy auth boundary like NGINX with auth_request, Cloudflare Access, or an OAuth2 proxy like oauth2-proxy. At that scale and shape, application-layer auth is the wrong layer: every other internal tool in the same network already has identity, sessions, password reset, and SSO integration solved at the proxy, so duplicating that work in this app adds a second identity store to maintain for no gain in posture. The data model doesn't pull in the other direction either. Every endpoint serves the same data to every caller — no per-user state, no row-level security, no auth-driven content differentiation that an auth layer would need to drive.",
        cost:
          "The portal is not multi-tenant-safe. Deployment must include an [auth boundary at the infrastructure layer](/about/operations#authentication). Reverse-proxy auth also requires consuming whatever principal header the proxy injects (typically `X-Forwarded-User` or `X-Forwarded-Email`) and surfacing it in structured logs alongside `X-Request-ID`. That wiring isn't in the platform today — the request middleware propagates correlation IDs but doesn't capture a principal. Adding it would be a small middleware extension at the moment of first proxied deployment, not architectural work.",
        revisitWhen: "If the portal needs to serve external users or per-user customization.",
      },
      {
        title: "No write paths",
        decision:
          "All API endpoints are GET. Users cannot submit data through the portal.",
        rationale:
          "The platform renders analytics derived from the data pipeline; it doesn't accept user input that affects business state. Comments, annotations, or saved views could be added but would require auth (see above) and a [separate write path](/about/operations#authorization).",
        cost:
          "Operational features (annotating an exception, marking a flag as resolved) require a different platform.",
        revisitWhen: "When user-state features become a target.",
      },
      {
        title: "No SKU-level analysis",
        decision:
          "The data is aggregated at department-grain. SKUs (individual products) are not modeled.",
        rationale:
          "SKU-level analysis requires fundamentally different storage (millions of rows per day instead of tens of thousands), different UI affordances (search-and-filter for thousands of items), and different business questions. The platform's audience is regional managers, not category buyers.",
        cost:
          "Cannot answer 'which products drove the increase' questions. Department mix is the finest available grain.",
        revisitWhen: "When category-level audience needs the platform.",
      },
      {
        title: "No background job scheduling",
        decision:
          "The macro pipeline is Airflow-DAG-ready but [no scheduler is configured](/about/operations#a-scheduler-for-the-macro-pipeline). Pipeline runs are manual.",
        rationale:
          "Adding Airflow or Prefect to the local development stack adds significant complexity (Docker Compose, Postgres for the scheduler, web UI). For a build that mostly runs the pipeline ad-hoc, the cost outweighs the benefit. Production deployment would handle scheduling at the infrastructure level.",
        cost: "Pipelines run on demand. No automated freshness guarantees.",
        revisitWhen:
          "If the platform is deployed in an environment that needs continuous data freshness.",
      },
      {
        title: "No Redis or in-memory caching",
        decision:
          "API endpoints read directly from parquet (memory-mapped) or Postgres (with connection pooling). No Redis, Memcached, or application-level cache.",
        rationale:
          "API responses at this data scale are typically sub-100ms. Adding cache infrastructure would optimize a non-bottleneck. For specific endpoints that aggregate large data (dashboard-summary scans 1,472 rows), [cache could help](/about/operations#an-lru-cache-on-parquet-reads) — but the wins are marginal until concurrent load increases.",
        cost: "Some endpoints recompute on every request. At low concurrency, no observable issue.",
        revisitWhen:
          "If the API serves enough concurrent traffic that recomputation cost matters, or if response latency becomes user-visible.",
      },
    ],
  },
  {
    name: "API design",
    description:
      "Decisions about how the API exposes data and what its contracts look like.",
    entries: [
      {
        title: "200-row API limit",
        decision:
          "Every paginated endpoint enforces a 200-row maximum on the limit query parameter.",
        rationale:
          "200 rows is large enough that most queries don't need to paginate (the typical store has 184 days of data; the typical store-day has 10 departments). When pagination IS needed, 200 rows is small enough to keep response payloads under 100KB. The cap is enforced via Pydantic validation; queries with limit > 200 return 422.",
        cost:
          "Capture scripts and bulk readers must paginate. The portal's exception fixture is captured across 5 pages of 200.",
        revisitWhen:
          "If a future endpoint needs to return more than 200 rows in a single response and pagination is a meaningful UX cost.",
      },
      {
        title: "ZIP and county_fips as zero-padded strings",
        decision:
          "The /dim-stores endpoint serializes ZIP codes and county FIPS as 5-character zero-padded strings, even though the parquet stores them as int64.",
        rationale:
          "These fields are identifiers, not numbers. Arithmetic on a ZIP code is meaningless. Zero-padded strings round-trip correctly for entries with leading zeros (none in the current St. Louis-area data, but plausible for future expansion). The API service layer coerces from int64 to string at the contract boundary.",
        cost:
          "API service layer has explicit coercion logic. Schema declares str types; conversions are tested.",
        revisitWhen: "Never. This is the right shape for identifier fields.",
      },
      {
        title: "Department names embedded portal-side",
        problem:
          "Department names are referenced in three places: sim engine config, ETL transforms, and portal display. They could be served as reference data through the API. The question is whether the round-trip cost of an endpoint earns its keep at this scale.",
        decision:
          "The 10 department names are hardcoded as a TypeScript constant in the portal (`lib/dim-departments.ts`), not exposed through an API endpoint. The file carries a comment that says \"Keep in sync with the sim engine's department list.\" Departments are stable reference data; the names won't change in this build.",
        rejected:
          "Adding `/dim-departments` to the API and a portal fetcher to populate it — 10 strings; the round-trip cost in build, test, and maintenance exceeds the value. If a future phase needs server-side department names, the endpoint can be added following the `/dim-stores` pattern.",
        cost:
          "Three places that have to stay in sync. If the sim engine ever changes department names, the portal needs a code change. The list is short enough that the change is a one-line edit.",
        revisitWhen:
          "If the department taxonomy ever changes, or if a non-portal consumer needs the names. At that point an endpoint becomes worth the cost.",
        honestNote:
          "This is one of the calls where \"the right architectural answer\" (look up reference data through an API) is the wrong practical answer (10 strings, never changes, three minor edits if it ever does). I accepted the coupling rather than build infrastructure that wasn't earning its keep.",
      },
      {
        title: "Description synthesis client-side",
        decision:
          "The API's anomaly schema doesn't include a description field. The portal synthesizes a human-readable description from rule_id, actual_value, and the expected band thresholds.",
        rationale:
          "The API exposes the diagnostic data (actual, expected_low, expected_high, distance, severity_score). Composing that into prose is a presentation concern, not a data concern. Different consumers might want different prose conventions.",
        cost:
          "The portal's exceptions data layer has a synthesizeDescription function with format-family-aware logic (currency, percent, count). It's tested with three sample rule families.",
        revisitWhen:
          "If a non-portal consumer needs descriptions and re-implements the synthesis. At that point, exposing description from the API may be cheaper.",
      },
    ],
  },
  {
    name: "Portal frontend",
    description: "Decisions about how the Next.js portal is built.",
    entries: [
      {
        title: "Recharts pinned to v2",
        decision: "package.json pins recharts to ^2. Not ^3 (the current major version).",
        rationale:
          "Recharts v3 changed several core component APIs. The chart components in this portal use v2-style props (LineChart, Line, Tooltip, etc.). Upgrading would require rewriting every chart with no visual benefit.",
        cost:
          "Stuck on v2. Cannot use v3-only features. Long-term maintenance risk if v2 stops receiving security patches.",
        revisitWhen:
          "If v2 reaches end of life, or if v3 introduces a feature compelling enough to justify the rewrite.",
      },
      {
        title: "URL-synced filter state",
        problem:
          "A triage view needs to support shareable filtered links, browser back/forward navigation through filter changes, and surviving page refresh without losing the filter. React state alone solves none of these without additional plumbing.",
        decision:
          "The `/exceptions` page's filter state lives in URL query params, accessed via `useSearchParams`. Filter updates dispatch via `router.push`. The `useExceptionsFilters` hook reads `useSearchParams` and dispatches updates; no internal state — the URL is the model. Shareable URLs work (paste a `/exceptions?severity=warning` link to a colleague). Browser back/forward navigation restores prior filter state. Refresh preserves filters.",
        rejected:
          "React state with manual URL serialization — would have needed both-way sync logic. A state library like Jotai or Zustand — overkill for one page's filter state. Search params with a `useState` mirror — creates two sources of truth.",
        cost:
          "More code than `useState` would require. The hook (`use-exceptions-filters.ts`) is around 70 lines vs. 20 for local state. The page must be wrapped in `<Suspense>` because `useSearchParams` is a Next.js 14 client-only API. Every filter change re-renders the page (cheap because the filter logic is pure and the dataset is 894 rows). The URL gets long when many filters are active.",
        revisitWhen:
          "When filter state becomes complex enough that URLs become hostile — 15+ params with serialized objects. At that point a state library plus a URL-sync layer makes sense.",
        honestNote:
          "This is a pattern I'd seen described but hadn't used at scale. It worked the first time and was less code than I expected. The biggest surprise was how clean the test surface is — filter logic is pure, so all the unit tests live in `exceptions-data.test.ts` and never touch React.",
      },
      {
        title: "Client-side filtering after one fetch",
        problem:
          "Filter changes should feel instant. Round-tripping every filter change to the server makes the UI feel sluggish even on fast connections.",
        decision:
          "The `/exceptions` page fetches all 894 anomalies on page load — paginated through the API's 200-row cap in online mode, one fixture in offline mode — then filters client-side via `applyFilters`. The dataset is small enough that re-filtering on every keystroke is imperceptible.",
        rejected:
          "Server-side filtering with debounced fetches — would handle larger datasets but adds latency and complexity for a small table. Hybrid (paginate on server, filter on client within the page) — wastes work on both sides.",
        cost:
          "Won't scale to millions of rows. At ~10,000 rows the client-side filter remains snappy; at ~100,000 it would slow noticeably; at 1M+ it would freeze the browser.",
        revisitWhen:
          "When the dataset grows past tens of thousands of rows. Then server-side filtering with cursor-based pagination becomes necessary.",
        honestNote:
          "Acknowledged simplification. The right answer at production scale is almost always server-side filtering, but at this scale it's wrong — it adds latency for no benefit. The decision is explicit that the choice won't scale, but at current scale it's the better choice.",
      },
      {
        title: "Module split for next/headers boundary",
        decision:
          "Data layer files that use next/headers (server-only) are split from files containing pure types and utilities (importable from client components).",
        rationale:
          "Next.js refuses to bundle modules importing next/headers into client components. A client component importing applyFilters from a module that also exports fetchExceptionsData (which uses headers()) triggers a webpack error. The split is mandatory for any data layer with both server-fetch and client-importable utilities.",
        cost: "Two files instead of one. Naming convention: -server.ts suffix for the server-only file.",
        revisitWhen: "Never. This is a Next.js architecture invariant.",
      },
      {
        title: "Charts as client components, pages as server components",
        problem:
          "Next.js 14 App Router supports both server and client components. The boundary affects which APIs are available — `next/headers` is server-only, `useState` is client-only — and where data fetching can happen. The choice has to balance which work happens on the server vs. which work ships to the browser.",
        decision:
          "Pages (`app/page.tsx`, `app/stores/[id]/page.tsx`, `app/exceptions/page.tsx`) are server components that fetch data through `lib/*-data.ts` modules and pass shaped data as props to client components. The shape transformers are pure — no server-only imports — so they're unit-testable on their own. Charts (TopStoresChart, YearOverYearChart, SalesTrendChart) are client components because recharts uses browser APIs for SVG rendering. The boundary is clean: server fetches and shapes, client renders.",
        rejected:
          "SWR or React Query on the client — would have added a dependency and shifted fetching to client-side, defeating App Router's main feature. Pure server components for the charts — recharts requires a browser environment. Storing fetched data in a context — overkill for single-page data flow.",
        cost:
          "Two files for the exceptions data layer — `lib/exceptions-data.ts` (isomorphic; types, filter logic, shape function) and `lib/exceptions-data-server.ts` (server-only; the fetcher with the `headers()` import). Client components can import from the first; the second is server-only. This split is forced by `next/headers` being unavailable in client bundles. Every chart file starts with \"use client\"; components that do nothing interactive (KPI cards) stay server-side.",
        revisitWhen:
          "When data needs to be fetched dynamically client-side — polling, real-time updates. At that point the server-component pattern becomes the wrong shape and a state library would help.",
        honestNote:
          "The `next/headers` boundary caught me with a build error before I understood it. The split into `-server.ts` files was the second design, not the first. The discovery felt like fighting the framework before it clicked.",
      },
    ],
  },
  {
    name: "Engineering practices",
    description: "Decisions about how the code itself is written and maintained.",
    entries: [
      {
        title: "Conventional Commits everywhere",
        decision:
          "All commit messages follow Conventional Commits: feat:, fix:, refactor:, docs:, test:, chore:, ci: prefixes with optional scope.",
        rationale:
          "Searchable git history, automation-friendly (changelog generation), readable for reviewers. Every repo's commit log is consistent.",
        cost:
          "Discipline; not enforced by tooling. Occasional ambiguity about which prefix applies (refactor vs chore).",
        revisitWhen: "Never.",
      },
      {
        title: "Test-driven development across all repos",
        decision:
          "New behavior is implemented test-first. New bugs start with a failing test that reproduces them.",
        rationale:
          "Tests written after implementation tend to test the implementation rather than the behavior. Test-first forces the question 'what should this code do?' before 'how should this code do it?'",
        cost:
          "Slower for trivial code (where the test setup outweighs the implementation). For non-trivial code, test-first is faster than write-then-test.",
        revisitWhen: "Never.",
      },
      {
        title: "ExtraAdder in the structlog stdlib bridge",
        decision:
          "All three Python repos include structlog.stdlib.ExtraAdder() in their shared_processors list, between PositionalArgumentsFormatter() and timestamper.",
        rationale:
          "Without ExtraAdder, calls like logging.info('foo', extra={'k': 'v'}) silently drop the extra dict. The macro pipeline in the ETL repo deliberately uses this hybrid pattern (prose message + structured extra fields), so the processor must be present. The other two repos don't currently use the pattern, but their configurators are kept identical for consistency.",
        cost:
          "Three configurator files that must be kept in sync. Periodic verification that they remain identical.",
        revisitWhen: "Never.",
      },
      {
        title: "globalThis singleton for portal metrics",
        decision:
          "The portal's prom-client Registry is cached on globalThis.__portalMetrics rather than imported as a module-level singleton.",
        rationale:
          "Next.js App Router bundles each route handler into a separate webpack chunk. Without globalThis caching, each route handler would create its own Registry instance, and metric increments from different routes wouldn't aggregate. The globalThis pattern is the documented Next.js workaround.",
        cost:
          "The lib/metrics.ts file has a small amount of typing weirdness (window types extended with __portalMetrics). Slightly less ergonomic than a simple module-level singleton.",
        revisitWhen: "If Next.js changes its bundling model. Until then, this is required.",
      },
      {
        title: "force-dynamic on metrics route",
        decision: "app/api/metrics/route.ts exports const dynamic = 'force-dynamic'.",
        rationale:
          "Next.js 14 prerenders parameter-less GET handlers at build time by default. Without force-dynamic, /api/metrics would serve a frozen build-time snapshot of zero counters forever. The directive makes the route re-evaluate on every request.",
        cost: "The route is not prerendered. For a metrics endpoint, this is the correct behavior.",
        revisitWhen: "Never.",
      },
    ],
  },
];
