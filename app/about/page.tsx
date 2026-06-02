import Link from "next/link";

export const metadata = {
  title: "About — Knot Shore Portal",
  description: "Documentation hub for the Knot Shore Grocery analytics platform.",
};

const REPOS = [
  {
    href: "https://github.com/Caseykelly87/Knot-shore-grocery-simulation-engine",
    name: "knot-shore-grocery-simulation-engine",
    description:
      "Synthetic data generator. Produces deterministic store and department-level daily retail data with injected anomalies.",
  },
  {
    href: "https://github.com/Caseykelly87/economic-data-etl",
    name: "economic-data-etl",
    description:
      "Ingestion and detection pipeline. Reads sim engine output, validates schemas, applies detection rules, writes canonical parquet artifacts.",
  },
  {
    href: "https://github.com/Caseykelly87/economic-data-api",
    name: "economic-data-api",
    description:
      "FastAPI service that exposes the canonical data over HTTP. Runs in fixture or live mode per data source.",
  },
  {
    href: "https://github.com/Caseykelly87/knot-shore-portal",
    name: "knot-shore-portal",
    description:
      "Next.js 14 portal — the dashboards and this documentation hub. Runs against bundled JSON fixtures (offline) or an upstream API (online).",
  },
  {
    href: "https://github.com/Caseykelly87/knot-shore-platform",
    name: "knot-shore-platform",
    description:
      "Orchestration repo. Brings the four service repos together as Git submodules and runs the full pipeline locally with `docker compose up`. The only place the four services run end-to-end against live data.",
  },
];

const PAGES = [
  {
    href: "/about/architecture",
    title: "Architecture",
    description:
      "Platform-wide overview — what the platform does, how the four repos fit together, the data flow through each layer.",
    available: true,
  },
  {
    href: "/about/decisions",
    title: "Decisions",
    description:
      "Architectural decisions made during the platform build, with rationale, cost, and revisit conditions for each.",
    available: true,
  },
  {
    href: "/about/lessons",
    title: "Lessons",
    description:
      "Bugs, gotchas, and surprises from the build — what happened, how it was handled, and what it taught.",
    available: true,
  },
  {
    href: "/about/sim-engine",
    title: "Simulation engine",
    description:
      "The synthetic data generator — determinism, anomaly injection, paired-year generation, key code structure.",
    available: true,
  },
  {
    href: "/about/etl",
    title: "ETL",
    description:
      "The ingestion pipeline — source adapters, transforms, detection rules, the macro pipeline, the canonical fixture flow.",
    available: true,
  },
  {
    href: "/about/api",
    title: "API",
    description:
      "The service layer — endpoint contracts, dual-mode operation, observability stack, schema discipline.",
    available: true,
  },
  {
    href: "/about/portal",
    title: "Portal",
    description:
      "The Next.js application — server-component data flow, URL-synced state, charts, theme system, this page itself.",
    available: true,
  },
  {
    href: "/about/detection-quality",
    title: "Detection quality",
    description:
      "Measurement against ground truth — recall, false-positive rate, per-anomaly-type breakdown, and the platform's detection contract verdict.",
    available: true,
  },
  {
    href: "/about/operations",
    title: "Operations",
    description:
      "What a production deployment would require beyond what is currently built — storage, scheduling, auth, caching, alerting, deploy strategy, data quality.",
    available: true,
  },
];

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-4xl px-6 py-8 space-y-10">
      <header className="space-y-3">
        <h1 className="font-display text-4xl tracking-tight text-brand-deep-navy">About</h1>
        <p className="text-lg text-muted-foreground">
          Documentation for the Knot Shore Grocery analytics platform — what it is, how
          it&apos;s structured, and the reasoning behind specific choices.
        </p>
      </header>

      <section className="space-y-4">
        <p>
          This section is the engineering perspective on the platform. It covers what the
          platform is and how the pieces fit together, but the focus is on the choices behind
          the code — what was decided, what was rejected, what the tradeoffs are, and what
          didn&apos;t work the first time.
        </p>
        <p>
          The platform is an end-to-end retail analytics stack for a fictional 8-store grocery
          chain. It generates synthetic store and department data, ingests through an ETL with
          anomaly detection, exposes the result through a service API, and renders dashboards in
          this portal.
        </p>
        <p>
          Each page below covers a different scope. Start with{" "}
          <Link href="/about/architecture" className="underline hover:text-foreground">
            Architecture
          </Link>{" "}
          for the platform-wide picture; visit{" "}
          <Link href="/about/decisions" className="underline hover:text-foreground">
            Decisions
          </Link>{" "}
          for the reasoning behind specific choices and{" "}
          <Link href="/about/lessons" className="underline hover:text-foreground">
            Lessons
          </Link>{" "}
          for what went sideways during the build; pick a per-layer page for repo-level depth.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Pages</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PAGES.map((page) => (
            <PageCard key={page.href} {...page} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Repositories</h2>
        <p className="text-sm text-muted-foreground">
          The platform spans five repositories. The four service repos build the data path
          end-to-end; the orchestration repo runs all four together as the full-stack technical
          demo.
        </p>
        <ul className="space-y-3">
          {REPOS.map((repo) => (
            <li key={repo.href} className="text-sm">
              <a
                href={repo.href}
                target="_blank"
                rel="noreferrer"
                className="font-mono font-semibold underline hover:text-foreground transition-colors"
              >
                {repo.name}
              </a>
              <span className="text-muted-foreground"> — {repo.description}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          The Vercel deployment at{" "}
          <a
            href="https://knot-shore-portal.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            knot-shore-portal.vercel.app
          </a>{" "}
          is the portal alone against bundled JSON fixtures — the offline-only preview. The
          orchestration repo above is the full-stack path that wires the four services together.
        </p>
      </section>
    </article>
  );
}

interface PageCardProps {
  href: string;
  title: string;
  description: string;
  available: boolean;
}

function PageCard({ href, title, description, available }: PageCardProps) {
  if (!available) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-5 space-y-2 opacity-60">
        <h3 className="font-semibold flex items-center gap-2">
          {title}
          <span className="text-xs font-normal text-muted-foreground">(coming soon)</span>
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="rounded-lg border border-border bg-card p-5 space-y-2 hover:border-foreground/20 hover:bg-accent transition-colors block"
    >
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
