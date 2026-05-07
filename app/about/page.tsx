import Link from "next/link";

export const metadata = {
  title: "About — Knot Shore Portal",
  description: "Documentation hub for the Knot Shore Grocery analytics platform.",
};

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
    href: "/about/sim-engine",
    title: "Sim engine",
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
    available: false,
  },
  {
    href: "/about/portal",
    title: "Portal",
    description:
      "The Next.js application — server-component data flow, URL-synced state, charts, theme system, this page itself.",
    available: false,
  },
];

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-4xl px-6 py-8 space-y-10">
      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">About</h1>
        <p className="text-lg text-muted-foreground">
          Documentation for the Knot Shore Grocery analytics platform — what it is, how
          it&apos;s structured, and the reasoning behind specific choices.
        </p>
      </header>

      <section className="space-y-4">
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
          for the reasoning behind specific choices; pick a per-layer page for repo-level depth.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Pages</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PAGES.map((page) => (
            <PageCard key={page.href} {...page} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Per-layer pages are added in a subsequent phase. The links resolve once those pages
          ship.
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
