/**
 * Architectural decisions made during the platform build. Each entry
 * follows a consistent shape so the index page renders uniformly.
 *
 * Decisions are grouped into categories for navigability. The page
 * itself renders them grouped by category, with each entry's full
 * detail visible (no expand/collapse — the dataset is small enough
 * to scroll).
 */

export interface DecisionEntry {
  title: string;
  decision: string;
  rationale: string;
  cost: string;
  revisitWhen: string;
}

export interface DecisionCategory {
  name: string;
  description: string;
  entries: DecisionEntry[];
}

export const DECISIONS: DecisionCategory[] = [
  {
    name: "Data integrity",
    description:
      "Decisions that govern how data flows through the platform without losing identity or coherence.",
    entries: [
      {
        title: "Byte-identical fixtures across repos",
        decision:
          "The same parquet files exist byte-identically in the ETL repo's canonical directory, the API repo's fixtures directory, and as the source for the portal's captured JSON.",
        rationale:
          "A clone-and-run demo against any single repo should produce the same data as a coordinated multi-repo run. Each repo owns its own copy because each repo is independently cloneable. Verification is mechanical: cmp at each boundary.",
        cost:
          "Three copies of every canonical artifact in git. At ~500KB total for the canonical, this is negligible. Refresh requires a small follow-up PR in each downstream repo when canonical regenerates.",
        revisitWhen:
          "If the canonical grows past ~50MB or if the platform adds a fifth repo that needs the data.",
      },
      {
        title: "Anomaly_log boundary",
        decision:
          "The sim engine's anomaly_log.csv is internal QA ground truth. Only one file in the entire platform may read it: scripts/evaluate_detection.py in the ETL repo.",
        rationale:
          "The platform's detection rules are evaluated against the sim engine's ground truth. If platform code (anywhere) read the ground truth at runtime, it would be cheating — the detection wouldn't be detecting, it would be looking up the answer. Treating anomaly_log as forbidden everywhere except in the explicit evaluation script preserves the rigor of the detection-quality measurement.",
        cost:
          "An extra discipline rule that must be enforced by code review. No automated guard.",
        revisitWhen:
          "Never. This is an integrity invariant.",
      },
      {
        title: "Per-date deterministic seeding",
        decision:
          "The sim engine seeds each generated day with global_seed + date.toordinal() rather than advancing a single RNG across dates.",
        rationale:
          "Same date and same seed produces byte-identical output regardless of generation order. Backfilling 2024-07-01 produces the same data whether it was generated as part of a 2024 backfill, a 2025 anchor's t-365 paired generation, or a single-day regeneration.",
        cost:
          "Slightly more expensive than a single-RNG approach (one RNG per day vs one per run). Cost is negligible at the scale the sim engine operates.",
        revisitWhen:
          "If the sim engine ever needs to model cross-day dependencies that legitimately require shared RNG state.",
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
    name: "Architecture",
    description: "Decisions about the structural shape of the platform.",
    entries: [
      {
        title: "Two-mode demo as first-class",
        decision:
          "Both the API and the portal support offline mode (bundled fixtures) and online mode (live data) as production-ready paths.",
        rationale:
          "Anyone cloning a repo can boot the full demo without infrastructure. A production deployment can use the same code paths against live data. Neither mode is degraded; both serve the same dashboards with the same shape.",
        cost:
          "Two code paths to maintain in route handlers and config. Mode selection logic in two places (API config, portal route handlers).",
        revisitWhen:
          "If maintenance burden of dual modes exceeds the demo-portability benefit. So far it doesn't.",
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
        decision:
          "Anomaly detection uses static-band rules with documented thresholds, not machine-learning models.",
        rationale:
          "The rules are interpretable, debuggable, and meet the recall and false-positive contracts established during phase 2. ML adds opacity (what does this model think is anomalous?) without proportional value at this data scale and use case. Operations users want explanations, not predictions.",
        cost:
          "The rules require manual threshold tuning. False-positive rate is bounded but not minimized.",
        revisitWhen:
          "Threshold tuning becomes infeasible (more than ~20 rules, many ambiguous edge cases) or false-positive rate exceeds tolerance.",
      },
      {
        title: "Paired-year canonical",
        decision:
          "The canonical fixtures contain both 2024 and 2025 data, not just the demo window.",
        rationale:
          "Year-over-year comparison is a natural analytical question for stakeholder dashboards. The sim engine produces paired-year data natively (each run-command anchor generates the same calendar date one year prior). Including both years in the canonical enables the YoY chart on the store drilldown without any new data sources or fetch patterns.",
        cost:
          "Canonical size doubles. Goes from ~250KB to ~500KB total. The yoy_comp anomaly rule fires for 2025 dates because there's now a 2024 baseline (extra 184 info-severity flags).",
        revisitWhen:
          "If a third year is needed, or if the canonical grows past ~50MB.",
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
        revisitWhen: "Never. This is ergonomically the right decision for identifier fields.",
      },
      {
        title: "Department names embedded portal-side",
        decision:
          "The 10 department names are hardcoded as a TypeScript constant in the portal (lib/dim-departments.ts), not exposed through an API endpoint.",
        rationale:
          "Departments are stable reference data. The names won't change in this build. Adding an API endpoint just to look up 10 strings is over-engineering. If a future phase needs server-side department names, the endpoint can be added following the /dim-stores pattern.",
        cost:
          "If the sim engine ever changes department names, the portal needs a code change. (The list is short enough that the change is a one-line edit.)",
        revisitWhen: "If departments become dynamic, or if a non-portal consumer needs them.",
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
        decision:
          "The /exceptions page's filter state lives in URL query params, accessed via useSearchParams. Filter updates dispatch via router.push.",
        rationale:
          "Shareable URLs (paste a /exceptions?severity=warning link to a colleague). Browser back/forward navigation restores prior filter state. Refresh preserves filters. These are small UX details that signal serious frontend work.",
        cost:
          "More code than useState would require. The hook (use-exceptions-filters.ts) is ~70 lines vs ~20 for local state. The page must be wrapped in <Suspense> because useSearchParams is a Next.js 14 client-only API.",
        revisitWhen:
          "If filter state grows complex enough that URL serialization becomes hard to maintain.",
      },
      {
        title: "Client-side filtering after one fetch",
        decision:
          "The /exceptions page fetches all 831 anomalies on page load (paginated through the API's 200-row cap), then filters client-side as the user adjusts filters.",
        rationale:
          "831 rows is small enough that client-side filtering is imperceptibly fast. Filter changes don't trigger network round-trips. The data is small enough to keep in memory.",
        cost:
          "If the canonical anomaly count grows past ~10,000, client-side filtering becomes a performance issue. Pagination on filter change would be needed.",
        revisitWhen:
          "If anomaly volume grows past ~10,000 or if filter latency becomes user-visible.",
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
        decision:
          "Pages (app/page.tsx, app/stores/[id]/page.tsx, etc.) are server components that fetch data. Charts (TopStoresChart, YearOverYearChart, etc.) are client components that render the data.",
        rationale:
          "Data fetching belongs on the server (no client waterfall, no auth-token-in-browser issues, fewer JS bytes). Recharts and other interactive components must be client components because they use browser APIs. The boundary is clean: server fetches and shapes, client renders.",
        cost:
          "Every chart file starts with 'use client'. Components that do nothing interactive (KPI cards) can stay server-side.",
        revisitWhen: "Never. This is the standard Next.js App Router pattern.",
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
          "Stakeholder dashboards in this scale of company are typically deployed behind a corporate VPN or reverse proxy that handles auth. Building auth into the application layer would multiply complexity without serving a need.",
        cost:
          "The portal is not multi-tenant-safe. Deployment must include an auth boundary at the infrastructure layer.",
        revisitWhen: "If the portal needs to serve external users or per-user customization.",
      },
      {
        title: "No write paths",
        decision:
          "All API endpoints are GET. Users cannot submit data through the portal.",
        rationale:
          "The platform renders analytics derived from the data pipeline; it doesn't accept user input that affects business state. Comments, annotations, or saved views could be added but would require auth (see above) and a separate write path.",
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
          "The macro pipeline is Airflow-DAG-ready but no scheduler is configured. Pipeline runs are manual.",
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
          "API responses at this data scale are typically sub-100ms. Adding cache infrastructure would optimize a non-bottleneck. For specific endpoints that aggregate large data (dashboard-summary scans 1,472 rows), cache could help — but the wins are marginal until concurrent load increases.",
        cost: "Some endpoints recompute on every request. At low concurrency, no observable issue.",
        revisitWhen:
          "If the API serves enough concurrent traffic that recomputation cost matters, or if response latency becomes user-visible.",
      },
    ],
  },
];
