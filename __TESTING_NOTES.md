# Portal Testing Notes

Reference for how this repository's test suite is structured and what "a
good test" means here. Written for engineers extending the suite.

This repository is the last stage in the data pipeline: the simulation
engine produces daily CSVs, the ETL transforms them into canonical
parquets, the API reads those parquets and serves them over HTTP, and
this portal consumes the API's responses and renders them. The
conventions below are inherited from the sim engine's, ETL's, and API's
`__TESTING_NOTES.md` and extended for the portal's position at the end
of the chain.

## Established patterns

The suite uses Vitest with the jsdom environment, `@testing-library/react`
for component tests, and `@testing-library/jest-dom` matchers. Component
interaction is driven with `fireEvent` — `@testing-library/user-event` is
not a dependency. API responses are exercised through the bundled JSON
fixtures under `fixtures/`; `msw` is available for tests that need to
exercise the fetch path itself. No custom framework, no shared assertion
helpers beyond what Vitest and Testing Library provide.

Tests are graded into three categories, the shared platform vocabulary:

- **Business-correctness** — asserts specific values that are computable
  from the inputs independently of the implementation. For a data shaper
  that means asserting the derived value — a total, a sorted order, a
  formatted string — computed by hand or read off the canonical dataset.
  For a React component it means asserting rendered values: the headings
  the grid renders in sort order, the `href` a card links to, the text a
  KPI card shows for a given delta — not merely that the component
  mounted.
- **Structural** — asserts shape (a property is present, a value has the
  right type, an array came back) but not specific values. Useful as an
  entry-level floor; not sufficient on its own for hot-path code.
- **Ceremony** — runs code but verifies nothing beyond "it did not raise".

Business-correctness is the bar for hot-path code. Two techniques recur:

- **Independently-derived expectations.** Compute the expected value from
  the input. `shapeStoreData`'s totals tests reduce the sample rows by
  hand and assert the shaper lands on the same sum, rather than
  snapshotting whatever it returned. `computeDashboardPeriods` is checked
  against hand-derived calendar-month boundaries.
- **Invariant cross-checks.** Re-derive a value at a different grain and
  compare. The contract suite sums per-store sales and asserts the total
  equals the dashboard's full-window total; it sums department `net_sales`
  and reconciles against store `total_sales`.

## Hot-path tests

The load-bearing logic and the tests that hold it.

**Data layer** (the shapers — pure transforms separated from the
server-side fetchers for unit testing):

- **Dashboard** — `dashboard-data.test.ts`. `shapeDashboardData` totals,
  the daily trend and its prior-year overlay, the top-stores ranking, the
  severity breakdown, the recent/PoP/YoY KPI deltas, and the trade-area
  comparison. `dashboard-periods.test.ts` covers the calendar-month
  period derivation and `computeDelta`.
- **Stores** — `store-data.test.ts` (per-store drilldown: totals, the
  month-day-aligned year-over-year trend, department mix, synthesized
  anomaly descriptions) and `stores-index-data.test.ts` (per-store
  aggregation for the index).
- **Departments** — `department-data.test.ts` (per-department drilldown
  including PoP/YoY deltas) and `departments-index-data.test.ts`.
- **Exceptions** — `exceptions-data.test.ts`. `shapeExceptionsData`
  severity sort, the rule-family description synthesis, and `applyFilters`
  predicate composition with AND semantics.

**Component layer** (interactive surfaces):

- **Sort controls** — `StoresIndexClient.test.tsx` and
  `DepartmentsIndexClient.test.tsx`. The pure `sortStores` /
  `sortDepartments` functions are swept across every field and direction;
  the client components are checked for default sort, re-sort on a new
  field, direction toggle on the active field, and the per-field default
  direction. Cards are asserted to link to the right detail routes.
- **Mode indicator** — `ModeIndicator.test.tsx`. The rendered label
  tracks `API_MODE`.

**Route layer:**

