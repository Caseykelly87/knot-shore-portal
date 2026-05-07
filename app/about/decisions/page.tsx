import Link from "next/link";
import { DECISIONS, type DecisionEntry, type DecisionCategory } from "@/lib/about/decisions";

export const metadata = {
  title: "Decisions — Knot Shore Portal",
  description:
    "Architectural decisions made during the Knot Shore Grocery analytics platform build.",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function DecisionsPage() {
  const totalDecisions = DECISIONS.reduce((sum, c) => sum + c.entries.length, 0);

  return (
    <article className="mx-auto max-w-4xl px-6 py-8 space-y-10">
      <header className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <Link href="/about" className="hover:text-foreground transition-colors">
            About
          </Link>{" "}
          / Decisions
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Decisions</h1>
        <p className="text-lg text-muted-foreground">
          {totalDecisions} architectural decisions made during the platform build, grouped by
          category. Each entry records what was decided, why, what it costs, and when it should
          be revisited.
        </p>
      </header>

      <nav className="rounded-lg border border-border bg-card p-5">
        <p className="text-sm font-medium mb-3">Categories</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
          {DECISIONS.map((category) => (
            <li key={category.name}>
              <a
                href={`#${slugify(category.name)}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {category.name} <span className="text-xs">({category.entries.length})</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-12">
        {DECISIONS.map((category) => (
          <CategorySection key={category.name} category={category} />
        ))}
      </div>
    </article>
  );
}

function CategorySection({ category }: { category: DecisionCategory }) {
  return (
    <section className="space-y-6" id={slugify(category.name)}>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">{category.name}</h2>
        <p className="text-muted-foreground">{category.description}</p>
      </div>
      <div className="space-y-5">
        {category.entries.map((entry) => (
          <DecisionCard key={entry.title} entry={entry} />
        ))}
      </div>
    </section>
  );
}

function DecisionCard({ entry }: { entry: DecisionEntry }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <h3 className="text-lg font-semibold tracking-tight" id={slugify(entry.title)}>
        {entry.title}
      </h3>
      <DecisionField label="Decision" value={entry.decision} />
      <DecisionField label="Rationale" value={entry.rationale} />
      <DecisionField label="Cost" value={entry.cost} />
      <DecisionField label="Revisit when" value={entry.revisitWhen} />
    </div>
  );
}

function DecisionField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm leading-relaxed">{value}</div>
    </div>
  );
}
