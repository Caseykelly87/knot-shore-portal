# Fixture regeneration

The portal ships JSON fixtures in `fixtures/` so offline mode serves real
API responses without a running server. They are snapshots and need
refreshing only when the upstream API's response shape or canonical demo
data changes.

## Source of truth

The canonical data lives in the API repo's bundled parquet files at
`economic-data-api/app/fixtures/*.parquet`. Both regeneration scripts
read from there — directly or through the API — never from a live
database.

## Regenerating

Two scripts produce the same fixtures:

- `regenerate_offline_fixtures.py` imports the API's FastAPI app and
  drives it with `TestClient`, so no server needs to be running. Run it
  with the API's virtualenv Python:

      $env:API_REPO = "C:\path\to\economic-data-api"
      C:\path\to\economic-data-api\venv\Scripts\python.exe scripts\regenerate_offline_fixtures.py

- `capture-fixtures.ts` hits a running API over HTTP:

      pnpm tsx scripts/capture-fixtures.ts

Paginated endpoints (store-metrics, anomalies, department-metrics) are
captured at the full canonical window — no `start_date`/`end_date`
filter. The fixture is a transport format; downstream surfaces aggregate
whatever rows it contains, so a windowed capture silently truncates them.
`dashboard-summary` is the one deliberate exception, pinned to 2025 H2 as
a fixed KPI canary.

## Verifying

After regenerating, confirm a paginated fixture spans the expected
window:

    python -c "import json; d=json.load(open('fixtures/department-metrics.json')); i=d['items']; dts=sorted({r['date'] for r in i}); print(len(i),'items',len(dts),'dates',dts[0],'..',dts[-1])"

The canonical store and department windows are 368 unique dates from
2024-07-01 to 2025-12-31 — department-metrics has 29,414 rows,
store-metrics 2,944. `anomalies` is sparse: 831 rows across 146 dates in
the same span. A short window (for example 184 dates ending 2025-12-31)
indicates a stale, windowed capture.
