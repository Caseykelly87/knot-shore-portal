import { MermaidDiagram } from "@/components/about/MermaidDiagram";
import Link from "next/link";

export const metadata = {
  title: "Architecture — Knot Shore Portal",
  description: "Platform-wide architectural narrative for the Knot Shore Grocery analytics platform.",
};

const PLATFORM_FLOW_DIAGRAM = `
graph LR
  subgraph Sim["Simulation engine"]
    SE[knot-shore-grocery-simulation-engine]
    SE_OUT[CSV files<br/>daily/YYYY/MM/DD/]
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
        <h1 className="font-display text-4xl tracking-tight text-brand-deep-navy">Architecture</h1>
        <p className="text-lg text-muted-foreground">
          Platform-wide overview of the Knot Shore Grocery analytics platform — what it does, how
          the pieces fit together, and the design principles that shape the code.
        </p>
      </header>

      <section className="space-y-4" id="overview">
        <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
        <p>
          The platform serves operations leads and regional managers at a small grocery chain —
          eight stores across a suburban, urban, and value market mix. They open the dashboards
          at the start of a day or week with specific questions: which stores are tracking ahead
          or behind their expected revenue for the period, how today&apos;s numbers compare to the
          same day last year, which department in which store is the most anomalous right now,
          and which of the open exception flags are critical versus noise the team can dismiss.
          A secondary audience — corporate finance and category management — uses the same
          surfaces for weekly numbers and light cross-store comparison.
        </p>
        <p>
          The dashboards are organized around those questions. The KPI cards anchor the daily
          snapshot: revenue total, year-over-year comp, exception severity counts, and the
          leading stores by revenue. The sales-trend chart shows daily revenue across the window
          as a single continuous line. The exceptions triage page covers the detection
          layer, with severity buckets and per-finding rule traces. Per-store and per-department
          drilldowns service the &quot;why&quot; — when a card or a flag raises a question, the
          drilldown is where the answer lives. A trade-area comparison covers cross-profile
          patterns for the finance and category-management view.
        </p>
        <p>
          The platform is organized as four independently maintained repositories, each with its
          own test suite, CI workflow, and deployable surface. The repos communicate through
          well-defined data contracts: parquet artifacts at the ETL boundary, an HTTP API at the
          service boundary, and JSON fixtures at the portal&apos;s offline boundary.
        </p>
      </section>

      <section className="space-y-4" id="optimizes-for">
        <h2 className="text-2xl font-semibold tracking-tight">What this architecture optimizes for</h2>
        <p>
          The architecture optimizes for four properties, in rough order of priority.
        </p>
        <ol className="list-decimal list-outside ml-5 space-y-3">
          <li>
            <strong>Explainability.</strong> Every detection finding traces to a specific
            rule (a band rule over a store-day, or the structural rule over a department-day)
            and writes to a shared schema. Every log line traces to a request ID.
            Every canonical fixture traces to a sim engine seed and date range. Nothing in the
            platform is opaque.
          </li>
          <li>
            <strong>Deterministic regeneration.</strong> The canonical data can be regenerated
            byte-identically from scratch by anyone with the repo. This is what makes the
            platform reviewable — a reader can verify what the code does by running it. The
            mechanism is documented at{" "}
            <Link
              href="/about/decisions#per-date-deterministic-seeding"
              className="underline hover:text-foreground"
            >
              Per-date deterministic seeding
            </Link>
            .
          </li>
          <li>
            <strong>Dual-mode operation.</strong> The portal works against bundled fixtures or
            against a live API with no code changes. This is what makes the demo deployable
            without infrastructure while preserving the production-shape architecture. See{" "}
            <Link
              href="/about/decisions#two-mode-demo-as-first-class"
              className="underline hover:text-foreground"
            >
              Two-mode demo as first-class
            </Link>{" "}
            for why this is treated as a contract rather than a development convenience.
          </li>
          <li>
            <strong>Clean cross-repo contracts.</strong> Four repos with explicit boundaries
            force interfaces to be thought through. The sim engine can&apos;t depend on portal
            types; the ETL can&apos;t import the API; data flows in one direction.
          </li>
        </ol>
      </section>

      <section className="space-y-4" id="does-not-optimize-for">
        <h2 className="text-2xl font-semibold tracking-tight">What this architecture does NOT optimize for</h2>
        <p>
          Equally important, the architecture deliberately does not optimize for the following.
          Each is a deliberate non-feature, not a missing one.
        </p>
        <ol className="list-decimal list-outside ml-5 space-y-3">
          <li>
            <strong>High throughput.</strong> The API serves parquet files directly via{" "}
            <code className="bg-muted px-1 rounded">pd.read_parquet()</code> on every request.
            There&apos;s no caching layer. This is fine at demo scale (milliseconds on small
            data); it would not survive sustained concurrent load.
          </li>
          <li>
            <strong>Real-time updates.</strong> The platform is batch. Daily grain only. No
            WebSocket endpoints, no Server-Sent Events, no streaming data path. Real-time
            grocery analytics is a fundamentally different system.
          </li>
          <li>
            <strong>Multi-tenancy.</strong> Every endpoint serves the same data to every caller.
            No authentication, no per-user state, no row-level security. Production deploys would
            terminate auth at the infrastructure layer.
          </li>
          <li>
            <strong>Write paths.</strong> All API endpoints are GET. The portal has no forms, no
            &quot;save view&quot; buttons, no &quot;mark exception as resolved&quot; actions.
            Adding writes would multiply the operational surface (validation, conflict
            resolution, audit logging, authorization).
          </li>
        </ol>
        <p>
          What it would take to support each of these is documented on the{" "}
          <Link href="/about/operations" className="underline hover:text-foreground">
            Operations
          </Link>{" "}
          page.
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
            href="https://github.com/Caseykelly87/Knot-shore-grocery-simulation-engine"
            body={
              <>
                Python tool that produces deterministic synthetic retail data for the platform.
                Generates store-level daily summaries and department-level daily sales, plus
                injected anomalies with ground-truth labels. Output is a tree of CSV files under{" "}
                <code className="bg-muted px-1 rounded">daily/YYYY/MM/DD/</code>.
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
            href="https://github.com/Caseykelly87/economic-data-etl"
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
            href="https://github.com/Caseykelly87/economic-data-api"
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
            href="https://github.com/Caseykelly87/knot-shore-portal"
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
          <RepoBlock
            name="knot-shore-platform"
            tagline="Orchestration and end-to-end stack"
            href="https://github.com/Caseykelly87/knot-shore-platform"
            body={
              <>
                Brings the four service repos together as Git submodules and runs the full
                pipeline locally with{" "}
                <code className="bg-muted px-1 rounded">docker compose up</code>. The sim engine
                generates the canonical window, the ETL writes the parquet artifacts, the API
                serves them, and the portal renders them — all on{" "}
                <code className="bg-muted px-1 rounded">localhost</code>, no cloud dependencies.
                <br />
                <br />
                This is the only place the four services run end-to-end against live (rather
                than fixture-backed) data. It is also where the cross-repo invariant checks
                live: the <code className="bg-muted px-1 rounded">byte-identity.yml</code>{" "}
                workflow pins the SHA-256 equality between the ETL canonical and the API
                bundled fixtures.
              </>
            }
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Two ways to see the platform run. The orchestration repo above is the full-stack path
          — every service running against every other service. The Vercel deployment at{" "}
          <a
            href="https://knot-shore-portal.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            knot-shore-portal.vercel.app
          </a>{" "}
          is the portal alone, served against bundled JSON fixtures, useful for clicking through
          the dashboards without running anything locally.
        </p>
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

      <section className="space-y-4" id="operational-responsibilities">
        <h2 className="text-2xl font-semibold tracking-tight">Operational responsibilities</h2>
        <p>
          Operational responsibilities in a deployed version of this platform would break down
          as follows.
        </p>
        <ul className="list-disc list-outside ml-5 space-y-3">
          <li>
            <strong>The macro pipeline runs on a schedule.</strong> A scheduler (cron, Airflow,
            Prefect, GitHub Actions) invokes{" "}
            <code className="bg-muted px-1 rounded">python -m macro_pipeline</code> daily or
            weekly to pull fresh FRED/BLS/ERS data. The current{" "}
            <code className="bg-muted px-1 rounded">main.py</code> entry point is
            scheduler-ready; the actual scheduling configuration is not in the repo.
          </li>
          <li>
            <strong>The canonical regenerates manually.</strong> Refreshing the sim engine&apos;s
            output and the canonical detection results is a deliberate, infrequent action —
            currently three or four times per year when the platform&apos;s data window needs
            to shift. The sequence is documented; the trigger is human judgment. The cautionary
            note that shaped this discipline is{" "}
            <Link
              href="/about/lessons#the-off-by-one-in-the-canonical-backfill-default"
              className="underline hover:text-foreground"
            >
              The off-by-one in the canonical backfill default
            </Link>
            .
          </li>
          <li>
            <strong>Portal redeployment follows canonical regeneration.</strong> When the
            canonical changes, the portal&apos;s bundled JSON fixtures need to be regenerated
            and committed. A CI workflow could automate this on canonical-file change in the API
            repo; currently this is manual.
          </li>
          <li>
            <strong>The API runs continuously where deployed.</strong> In offline mode it serves
            bundled fixtures. In live mode it reads parquet files from configured paths. The{" "}
            <code className="bg-muted px-1 rounded">/health</code> endpoint reports which mode
            it&apos;s in.
          </li>
        </ul>
      </section>

      <section className="space-y-4" id="testing">
        <h2 className="text-2xl font-semibold tracking-tight">Testing</h2>
        <p>
          The platform follows test-driven development across all four repos. Tests are written
          before implementation; new bugs start with a failing test that reproduces them.
        </p>
        <p>
          Total test count across the platform is 828 — 142 in the sim engine, 287 in the ETL,
          180 in the API, and 219 in the portal. Each test exists for a documented reason;
          coverage isn&apos;t the goal, behavioral integrity is.
        </p>
        <p>
          The platform also maintains integrity canaries — single values that should hold across
          arbitrary changes. The dashboard&apos;s{" "}
          <code className="bg-muted px-1 rounded">total_sales</code> for the 2025 demo window is{" "}
          <code className="bg-muted px-1 rounded">$222,402,534</code>. Store 1&apos;s drilldown
          total is <code className="bg-muted px-1 rounded">$35,882,161</code>. The full canonical
          contains 343 anomaly flags, no longer dominated by any single rule:{" "}
          <code className="bg-muted px-1 rounded">department_reconciliation</code> contributes 141
          (each store-day&apos;s department net_sales summed against the store total),{" "}
          <code className="bg-muted px-1 rounded">department_coverage</code> 110,{" "}
          <code className="bg-muted px-1 rounded">gross_margin_band</code> 48,{" "}
          <code className="bg-muted px-1 rounded">transactions_band</code> 22,{" "}
          <code className="bg-muted px-1 rounded">revenue_zscore_28d</code> 20, and{" "}
          <code className="bg-muted px-1 rounded">yoy_comp</code> 2. If these change unexpectedly,
          something has drifted — the canaries are how the platform knows.
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
              Simulation engine
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
  href?: string;
}

function RepoBlock({ name, tagline, body, href }: RepoBlockProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="space-y-1 mb-3">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h3 className="text-base font-semibold font-mono">{name}</h3>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
            >
              View on GitHub →
            </a>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{tagline}</p>
      </div>
      <div className="text-sm leading-relaxed">{body}</div>
    </div>
  );
}