- **The store-metrics route handler** — `api/store-metrics.test.ts`.
  Offline mode serves the bundled fixture verbatim; online mode forwards
  the upstream body; an upstream failure falls back to the fixture and
  marks the response `X-Data-Source: fallback`.

## Upstream contract tests

`tests/contract/api-portal-contract.test.ts` pins the contract between
the API's HTTP responses and the portal's derived values. It is the last
link in a chain the upstream repositories build: the ETL's
`test_sim_engine_contract.py` pins sim engine → ETL, the API's
`test_etl_contract.py` pins ETL → API, and this file pins API → portal.

The fixtures are the bundled JSON files under `fixtures/` — captured API
responses, byte-identical with what the API serves in online mode. The
canonical dataset is two H2 slices a year apart (2024 and 2025): 8 stores
across 368 days, 2944 store-day rows, 29,414 department rows, and 883
anomaly flags (831 from the band rules over store-day metrics, 52 from
the `department_coverage` structural-integrity rule over department-grain
metrics). Because the API serves byte-identical output for a given
upstream dataset, a committed fixture is a stable contract input.

The six tests assert:

- **dashboard surface** — `shapeDashboardData` over the bundled fixtures
  yields the canonical full-window totals, the 883/807/76/0 exception
  counts (total / info / warning / critical), the top-stores ranking, and
  the two-slice period shape (the PoP delta is null because the dataset
  has no first-half-2025 data).
- **stores surface** — `shapeStoresIndexData` yields one entry per store,
  per-store exception counts that sum back to 883, and per-store sales
  that sum to the dashboard's full-window total.
- **departments surface** — `shapeDepartmentsIndexData` yields the
  ten-department taxonomy with the canonical per-department aggregates.
- **exceptions surface** — `shapeExceptionsData` yields 883 rows, the
  four canonical rule families (`revenue_band`, `transactions_band`,
  `yoy_comp`, and `department_coverage`), the severity sort, and filter
  counts that match the dashboard's severity breakdown.
- **cross-grain reconciliation** — department `net_sales` aggregates back
  to store `total_sales` (see "Known weak areas" for the tolerance).
- **cross-endpoint reconciliation** — the portal's own recent-window
  aggregation of `/store-metrics` lands on the same totals the
  pre-aggregated `/dashboard-summary` endpoint reports.

A value asserted in the ETL's contract test, the API's contract test, and
this file all trace to the same upstream artifact — that continuity is
what makes the chain meaningful. A failure here after regenerating a
fixture means the API's output changed in a way the portal must account
for.

## The vitest race

`tests/api/store-metrics.test.ts` carried a known race: the CI gate ran
`pnpm vitest run --no-file-parallelism` to serialize test-file execution
and keep it from failing intermittently.

Root cause: the test imported the route handler dynamically, with
`await import("@/app/api/store-metrics/route")`, inside each test body.
That import pulls the route's transitive fixture graph, including the
multi-megabyte `department-metrics.json`. Under parallel test-file
execution the import is CPU-starved and could exceed Vitest's 5-second
test timeout. A timed-out test is abandoned but its continuation is not
cancelled: when the slow import finally resolved, the continuation still
ran `GET()`, which reads `process.env` and `globalThis.fetch` — globals a
sibling test had already reassigned in its own `beforeEach`. The result
was cross-test contamination that surfaced as intermittent assertion
failures and timeouts.

Fix: the route handler reads `API_MODE` and `API_BASE_URL` only at
request time, inside `GET`, so it never needs a per-test re-import. It is
now imported statically at the top of the test file. The fixture-graph
cost moves to collection time, outside any test timeout; the slowest test
dropped from ~2.4s to ~0.1s and no test times out, so no continuation is
left running to leak across tests. Environment and fetch are now mutated
through `vi.stubEnv` / `vi.stubGlobal` and reverted in `afterEach`,
rather than reassigning `process.env` and `globalThis.fetch` wholesale,
so each test is self-contained.

Verification: the suite was run repeatedly under full file parallelism
with no failures, and the `--no-file-parallelism` flag was removed from
the CI workflow. A test that needs a fresh module per case should still
use a dynamic import; a test whose module reads its inputs at call time
should import statically and keep slow work out of the timed test body.

