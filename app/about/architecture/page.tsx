import { MermaidDiagram } from "@/components/about/MermaidDiagram";
import Link from "next/link";

export const metadata = {
  title: "Architecture — Knot Shore Portal",
  description: "Platform-wide architectural narrative for the Knot Shore Grocery analytics platform.",
};

const PLATFORM_FLOW_DIAGRAM = `
graph LR
  subgraph Sim["Sim engine"]
    SE[knot-shore-grocery-simulation-engine]
    SE_OUT[CSV files<br/>daily/MM/DD/YYYY/]
    SE --> SE_OUT
  end

  subgraph ETL["ETL"]
    ETL_R[economic-data-etl]
    ETL_OUT[Canonical parquets<br/>data/processed/canonical/]
    ETL_R --> ETL_OUT
  end

  subgraph API["API"]
    API_R[economic-data-api]
    API_FX[app/fixtures/<br/>byte-identical to canonical]
    API_R --> API_FX
  end

  subgraph Portal["Portal"]
    PORTAL[knot-shore-portal]
    PORTAL_FX[fixtures/<br/>JSON snapshots]
    PORTAL --> PORTAL_FX
  end

  SE_OUT -.ingest.-> ETL_R
  ETL_OUT -.copy.-> API_FX
  API_R -.serve.-> PORTAL
  API_R -.capture.-> PORTAL_FX
`;

