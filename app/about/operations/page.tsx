import Link from "next/link";

export const metadata = {
  title: "Operations — Knot Shore Portal",
  description:
    "What a production deployment of the Knot Shore platform would require beyond what is currently built.",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface Consideration {
  heading: string;
  body: React.ReactNode;
}

interface OperationsSection {
  title: string;
  intro?: React.ReactNode;
  considerations: Consideration[];
}

const SECTIONS: OperationsSection[] = [
  {
    title: "Data storage",
    intro: (
      <p>
        The platform currently uses SQLite as the macro pipeline&apos;s default database and
        committed parquet files for the grocery data. Production would need durable storage
        on both sides.
      </p>
    ),
    considerations: [
      {
        heading: "Postgres for the macro pipeline",
        body: (
          <p>
            SQLAlchemy abstracts the dialect, so no code changes are needed — only{" "}
            <code className="bg-muted px-1 rounded">DATABASE_URL</code> configuration.
            Migrations would be managed via Alembic (already a SQLAlchemy convention). The
            macro pipeline&apos;s tests run against in-memory SQLite, which forces the SQL
            to stay portable.
          </p>
        ),
      },
      {
        heading: "Real storage for grocery data",
        body: (
          <p>
            The current pattern (parquet committed to git, byte-identical between ETL and
            API repos) is fine for ~600KB fixtures. At ~50MB+ the binary diffs become
            annoying; at ~500MB+ git itself becomes the wrong tool. Options at scale: object
            storage (S3) with a checksum manifest; a separate analytical database (DuckDB,
            ClickHouse) that the API queries.
          </p>
        ),
      },
    ],
  },
  {
    title: "Scheduling and orchestration",
    intro: (
      <p>
        The macro pipeline has an entry point and idempotent state tracking. It does not
        have a scheduler.
      </p>
    ),
    considerations: [
      {
        heading: "A scheduler for the macro pipeline",
        body: (
          <p>
            Airflow, Prefect, Dagster, or GitHub Actions cron — the choice depends on
            existing org tooling. The pipeline is &quot;DAG-ready&quot; in the sense that
            it has clear inputs, outputs, and state, but the actual DAG definition would
            live in the orchestrator&apos;s config.
          </p>
        ),
      },
      {
        heading: "A workflow for canonical regeneration",
        body: (
          <p>
            Currently manual. In production, this could either stay manual (an operator
            triggers regeneration deliberately, perhaps as part of a quarterly data refresh
            process) or be automated against a schedule. Either is defensible; the question
            is who owns the decision to regenerate.
          </p>
        ),
      },
    ],
  },
  {
    title: "Authentication and authorization",
    intro: <p>The platform has neither. Production would need both.</p>,
    considerations: [
      {
        heading: "Authentication",
        body: (
          <p>
            Reverse-proxy auth (auth handled by the infrastructure layer — NGINX,
            Cloudflare Access, OAuth proxy) is the simplest path for an analytical demo
            platform. Application-layer auth (FastAPI&apos;s OAuth2 dependency, JWT) is the
            next step if per-user state becomes necessary.
          </p>
        ),
      },
      {
        heading: "Principal-header middleware wiring",
        body: (
          <p>
            The API already threads <code className="bg-muted px-1 rounded">X-Request-ID</code>{" "}
            through every layer via request-correlation middleware; the same middleware shape is
            the extension point that would capture the authenticated principal at the first
            proxied deployment. Reverse-proxy auth (the simpler option above) terminates the
            auth check at the proxy and forwards the result as a header like{" "}
            <code className="bg-muted px-1 rounded">X-Forwarded-User</code>; an API middleware
            reads that header into a request-scoped context object that downstream handlers and
            log lines can rely on. This pairs with the{" "}
            <Link
              href="/about/decisions#no-user-authentication"
              className="underline hover:text-foreground"
            >
              No user authentication
            </Link>{" "}
            decision card — that card explains why nothing in the platform reads a principal
            today, and the middleware shape above is the specific surface that absorbs one when
            it&apos;s added.
          </p>
        ),
      },
      {
        heading: "Authorization",
        body: (
          <p>
            Currently every endpoint serves the same data. In production, store managers
            might see only their store&apos;s data; regional managers see their region;
            corporate sees everything. RBAC via JWT claims is the standard pattern; the API
            would need to filter query results by the caller&apos;s authorization scope.
          </p>
        ),
      },
    ],
  },
  {
    title: "Caching and performance",
    intro: (
      <p>
        The API recomputes every aggregation on every request. The portal re-fetches data
        on every page load.
      </p>
    ),
    considerations: [
      {
        heading: "An LRU cache on parquet reads",
        body: (
          <p>
            The aggregation work is fast (milliseconds on small data); the parquet I/O
            dominates. Caching the loaded DataFrame for 30-60 seconds eliminates 99% of the
            I/O cost for the typical access pattern.
          </p>
        ),
      },
      {
        heading: "CDN-level caching for the portal",
        body: (
          <p>
            Vercel does this already for static pages; the dashboard and exceptions pages
            now serve as static after the offline-mode refactor. The remaining dynamic
            routes (<code className="bg-muted px-1 rounded">/stores/[id]</code>) could be
            CDN-cached with revalidation.
          </p>
        ),
      },
      {
        heading: "Database connection pooling",
        body: (
          <p>
            The current SQLite-by-default setup doesn&apos;t need this; Postgres at
            production scale absolutely does. SQLAlchemy&apos;s engine handles pooling with
            sensible defaults; production would tune pool sizes per environment.
          </p>
        ),
      },
    ],
  },
  {
    title: "Monitoring and alerting",
    intro: (
      <p>
        The platform has structured logging and Prometheus metrics. Production needs
        somewhere for those metrics to live, alerts on top of them, and runbooks for when
        alerts fire.
      </p>
    ),
    considerations: [
      {
        heading: "A metrics destination",
        body: (
          <p>
            The Prometheus metrics need somewhere to be scraped to. Grafana Cloud, Datadog,
            a self-hosted Prometheus + Grafana stack — the choice depends on org tooling.
          </p>
        ),
      },
      {
        heading: "Log aggregation",
        body: (
          <p>
            Both Python repos and the portal already emit structured JSON logs; production
            needs somewhere for those lines to be queryable. Loki paired with the same Grafana
            that scrapes the metrics is the lowest-friction path; Datadog or an existing ELK
            stack are equally fine choices, and the structured shape of the log lines is the
            same either way. The runbook content that goes alongside is concrete: what to do
            when <code className="bg-muted px-1 rounded">upstream_unreachable</code> spikes,
            what to check when the canonical regeneration falls behind schedule, and how to
            confirm whether a portal route is silently degrading to its fallback fixture.
          </p>
        ),
      },
      {
        heading: "OpenTelemetry traces",
        body: (
          <p>
            Structured logs and Prometheus metrics cover two legs of the observability triad;
            traces would cover the third. The spans worth wiring first are the request path
            through the request-correlation middleware, the upstream fetch from each{" "}
            <code className="bg-muted px-1 rounded">/api/*</code> route handler when the portal
            runs in online mode, and the data-layer transformations on the API side. With those
            three in place, a slow page render can be attributed to a specific upstream hop
            rather than guessed at from log timestamps.
          </p>
        ),
      },
      {
        heading: "Alerting on operational signals",
        body: (
          <p>
            The <code className="bg-muted px-1 rounded">/health</code> endpoint exists for
            this. Alerts that fire on: API returning 500s above baseline; API reporting{" "}
            <code className="bg-muted px-1 rounded">fixture</code> mode unexpectedly (the
            silent-fallback risk called out in the{" "}
            <Link
              href="/about/decisions#two-mode-demo-as-first-class"
              className="underline hover:text-foreground"
            >
              Two-mode demo as first-class
            </Link>{" "}
            decision); macro pipeline failing to produce expected output; canonical
            regeneration falling behind schedule.
          </p>
        ),
      },
      {
        heading: "SLO definitions",
        body: (
          <p>
            Latency targets, availability targets, freshness targets. The platform
            doesn&apos;t have these because the demo doesn&apos;t need them; production
            would establish them as part of the deploy contract.
          </p>
        ),
      },
      {
        heading: "Runbooks",
        body: (
          <p>
            When alerts fire, someone has to know what to do. The most valuable production
            artifact that doesn&apos;t exist in the repo right now is a runbook covering
            the top five alerts and their resolution paths.
          </p>
        ),
      },
    ],
  },
  {
    title: "CI/CD and deployment",
    intro: (
      <p>
        The platform has GitHub Actions workflows for tests on every repo. It deploys to
        Vercel (portal only; the API and ETL aren&apos;t currently deployed).
      </p>
    ),
    considerations: [
      {
        heading: "A coverage gate in CI",
        body: (
          <p>
            The CI workflows currently run lint, type-check, and the test suites but apply no
            coverage threshold. Adding{" "}
            <code className="bg-muted px-1 rounded">--coverage --coverage.thresholds.lines=80</code>{" "}
            to the portal&apos;s vitest invocation and the equivalent{" "}
            <code className="bg-muted px-1 rounded">--cov-fail-under=80</code> to the Python
            repos&apos; pytest invocations would catch regressions on lines that are currently
            exercised. Coverage percentage is a poor metric on its own — the threshold catches
            drops, not gaps — but the gate is cheap to install and cheap to maintain, and the
            alternative is discovering uncovered code only after a regression lands.
          </p>
        ),
      },
      {
        heading: "Environment promotion",
        body: (
          <p>
            Currently main = production. A real deploy would have main → staging →
            production with explicit promotion gates. Staging would be the place to verify
            canonical regenerations before they hit production.
          </p>
        ),
      },
      {
        heading: "Blue-green or canary deploys",
        body: (
          <p>
            For the API, a deployment strategy that doesn&apos;t have a window of
            unavailability. For the portal, Vercel&apos;s atomic deploys already handle
            this; the API would need its own pattern.
          </p>
        ),
      },
      {
        heading: "Rollback strategy",
        body: (
          <p>
            Currently rollback is &quot;git revert and redeploy.&quot; Production needs a
            faster path — keeping the prior deploy warm for rapid traffic shift.
          </p>
        ),
      },
    ],
  },
  {
    title: "Data quality",
    intro: (
      <p>
        The detection rules are themselves a kind of data quality monitor — flagging when a
        store&apos;s metrics deviate from expected bands. But this is business-anomaly
        detection, not data integrity monitoring.
      </p>
    ),
    considerations: [
      {
        heading: "Schema validation at pipeline boundaries",
        body: (
          <p>
            Great Expectations, Pandera, or dbt&apos;s built-in tests would assert: this
            column is not null, this value is in this set, this aggregate sums correctly.
            Currently this is rolled into the detection contract.
          </p>
        ),
      },
      {
        heading: "Freshness monitoring",
        body: (
          <p>
            &quot;When was the last successful canonical regeneration?&quot; should be a
            queryable metric. Currently it&apos;s a manifest field in the sim engine
            output. The cautionary note that frames why freshness matters here is{" "}
            <Link
              href="/about/lessons#the-off-by-one-in-the-canonical-backfill-default"
              className="underline hover:text-foreground"
            >
              The off-by-one in the canonical backfill default
            </Link>
            .
          </p>
        ),
      },
      {
        heading: "Lineage tracking",
        body: (
          <p>
            dbt would provide this for the macro pipeline. For the grocery pipeline, the
            sim engine → ETL → API → portal flow is documented but not machine-tracked. A
            lineage tool (dbt docs, OpenLineage) would surface &quot;if I change column X
            in the sim engine, what downstream artifacts need to update?&quot;
          </p>
        ),
      },
    ],
  },
];

export default function OperationsPage() {
  return (
    <article className="mx-auto max-w-4xl px-6 py-8 space-y-10">
      <header className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <Link href="/about" className="hover:text-foreground transition-colors">
            About
          </Link>{" "}
          / Operations
        </p>
        <h1 className="font-display text-4xl tracking-tight text-brand-deep-navy">Operations</h1>
        <p className="text-lg text-muted-foreground">
          The platform is a demo. It works end-to-end, it deploys, the data is realistic — but
          it&apos;s deliberately incomplete for production use. This page documents what would
          change in a real deployment, layer by layer. Some of these are infrastructure
          additions (a database, a scheduler); some are operational practices (alerting,
          runbooks); some are software changes (auth, caching). All are intentional non-features
          in the current state, named so a reviewer knows the scope was bounded deliberately.
        </p>
        <p className="text-sm text-muted-foreground">
          The pairing of what the architecture optimizes for and what it deliberately does not
          lives on the{" "}
          <Link href="/about/architecture" className="underline hover:text-foreground">
            Architecture
          </Link>{" "}
          page; this page covers what would change to lift the non-features.
        </p>
      </header>

      <nav className="rounded-lg border border-border bg-card p-5">
        <p className="text-sm font-medium mb-3">Areas</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
          {SECTIONS.map((section) => (
            <li key={section.title}>
              <a
                href={`#${slugify(section.title)}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-12">
        {SECTIONS.map((section) => (
          <SectionBlock key={section.title} section={section} />
        ))}
      </div>

      <section className="space-y-4 border-t border-border pt-8" id="meta">
        <p>
          None of these are missing in a critical sense. The platform is a demo, and the demo
          works. Each gap is named because production scope is real work that the demo
          deliberately doesn&apos;t include — naming them up front prevents &quot;why
          doesn&apos;t this do X&quot; questions and signals that the scope was bounded
          deliberately. A reviewer who reads this page should come away with the same
          understanding I had when building: this is what the platform is, and this is what it
          would become with deployment-grade investment.
        </p>
      </section>
    </article>
  );
}

function SectionBlock({ section }: { section: OperationsSection }) {
  return (
    <section className="space-y-5" id={slugify(section.title)}>
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
        {section.intro}
      </div>
      <div className="space-y-5">
        {section.considerations.map((consideration) => (
          <div
            key={consideration.heading}
            className="rounded-lg border border-border bg-card p-5 space-y-2"
            id={slugify(consideration.heading)}
          >
            <h3 className="text-base font-semibold tracking-tight">{consideration.heading}</h3>
            <div className="text-sm leading-relaxed">{consideration.body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
