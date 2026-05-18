/**
 * Lessons from building the platform — bugs, gotchas, and surprises,
 * each shaped as what happened, how it was handled, and what it taught.
 *
 * Ordered by impact rather than chronology. Entries with longer "what
 * happened" sections use multiple paragraphs; the renderer joins them
 * with spacing.
 */

export interface LessonEntry {
  title: string;
  whatHappened: string[];
  howIHandledIt: string[];
  whatItTaught: string[];
}

export const LESSONS: LessonEntry[] = [
  {
    title: "The Vercel deploy bug that became an architectural improvement",
    whatHappened: [
      "The deployed Vercel preview URL showed \"Application error: a server-side exception has occurred\" with an opaque digest hash. Local `pnpm dev` worked correctly; tests passed; the build succeeded. The production deploy was broken.",
      "Three server data-fetcher modules in `lib/dashboard-data.ts`, `lib/exceptions-data-server.ts`, and `lib/store-data.ts` each had a `getBaseUrl()` helper that called `headers()` from `next/headers` to build a base URL, then self-fetched the portal's own `/api/*` routes for data that already lived as bundled JSON fixtures in the repo. On Vercel's partial-prerender path, `headers()` returns null. The subsequent `.get(\"host\")` call throws. Local dev streams dynamically and never hits this path, so the bug only surfaced in production.",
    ],
    howIHandledIt: [
      "First, I added an `app/global-error.tsx` boundary that logs the actual error to the console with a `useEffect`-deferred `console.error`. Without this, Vercel's logs showed only the opaque digest. The boundary turned \"mystery error\" into \"TypeError: Cannot read properties of null (reading 'get')\" — fast pivot from \"what's broken\" to \"I know exactly what's broken.\"",
      "Then I had a choice: patch the immediate issue with try/catch around `headers()`, or restructure the fetcher modules so the bug couldn't exist. I picked the second. Each fetcher branches on `getApiMode()`. The offline branch directly imports JSON fixtures via dynamic `import()`, skipping `headers()` entirely. The online branch preserves the original fetch logic. The transform logic is unchanged across both branches.",
      "The side effect: the homepage and `/exceptions` page changed from `ƒ (Dynamic)` to `○ (Static)` in the production build output. Without `headers()` in the data path, Next.js can statically prerender these pages at build time. They now serve from the CDN edge instead of invoking server functions per request.",
    ],
    whatItTaught: [
      "Two things, separately important.",
      "First, Vercel's partial-prerender semantics aren't the same as local dev server semantics. The same code that worked locally was broken in production because the framework's runtime made different assumptions in each environment. Local dev is a less-strict test of production behavior than I'd assumed. The error boundary became permanent: it's the diagnostic that turned a deploy-time mystery into an actionable error, and it stays in place exactly because it's load-bearing only when something else has broken.",
      "Second, the bug was the gift. The original fetcher pattern had no network boundary in offline mode — it was real HTTP work that produced the same result as a direct file read. The refactor removed the round-trip, turned the pages static, and made the offline/online split architecturally explicit instead of an implementation detail. A patch fix would have worked; the architectural fix made the code clearer.",
      "The pattern: when you find yourself reaching for try/catch around framework behavior, consider whether the design that requires the framework behavior is the actual problem.",
    ],
  },
  {
    title: "The cross-platform seeding test that wasn't actually a seeding bug",
    whatHappened: [
      "The sim engine test `test_stage2_rederivation_noise_respects_global_seed` passed reliably on Windows / Python 3.12 (my local dev environment) but failed in CI on Linux / Python 3.11 with: \"Stage 2 transactions identical across seeds 42 and 99 — global_seed is not threaded.\"",
      "The assertion was correct — the test runs `realism.adjust()` twice with different `global_seed` values and asserts that the resulting transactions arrays differ. On CI, the arrays were byte-identical for both seeds. From CI's perspective, the seed wasn't doing anything.",
      "This was not a seed-threading bug. Not an RNG bug. Not a NumPy version issue.",
      "The realism layer caches its resolved data source in module-level globals (`_SOURCE`, `_FIXTURE_FRAME`). Several legitimate tests in `test_realism_fixture_fallback.py` set `_SOURCE = \"none\"` via a monkeypatched fixture path. `monkeypatch` restores the path attribute on teardown — but doesn't clear the realism cache, because there's no automatic hook into the realism layer from pytest's fixture lifecycle.",
      "The seeding test then inherited `_SOURCE = \"none\"` from the polluted module-level state. When `adjust()` ran, it hit the early-return path that returns the input DataFrames unchanged. Both `adjust(global_seed=42)` and `adjust(global_seed=99)` returned the same data. The transactions arrays were byte-identical, and the test correctly reported that the seed didn't affect the output — but the seed never had a chance to.",
      "Why CI failed but Windows didn't: `test_realism_query_target.py`'s `realism_db` fixture has a teardown that calls `clear_cache()`. That file is gated by `pytest.importorskip(\"sqlalchemy\")` at module level, and sqlalchemy is in the `[realism]` extra, not `[dev]`. CI installs only `[dev]`. So the file is skipped in CI, its incidental cleanup never runs, and the leaked cache persists into the seeding test. On Windows I have sqlalchemy installed for development, so the cleanup ran and masked the leak.",
    ],
    howIHandledIt: [
      "A 12-line autouse fixture in `test_realism_seeding.py` that calls `realism.clear_cache()` before and after each test. That was the entire fix. No source-code changes. No realism-layer refactoring. No version pins.",
    ],
    whatItTaught: [
      "Cross-platform test failures are sometimes about platform differences in the test environment, not the platform itself. The platform-specific difference here wasn't NumPy's behavior — it was which Python packages got installed, which determined which test file got skipped, which determined whether an incidental teardown ran.",
      "The deeper lesson: module-level mutable state creates implicit cleanup contracts. The realism layer's caching architecture assumes tests will clean up the cache after themselves. The two test files that mutated `_SOURCE` did clean up on Windows because a third file's teardown incidentally did the work. On CI, the third file was skipped and the contract broke. The seeding test had no idea it depended on the third file's teardown.",
      "I filed the architectural concern (module-level mutable cache) as a separate known issue rather than fixing it here. The local fix is small, contained, and correct. The general fix — restructuring the realism layer to avoid module-level state, or adding a session-wide autouse fixture that clears the cache after every test — is bigger work that belongs to a later test-quality pass.",
      "The pattern: when the test environment differs and the failure mode points at something specific, look at what's different about the environment, not just at the code under test. Sometimes the bug is in what didn't happen, not in what did.",
    ],
  },
  {
    title: "The next/headers error that revealed the server/client boundary",
    whatHappened: [
      "The first version of `lib/exceptions-data.ts` imported `headers` from `next/headers` for request-correlation forwarding. Server components could import it fine. The first time I tried to use `applyFilters` (the pure filter function from the same file) in a client component, the Next.js build failed: \"You're importing a component that needs `next/headers`. That only works in a Server Component.\"",
    ],
    howIHandledIt: [
      "Split the module. `lib/exceptions-data.ts` became pure — types, filter logic, shape function, no server-only imports. `lib/exceptions-data-server.ts` is server-only — fetchers that use `headers()`. Client components import from the first; server components can import from either.",
    ],
    whatItTaught: [
      "Next.js App Router's server/client boundary isn't a runtime check. It's a compile-time partition. The framework needs to know at bundle time whether a file might end up in a client bundle. Once I understood that, the split made sense. Before I understood it, the error message looked like a runtime mystery.",
      "This was the longest-running confusion in the portal build. The fix is small — split one file into two. Understanding why the fix is necessary took longer than implementing it.",
    ],
  },
  {
    title: "The Prometheus metrics that vanished between routes",
    whatHappened: [
      "Implemented Prometheus metrics on the portal using `prom-client`'s default global registry. The metrics worked when tested against a single route. After deploying and hitting several routes, the counter for each route showed as 1 — not the cumulative total.",
      "Why it happened: Next.js 14 bundles each route into a separate webpack chunk. The `prom-client` module gets re-instantiated per chunk, so each route has its own registry. Increments in one route don't show up when another route serves `/api/metrics`.",
    ],
    howIHandledIt: [
      "A custom `Registry` cached on `globalThis.__portalMetrics`. The first time any route imports the metrics module, it checks `globalThis` for an existing registry; if not, creates one and stores it there. Subsequent imports reuse the same registry. All routes share state via the Node.js `globalThis` singleton.",
    ],
    whatItTaught: [
      "Webpack bundling boundaries are invisible in source code but very visible at runtime. Anything that depends on module-level state being shared across routes needs explicit cross-bundle coordination — `globalThis` is the standard escape hatch.",
      "This pattern is now documented in `lib/metrics.ts` with a comment explaining why `globalThis` exists in the file. Without the comment, the next person reading the code (including future me) would have to discover the same problem from scratch.",
    ],
  },
  {
    title: "The structlog/stdlib bridge that nearly didn't work",
    whatHappened: [
      "The ETL macro pipeline was written with stdlib `logging` calls like `logging.info(\"msg\", extra={\"series_id\": sid, \"rows\": n})`. When I tried to make it emit structured JSON like the other pipelines, the `extra=` dict silently disappeared from output. The fields were never serialized.",
      "Why it happened: structlog and stdlib logging produce different log record shapes. Without an adapter, structlog's processors see a stdlib `LogRecord` and don't know to look at `record.__dict__` for the extra fields.",
    ],
    howIHandledIt: [
      "Added `structlog.stdlib.ExtraAdder()` to the `shared_processors` list in `observability.py`. ExtraAdder is exactly this adapter — it pulls non-standard attributes off stdlib `LogRecords` and merges them into structlog's event dict. After adding it, all the `extra={...}` fields started showing up in JSON output.",
    ],
    whatItTaught: [
      "The right name for this pattern is \"bridge.\" structlog and stdlib are two log libraries that don't naturally talk to each other; ExtraAdder is the explicit bridge between them. Until I understood that, the bug looked like \"structlog isn't working.\" After I understood it, the fix was three lines.",
      "I deliberately kept the macro pipeline using stdlib `logging.info()` calls rather than rewriting it in structlog idiom. The bridge works; the macro code reads more naturally as standard Python; the structured output is identical. Rewriting for purity would have been engineering theater.",
    ],
  },
  {
    title: "The recharts v3 release that broke everything for an afternoon",
    whatHappened: [
      "I was installing fresh dependencies in the portal and recharts updated from v2.x to v3.0. The TopStoresChart and SalesTrendChart immediately stopped rendering — recharts v3 dropped support for the `<XAxis dataKey={...} />` pattern in favor of explicit value accessors. Build was green. Tests passed. Runtime showed blank rectangles where charts should be.",
    ],
    howIHandledIt: [
      "Visual inspection caught it. The dashboard loaded with empty boxes where the top-stores and sales-trend charts should have been. The tests didn't catch it because charts aren't unit-tested (asserting against recharts internals is too fragile across versions).",
      "I pinned recharts to `^2.13.0` in `package.json`. The pinned version works. v3 might be migrated to later, but the cost-benefit didn't justify the disruption mid-build.",
    ],
    whatItTaught: [
      "Charts are the part of a React app most likely to silently break on dependency updates because their failure mode is \"renders nothing\" rather than \"throws an error.\" Caret-range version pins on chart libraries are riskier than caret-range on most other deps.",
      "The decision to not unit-test the charts is now load-bearing in a way I didn't fully appreciate at the time — visual review is the only safety net. A visual regression test (Percy, Chromatic) or even Playwright screenshot diffs would have caught this at PR time instead of at \"wait, why is the chart empty\" time. I haven't added one because the visual surface is small (three charts, two pages), but as the surface grows, the case for visual testing grows with it.",
    ],
  },
  {
    title: "The off-by-one in the canonical backfill default",
    whatHappened: [
      "The sim engine's `backfill` command defaults to \"184 days ending 2025-12-31.\" Earlier README versions claimed this resolved to \"2025-07-02 through 2025-12-31.\" When the canonical fixtures regenerated, the actual start was 2025-07-01.",
    ],
    howIHandledIt: [
      "Caught while documenting the regeneration workflow. Working backward from `end_date=2025-12-31` with 184 days: 31 + 31 + 30 + 31 + 30 + 31 = 184, inclusive. Start is 2025-07-01. The previous README was wrong by one day.",
      "Updated the README to the correct date. No code change needed — the code was always correct; only the documentation was wrong.",
    ],
    whatItTaught: [
      "Off-by-one bugs in documentation are worse than off-by-one bugs in code because nothing tests documentation. Every claim in a README that involves a calculation should be verifiable by working out the math. I now treat \"2025-07-01 through 2025-12-31 (184 days)\" as a claim that requires the math to support it, not a fact to repeat from previous versions.",
    ],
  },
  {
    title: "The streaming bug where 404 returned 200",
    whatHappened: [
      "The `/stores/[id]` page calls `notFound()` from `next/navigation` for invalid IDs (anything outside 1-8) or fetch failures. The behavior is supposed to be: render the closest `not-found.tsx` UI and serve a 404 HTTP status.",
      "What actually happened in Next.js 14 RSC streaming: the not-found UI rendered correctly, but the HTTP response status was 200. The client got the right page; the response code was wrong.",
      "Why it happened: known Next.js 14 RSC streaming behavior. When `notFound()` is called after streaming has already started (which it has, in any server component that does anything before the validation), the response headers are already sent. Next.js can't retroactively change the status code.",
    ],
    howIHandledIt: [
      "Accepted as a known limitation. The UI behavior is correct; the status code mismatch is documented. It could be fixed by doing the ID validation in middleware before any server-component code runs, but that adds complexity for a minor cosmetic issue.",
    ],
    whatItTaught: [
      "Sometimes the right answer is \"this is a known issue with the framework, the user-visible behavior is correct, and the fix would cost more than the bug is worth.\" Wrote it down rather than fix it. The next person who finds this behavior will see the documentation and know that I considered it and decided to leave it.",
    ],
  },
];