export default function ArchitecturePage() {
  return (
    <article className="mx-auto max-w-4xl px-6 py-8 space-y-10">
      <header className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <Link href="/about" className="hover:text-foreground transition-colors">
            About
          </Link>{" "}
          / Architecture
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Architecture</h1>
        <p className="text-lg text-muted-foreground">
          Platform-wide overview of the Knot Shore Grocery analytics platform — what it does, how
          the pieces fit together, and the design principles that shape the code.
        </p>
      </header>

      <section className="space-y-4" id="overview">
        <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
        <p>
          The platform is an end-to-end retail analytics stack built around a fictional 8-store
          grocery chain. It generates synthetic store and department-level data, ingests that data
          through a pipeline that detects anomalies, exposes the resulting data through a service
          API, and renders stakeholder dashboards in a web portal.
        </p>
        <p>
          The platform is organized as four independently maintained repositories, each with its
          own test suite, CI workflow, and deployable surface. The repos communicate through
          well-defined data contracts: parquet artifacts at the ETL boundary, an HTTP API at the
          service boundary, and JSON fixtures at the portal&apos;s offline boundary.
        </p>
      </section>

      <section className="space-y-4" id="data-flow">
        <h2 className="text-2xl font-semibold tracking-tight">Data flow</h2>
        <p>
          Data flows from the sim engine through the ETL into the API, with the portal consuming
          the API&apos;s endpoints. At each layer, the artifacts produced by one repo are the
          contract consumed by the next.
        </p>
        <MermaidDiagram source={PLATFORM_FLOW_DIAGRAM} id="platform-flow" />
        <p>
          A consequence of this layering: the same parquet files exist byte-identically in three
          places — the ETL repo&apos;s canonical directory, the API repo&apos;s fixtures
          directory, and as captured JSON in the portal repo. Each repo owns its own copy because
          each repo is independently cloneable and runnable. The fixture pipeline preserves
          byte-identity at every boundary; verification is mechanical (
          <code className="bg-muted px-1 rounded">cmp</code>).
        </p>
      </section>

      <section className="space-y-4" id="repos">
        <h2 className="text-2xl font-semibold tracking-tight">Repositories</h2>
        <div className="space-y-6">
          <RepoBlock
            name="knot-shore-grocery-simulation-engine"
            tagline="Synthetic data generator"
            body={
              <>
                Python tool that produces deterministic synthetic retail data for the platform.
                Generates store-level daily summaries and department-level daily sales, plus
                injected anomalies with ground-truth labels. Output is a tree of CSV files under{" "}
                <code className="bg-muted px-1 rounded">daily/MM/DD/YYYY/</code>.
                <br />
                <br />
                Determinism is foundational: same seed and same date produces byte-identical
                output across runs and platforms. Per-date seeding (
                <code className="bg-muted px-1 rounded">global_seed + date.toordinal()</code>)
                means regenerating individual dates is safe and predictable.
              </>
            }
          />
          <RepoBlock
            name="economic-data-etl"
            tagline="Ingestion and detection"
            body={
              <>
                Python pipeline that reads sim engine output, validates schema and referential
                integrity, applies static-band detection rules, and writes canonical parquet
                artifacts. Also contains a separate macro-economic data pipeline (FRED, BLS, ERS)
                that loads to Postgres — distinct concern, same repo for shared tooling.
                <br />
                <br />
                The grocery side is built around a strict source-adapter / transform separation:{" "}
                <code className="bg-muted px-1 rounded">sim_ingest.py</code> knows about CSV
                format and produces typed records;{" "}
                <code className="bg-muted px-1 rounded">sim_transform.py</code> is
                source-format-agnostic and produces the canonical DataFrames.
              </>
            }
          />
          <RepoBlock
            name="economic-data-api"
            tagline="Service layer"
            body={
              <>
                FastAPI service exposing the canonical data via HTTP. Two operational modes for
                grocery data: <strong>fixtures</strong> (default, reads bundled parquets at{" "}
                <code className="bg-muted px-1 rounded">app/fixtures/</code>) and{" "}
                <strong>live</strong> (reads parquets at configured paths, e.g., a mounted volume
                or production storage). Mode is per-data-source — the four grocery paths
                (store-metrics, department-metrics, anomalies, dim-stores) toggle independently.
                <br />
                <br />
                Pydantic v2 schemas enforce response contracts. Structured logging via structlog;
                Prometheus metrics on a custom registry. The macro side reads from Postgres via
                SQLAlchemy.
              </>
            }
          />
          <RepoBlock
            name="knot-shore-portal"
            tagline="Stakeholder web application"
            body={
              <>
                Next.js 14 App Router application. Three primary pages: daily dashboard at{" "}
                <code className="bg-muted px-1 rounded">/</code>, store drilldown at{" "}
                <code className="bg-muted px-1 rounded">/stores/[id]</code>, exception triage at{" "}
                <code className="bg-muted px-1 rounded">/exceptions</code>. Server components
                fetch data; client components render charts. Same dual-mode architecture as the
                API: portal can run against bundled JSON fixtures (offline) or against an
                upstream API (online).
                <br />
                <br />
                Charts via recharts (pinned to v2). Filters URL-synced via{" "}
                <code className="bg-muted px-1 rounded">useSearchParams</code> for shareable
                state. Theme tokens throughout for consistent styling.
              </>
            }
          />
        </div>
      </section>

      <section className="space-y-4" id="modes">
        <h2 className="text-2xl font-semibold tracking-tight">Operational modes</h2>
        <p>
          Both the API and the portal support two operational modes:{" "}
          <strong>offline</strong> (default) and <strong>online</strong>. Both modes are
          first-class production paths, not a development convenience.
        </p>
        <p>
          Offline mode reads bundled fixtures: the API reads parquet files from{" "}
          <code className="bg-muted px-1 rounded">app/fixtures/</code>; the portal reads JSON
          snapshots from <code className="bg-muted px-1 rounded">fixtures/</code>. A
          clone-and-run demo against committed fixtures produces the same dashboards as a live
          deployment.
        </p>
        <p>
          Online mode reads live data sources. The API reads parquet files at configured paths
          (the upstream of which is a real ETL run against fresh sim output). The portal&apos;s
          route handlers proxy to the upstream API. The two modes can be combined arbitrarily: a
          portal in online mode can talk to an API in offline mode, etc.
        </p>
      </section>

      <section className="space-y-4" id="testing">
        <h2 className="text-2xl font-semibold tracking-tight">Testing</h2>
        <p>
          The platform follows test-driven development across all four repos. Tests are written
          before implementation; new bugs start with a failing test that reproduces them.
        </p>
        <p>
          Total test count across the platform is approximately 546 — 116 in the sim engine, 254
          in the ETL, 122 in the API, and 54 in the portal. Each test exists for a documented
          reason; coverage isn&apos;t the goal, behavioral integrity is.
        </p>
        <p>
          The platform also maintains integrity canaries — single values that should hold across
          arbitrary changes. The dashboard&apos;s{" "}
          <code className="bg-muted px-1 rounded">total_sales</code> for the 2025 demo window is{" "}
          <code className="bg-muted px-1 rounded">$115,253,718</code>. Store 1&apos;s drilldown
          total is <code className="bg-muted px-1 rounded">$18,598,268</code>. The full canonical
          contains 831 anomaly flags. If these change unexpectedly, something has drifted — the
          canaries are how the platform knows.
        </p>
      </section>

      <section className="space-y-4" id="observability">
        <h2 className="text-2xl font-semibold tracking-tight">Observability</h2>
        <p>
          Every repo emits structured JSON logs in production. The Python repos use structlog
          with an stdlib bridge (so library code that uses{" "}
          <code className="bg-muted px-1 rounded">logging.info(...)</code> still emits structured
          output). The portal uses pino with sync streams to keep Next.js&apos;s webpack happy. A
          request-correlation middleware threads{" "}
          <code className="bg-muted px-1 rounded">X-Request-ID</code> through HTTP boundaries.
        </p>
        <p>
          The API exposes Prometheus metrics at{" "}
          <code className="bg-muted px-1 rounded">/metrics</code> on a custom registry. The
          portal exposes its own metrics at the same path on a{" "}
          <code className="bg-muted px-1 rounded">globalThis</code>-scoped registry singleton (a
          requirement of Next.js App Router&apos;s per-route bundling).
        </p>
      </section>

      <section className="space-y-4" id="learn-more">
        <h2 className="text-2xl font-semibold tracking-tight">Learn more</h2>
        <p>
          For per-repo deep-dives — code organization, key patterns, and the reasoning behind
          specific choices — see the per-layer pages:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li>
            <Link
              href="/about/sim-engine"
              className="hover:text-foreground transition-colors underline"
            >
              Sim engine
            </Link>{" "}
            — synthetic data generation, determinism, anomaly injection
          </li>
          <li>
            <Link
              href="/about/etl"
              className="hover:text-foreground transition-colors underline"
            >
              ETL
            </Link>{" "}
            — source adapters, transforms, detection rules, the macro pipeline
          </li>
          <li>
            <Link
              href="/about/api"
              className="hover:text-foreground transition-colors underline"
            >
              API
            </Link>{" "}
            — endpoint contracts, dual-mode operation, observability
          </li>
          <li>
            <Link
              href="/about/portal"
              className="hover:text-foreground transition-colors underline"
            >
              Portal
            </Link>{" "}
            — Next.js architecture, server-component data flow, URL state, charts
          </li>
        </ul>
        <p>
          The{" "}
          <Link
            href="/about/decisions"
            className="hover:text-foreground transition-colors underline"
          >
            decisions
          </Link>{" "}
          index lists each non-obvious architectural choice made during the build, with rationale
          and tradeoffs.
        </p>
      </section>
    </article>
  );
}

interface RepoBlockProps {
  name: string;
  tagline: string;
  body: React.ReactNode;
}

function RepoBlock({ name, tagline, body }: RepoBlockProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="space-y-1 mb-3">
        <h3 className="text-base font-semibold font-mono">{name}</h3>
        <p className="text-sm text-muted-foreground">{tagline}</p>
      </div>
      <div className="text-sm leading-relaxed">{body}</div>
    </div>
  );
}