## Test categories observed

The suite held 147 tests at the start of this pass. Classification:

| Category             | At start | After pass |
|----------------------|----------|------------|
| Business-correctness | 138      | 150        |
| Structural           | 9        | 3          |
| Ceremony             | 0        | 0          |
| Uncategorizable      | 0        | 0          |
| Total                | 147      | 153        |

The suite was already overwhelmingly business-correctness: the shaper and
component tests assert derived and rendered values throughout. This pass
converted six structural tests covering hot paths into business-correctness
tests — the four fixture-loader tests (which now pin the canonical dataset
values rather than checking response shape) and the two store-metrics
route tests (which now assert the served body equals the fixture) — and
added six contract tests, bringing the suite to 153.

## Known weak areas

Tests left as structural, with the reason each was not strengthened:

- `logger.test.ts` — the test that checks the logger exposes `info` /
  `warn` / `error` / `debug` methods is structural. Logging configuration
  is not a data hot path; the other two tests in the file assert real
  behavior (a bound `request_id` appears in output, the level resolves
  from `LOG_LEVEL`).
- `metrics.test.ts` — the registry-export and Prometheus-text-shape tests
  are structural. Metrics registration is observability, not a data hot
  path. The third test asserts a real incremented value. Left in place,
  matching the sim engine, ETL, and API passes' decision on their
  analogous observability tests.

One data observation surfaced while building the cross-grain contract
test and is upstream-resident, not a portal defect: the
`department-metrics.json` does not reconcile exactly against
`store-metrics.json`. Of the 2944 store-days, 2872 reconcile to the
cent; the remaining 52 carry irregular department-row coverage — 39
with 9 department rows, 13 with 11 rows including a duplicated
`department_id`. Aggregate gap is 0.04% of total sales.

Verified by reading the ETL canonical directly: `department_daily_metrics.parquet`
at `economic-data-etl/data/processed/canonical/` contains the same 52
irregular store-days at the same counts (39 with 9 rows, 13 with 11
rows; total 29,414 vs. the 29,440 a strict 8 × 10 × 368 baseline would
expect). The pattern is upstream sim engine anomaly injection (the
`missing_department` anomaly type per the platform's anomaly-injection
design), structurally present in the canonical pipeline through all
four repos.

The detection layer now mixes two rule kinds writing to the same
`anomaly_flags` schema. The band rules — `revenue_band`,
`transactions_band`, and `yoy_comp` — flag statistical outliers in
sales and transaction volume against per-profile bands over the
store-day grain (831 flags). The `department_coverage` rule operates
on the department grain and flags the same 52 irregular store-days
the cross-grain reconciliation observes, contributing the remaining
52 flags to bring the canonical total to 883.

The cross-grain contract test in this repo asserts the aggregate gap
stays under 0.1% and that per-store-day reconciliation holds for over
95% of store-days. That tolerance is correctly calibrated for the
known upstream data behavior, and the test still catches genuine
portal aggregation bugs (anything beyond the documented irregularity).
The structural-integrity rule means a portal-side consumer of
`/anomalies` can now triage the missing-department injections through
the same exception surface as the band-rule outliers, without the
portal having to compute the gap itself.

## The contract test chain

This file completes the contract-test chain across the platform's four
repositories. Each layer pins its upstream boundary with a contract test
whose fixture is a byte-identical capture of the layer above:

- the ETL pins sim engine → ETL (`test_sim_engine_contract.py`),
- the API pins ETL → API (`test_etl_contract.py`),
- the portal pins API → portal (`tests/contract/api-portal-contract.test.ts`).

The same canonical dataset runs end to end: the sim engine produces
byte-identical CSV output for a given `(seed, date)`, the ETL produces
byte-identical parquets from it, and the API serves byte-identical JSON
from those. A value asserted at one layer's contract test can be traced
to the same value at the next. A stale-fixture failure anywhere in the
chain is the signal that the dataset changed and the layer below must
account for it.
