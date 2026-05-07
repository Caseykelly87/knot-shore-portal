import Link from "next/link";
import { MermaidDiagram } from "@/components/about/MermaidDiagram";

export const metadata = {
  title: "API — Knot Shore Portal",
  description:
    "Architecture overview of the API: dual-mode operation, endpoint contracts, schema discipline, observability.",
};

const REQUEST_LIFECYCLE_DIAGRAM = `
graph LR
  C[Client request] --> M1[RequestLoggingMiddleware<br/>generate or accept X-Request-ID]
  M1 --> M2[Bind contextvars<br/>structlog]
  M2 --> R[FastAPI router]
  R --> SVC[Service layer<br/>app/services/grocery.py]
  SVC --> CFG{resolved_*_path<br/>config property}
  CFG -->|env var set + file exists| LIVE[Live parquet]
  CFG -->|otherwise| FX[Bundled fixture<br/>app/fixtures/]
  LIVE --> P[pandas read]
  FX --> P
  P --> F[filter + paginate]
  F --> SCHEMA[Pydantic v2 serialize]
  SCHEMA --> RESP[JSON response]
  RESP --> METRICS[Metrics counters incremented]
`;

export default function ApiPage() {
  return (
    <article className="mx-auto max-w-4xl px-6 py-8 space-y-10">
      <header className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <Link href="/about" className="hover:text-foreground transition-colors">
            About
          </Link>{" "}
          / API
        </p>
        <h1 className="text-4xl font-bold tracking-tight">API</h1>
        <p className="text-lg text-muted-foreground">
          The HTTP service layer. Exposes canonical grocery data and macro-economic data through
          a small set of FastAPI endpoints. Operates in either fixture or live mode per data
          source.
        </p>
      </header>

      <section className="space-y-4" id="role">
        <h2 className="text-2xl font-semibold tracking-tight">Role in the platform</h2>
        <p>
          The API is the platform&apos;s data delivery layer. The portal is its primary client,
          but it&apos;s independently usable: Swagger UI lives at{" "}
          <code className="bg-muted px-1 rounded">/docs</code>, the OpenAPI spec at{" "}
          <code className="bg-muted px-1 rounded">/openapi.json</code>, and any HTTP client can
          hit the endpoints directly.
        </p>
        <p>
          The grocery side reads from parquet files (memory-mapped, fast). The macro side reads
          from Postgres via SQLAlchemy with connection pooling. The two sides are independent
          but live in the same FastAPI app for shared middleware, observability, and deployment
          surface.
        </p>
      </section>

      <section className="space-y-4" id="dual-mode">
        <h2 className="text-2xl font-semibold tracking-tight">Dual-mode operation</h2>
        <p>
          For grocery data, the API supports two modes per data source:{" "}
          <strong>fixtures</strong> (default, reads bundled parquets at{" "}
          <code className="bg-muted px-1 rounded">app/fixtures/</code>) and <strong>live</strong>{" "}
          (reads parquets at configured paths, e.g., a mounted volume in a container
          deployment). Mode is per-data-source — the four grocery paths (
          <code className="bg-muted px-1 rounded">STORE_METRICS_PATH</code>,{" "}
          <code className="bg-muted px-1 rounded">DEPARTMENT_METRICS_PATH</code>,{" "}
          <code className="bg-muted px-1 rounded">ANOMALY_FLAGS_PATH</code>,{" "}
          <code className="bg-muted px-1 rounded">DIM_STORES_PATH</code>) can be toggled
          independently.
        </p>
        <p>
          The mechanism is a <code className="bg-muted px-1 rounded">resolved_*_path</code>{" "}
          property pattern in <code className="bg-muted px-1 rounded">app/core/config.py</code>:
        </p>
        <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
          <code>{`@property
def resolved_store_metrics_path(self) -> str:
    """Live STORE_METRICS_PATH if it points at a readable file,
    else the bundled fixture."""
    if self.STORE_METRICS_PATH and Path(self.STORE_METRICS_PATH).is_file():
        return self.STORE_METRICS_PATH
    return f"{self.GROCERY_FIXTURES_DIR}/store_daily_metrics.parquet"`}</code>
        </pre>
        <p>
          The <code className="bg-muted px-1 rounded">/health</code> endpoint reports a{" "}
          <code className="bg-muted px-1 rounded">grocery_data_source</code> label of either{" "}
          <code className="bg-muted px-1 rounded">live</code> or{" "}
          <code className="bg-muted px-1 rounded">fixtures</code>. Live is reported only when
          all four grocery paths point at readable files.
        </p>
      </section>

      <section className="space-y-4" id="request-lifecycle">
        <h2 className="text-2xl font-semibold tracking-tight">Request lifecycle</h2>
        <MermaidDiagram source={REQUEST_LIFECYCLE_DIAGRAM} id="api-request-lifecycle" />
        <p>
          Every request passes through{" "}
          <code className="bg-muted px-1 rounded">RequestLoggingMiddleware</code> (a Starlette{" "}
          <code className="bg-muted px-1 rounded">BaseHTTPMiddleware</code> defined in{" "}
          <code className="bg-muted px-1 rounded">app/main.py</code>) that establishes an{" "}
          <code className="bg-muted px-1 rounded">X-Request-ID</code> (generated if absent,
          preserved if provided), binds it to structlog&apos;s contextvars, and ensures every
          subsequent log line carries the correlation ID. The route handler dispatches to a
          service-layer function; the service reads via the{" "}
          <code className="bg-muted px-1 rounded">resolved_*_path</code> property; pandas
          filters and paginates; Pydantic serializes; the response includes the request ID in
          its headers.
        </p>
      </section>

      <section className="space-y-4" id="endpoints">
        <h2 className="text-2xl font-semibold tracking-tight">Endpoints</h2>
        <p>Eight endpoints across grocery and macro data:</p>
        <div className="space-y-3 text-sm">
          <EndpointRow
            method="GET"
            path="/health"
            body="Liveness check. Returns status: ok plus the grocery_data_source label (live/fixtures)."
          />
          <EndpointRow
            method="GET"
            path="/store-metrics"
            body="Per-store-day metrics. Paginated. Filters: date range, store_id."
          />
          <EndpointRow
            method="GET"
            path="/department-metrics"
            body="Per-store-day-department metrics. Paginated. Filters: date range, store_id, department_id."
          />
          <EndpointRow
            method="GET"
            path="/dim-stores"
            body="Reference data for the 8 stores. Flat array (no pagination — small payload)."
          />
          <EndpointRow
            method="GET"
            path="/anomalies"
            body="Anomaly flags from the canonical detection. Paginated. Filters: date range, store_id, severity_level, rule_id."
          />
          <EndpointRow
            method="GET"
            path="/dashboard-summary"
            body="Pre-aggregated daily dashboard payload. Required: start_date and end_date."
          />
          <EndpointRow
            method="GET"
            path="/series"
            body="Macro-economic time series. Reads from Postgres. List, get-by-id, plus /metrics/{kind} and /insights variants."
          />
          <EndpointRow
            method="GET"
            path="/metrics"
            body="Prometheus text format. Custom registry; counters for service calls and grocery_data_source mode."
          />
        </div>
        <p>
          Every paginated endpoint enforces a 200-row maximum on the{" "}
          <code className="bg-muted px-1 rounded">limit</code> query parameter. Larger queries
          paginate; Pydantic validation rejects{" "}
          <code className="bg-muted px-1 rounded">limit &gt; 200</code> with a 422.
        </p>
      </section>

      <section className="space-y-4" id="schemas">
        <h2 className="text-2xl font-semibold tracking-tight">Schema discipline</h2>
        <p>
          Every endpoint declares its response shape via Pydantic v2 models in{" "}
          <code className="bg-muted px-1 rounded">app/schemas/</code>. The schemas are the
          response contract; FastAPI validates outputs against them and the OpenAPI spec is
          generated from them.
        </p>
        <p>Two coercion patterns worth noting:</p>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>
            ZIP and county_fips on <code className="bg-muted px-1 rounded">/dim-stores</code>{" "}
            are declared as <code className="bg-muted px-1 rounded">str</code> in the schema,
            even though the parquet stores them as int64. The service layer coerces via{" "}
            <code className="bg-muted px-1 rounded">f&#123;value:05d&#125;</code> at the
            contract boundary. They&apos;re identifiers, not numbers.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">open_date</code> on{" "}
            <code className="bg-muted px-1 rounded">/dim-stores</code> is declared as a typed{" "}
            <code className="bg-muted px-1 rounded">date</code> and serialized to ISO format by
            FastAPI&apos;s default JSON encoder. The parquet stores it as a string; the service
            coerces via <code className="bg-muted px-1 rounded">date.fromisoformat</code>.
          </li>
        </ul>
      </section>

      <section className="space-y-4" id="observability">
        <h2 className="text-2xl font-semibold tracking-tight">Observability</h2>
        <p>
          Structured JSON logs in production via structlog. The configurator (
          <code className="bg-muted px-1 rounded">app/core/logging_config.py</code>) chains
          processors that add a timestamp, the request-bound correlation ID, the log level, and
          the calling logger&apos;s name. The chain includes{" "}
          <code className="bg-muted px-1 rounded">structlog.stdlib.ExtraAdder()</code> so calls
          like{" "}
          <code className="bg-muted px-1 rounded">
            logging.info(&quot;foo&quot;, extra=&#123;...&#125;)
          </code>{" "}
          propagate the structured fields through the stdlib bridge.
        </p>
        <p>
          Prometheus metrics exposed at <code className="bg-muted px-1 rounded">/metrics</code>{" "}
          on a custom registry (not the global default). Three custom counters:{" "}
          <code className="bg-muted px-1 rounded">service_call_total</code> (per service
          function), <code className="bg-muted px-1 rounded">grocery_data_source_total</code>{" "}
          (per service function, labeled with live or fixtures), and a service-call latency
          histogram. The custom registry isolates the platform&apos;s metrics from any
          third-party library that might write to{" "}
          <code className="bg-muted px-1 rounded">REGISTRY</code> at import time.
        </p>
      </section>

      <section className="space-y-4" id="code-organization">
        <h2 className="text-2xl font-semibold tracking-tight">Code organization</h2>
        <p>
          Source under <code className="bg-muted px-1 rounded">app/</code>. Tests under{" "}
          <code className="bg-muted px-1 rounded">tests/</code>:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>
            <code className="bg-muted px-1 rounded">app/main.py</code> — FastAPI app
            construction; in-file{" "}
            <code className="bg-muted px-1 rounded">RequestLoggingMiddleware</code>; CORS
            middleware registration; router includes; startup logging.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">app/api/routes/</code> — one router per
            endpoint family (anomalies, dashboard, department_metrics, dim_stores, insights,
            metrics, series, store_metrics).
          </li>
          <li>
            <code className="bg-muted px-1 rounded">app/services/grocery.py</code> — grocery
            service functions. Each function reads via{" "}
            <code className="bg-muted px-1 rounded">settings.resolved_*_path</code>, filters
            via pandas, returns Pydantic models.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">app/services/economic.py</code> — macro
            service functions; reads from Postgres via SQLAlchemy.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">app/schemas/grocery.py</code> +{" "}
            <code className="bg-muted px-1 rounded">app/schemas/economic.py</code> — Pydantic v2
            response models.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">app/core/config.py</code> — pydantic-
            settings. The <code className="bg-muted px-1 rounded">resolved_*_path</code>{" "}
            properties handle the fixture-vs-live decision.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">app/core/logging_config.py</code> —
            structlog configurator with ExtraAdder.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">app/core/metrics.py</code> — custom
            Prometheus metrics on a custom registry.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">app/db/session.py</code> — SQLAlchemy
            engine factory.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">app/fixtures/</code> — bundled canonical
            parquets, byte-identical to the ETL canonical.
          </li>
        </ul>
      </section>

      <section className="space-y-4" id="testing">
        <h2 className="text-2xl font-semibold tracking-tight">Testing</h2>
        <p>
          The API has 122 tests. Endpoint tests patch the service layer and assert on response
          shapes; this isolates them from filesystem state and makes them fast. Service-layer
          tests use small synthetic DataFrames to verify filter and pagination logic. Health-
          check tests cover the four-path live-mode contract: the data source label is{" "}
          <code className="bg-muted px-1 rounded">live</code> only when all four grocery paths
          point at readable files.
        </p>
        <p>
          The Pydantic schemas are themselves a form of test: any service function that returns
          data not matching its declared schema fails serialization, surfacing the contract
          violation immediately.
        </p>
      </section>
    </article>
  );
}

interface EndpointRowProps {
  method: string;
  path: string;
  body: string;
}

function EndpointRow({ method, path, body }: EndpointRowProps) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
      <code className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded shrink-0">
        {method}
      </code>
      <div className="space-y-1 min-w-0">
        <code className="text-sm font-mono">{path}</code>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
