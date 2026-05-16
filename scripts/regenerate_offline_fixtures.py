"""
Regenerate offline-mode JSON fixtures from the upstream API's source tree.

Run when the API's bundled parquet fixtures have changed and the portal's
offline fixtures need to reflect the new responses without going through a
running server.

Usage (from the portal repo root):

    API_REPO=/path/to/economic-data-api \
        /path/to/api/venv/python scripts/regenerate_offline_fixtures.py

On Windows PowerShell:

    $env:API_REPO = "C:\\path\\to\\economic-data-api"
    C:\\path\\to\\api\\venv\\Scripts\\python.exe scripts\\regenerate_offline_fixtures.py

If API_REPO is not set, the script defaults to
C:\\Users\\Casey\\Desktop\\A\\economic-data-api\\economic-data-api,
which is the local checkout path on the maintainer's machine.

The script imports the API's FastAPI app via sys.path, wraps it in
FastAPI's TestClient, and writes one JSON file per endpoint into the
portal's fixtures/ directory. The bundled parquets at
economic-data-api/app/fixtures/ are the source of truth.

Endpoints captured (matches the TypeScript capture-fixtures.ts):

  /health                      single,    skipped DB-degraded JSON
  /store-metrics               paginated, full canonical
  /anomalies                   paginated, full canonical
  /dashboard-summary           single,    fixed 2025 H2 window
  /department-metrics          paginated, fixed 2025 H2 window
  /dim-stores                  array,     8 store rows

DB env vars are forced to a non-routable host so the API never reaches
RDS. The /health endpoint depends on the DB and therefore returns
503/degraded under this configuration, matching the existing health.json.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

API_REPO = os.environ.get(
    "API_REPO",
    r"C:\Users\Casey\Desktop\A\economic-data-api\economic-data-api",
)

# Force the DB to a non-routable host so the API never reaches RDS.
# These must be set BEFORE the API's pydantic settings load.
os.environ["DB_HOST"] = "127.0.0.1"
os.environ["DB_PORT"] = "1"
os.environ["DB_NAME"] = "unused"
os.environ["DB_USER"] = "unused"
os.environ["DB_PASSWORD"] = "unused"

# Point GROCERY_FIXTURES_DIR at the API's bundled parquets explicitly.
os.environ["GROCERY_FIXTURES_DIR"] = str(Path(API_REPO) / "app" / "fixtures")

# Ensure no live-data paths shadow the bundled fixtures.
for var in (
    "STORE_METRICS_PATH",
    "ANOMALY_FLAGS_PATH",
    "DEPARTMENT_METRICS_PATH",
    "DIM_STORES_PATH",
):
    os.environ.pop(var, None)

sys.path.insert(0, API_REPO)

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

PORTAL_ROOT = Path(__file__).resolve().parent.parent
FIXTURES_DIR = PORTAL_ROOT / "fixtures"
PAGE_SIZE = 200


def capture_paginated(client: TestClient, path: str) -> dict:
    """Loop with offset until the full population is gathered, then return
    a single envelope whose items contain every row."""
    offset = 0
    items: list = []
    total = 0
    while True:
        sep = "&" if "?" in path else "?"
        url = f"{path}{sep}limit={PAGE_SIZE}&offset={offset}"
        res = client.get(url)
        res.raise_for_status()
        body = res.json()
        total = body["total"]
        items.extend(body["items"])
        if len(items) >= total or not body["items"]:
            break
        offset += PAGE_SIZE
    return {"total": total, "limit": len(items), "offset": 0, "items": items}


def capture_single(client: TestClient, path: str, allow_503: bool = False):
    res = client.get(path)
    if not res.is_success and not (allow_503 and res.status_code == 503):
        res.raise_for_status()
    return res.json()


def write_json(filename: str, body) -> int:
    out_path = FIXTURES_DIR / filename
    text = json.dumps(body, indent=2) + "\n"
    out_path.write_text(text, encoding="utf-8")
    return out_path.stat().st_size


def main() -> None:
    client = TestClient(app)

    print(f"Capturing into {FIXTURES_DIR}")
    print(f"API source tree: {API_REPO}")
    print(f"API fixtures dir: {os.environ['GROCERY_FIXTURES_DIR']}")
    print()

    health = capture_single(client, "/health", allow_503=True)
    size = write_json("health.json", health)
    print(f"  health.json                  {size:>9,} bytes  status={health.get('status')}")

    store_metrics = capture_paginated(client, "/store-metrics")
    size = write_json("store-metrics.json", store_metrics)
    print(f"  store-metrics.json           {size:>9,} bytes  items={len(store_metrics['items'])}")

    anomalies = capture_paginated(client, "/anomalies")
    size = write_json("anomalies.json", anomalies)
    print(f"  anomalies.json               {size:>9,} bytes  items={len(anomalies['items'])}")

    dashboard = capture_single(
        client,
        "/dashboard-summary?start_date=2025-07-01&end_date=2025-12-31",
    )
    size = write_json("dashboard-summary.json", dashboard)
    print(f"  dashboard-summary.json       {size:>9,} bytes")

    department_metrics = capture_paginated(
        client,
        "/department-metrics?start_date=2025-07-01&end_date=2025-12-31",
    )
    size = write_json("department-metrics.json", department_metrics)
    print(
        f"  department-metrics.json      {size:>9,} bytes  "
        f"items={len(department_metrics['items'])}"
    )

    dim_stores = capture_single(client, "/dim-stores")
    size = write_json("dim-stores.json", dim_stores)
    print(f"  dim-stores.json              {size:>9,} bytes  items={len(dim_stores)}")


if __name__ == "__main__":
    main()
