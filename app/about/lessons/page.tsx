import Link from "next/link";
import { LESSONS, type LessonEntry } from "@/lib/about/lessons";

export const metadata = {
  title: "Lessons — Knot Shore Portal",
  description:
    "Engineering lessons from building the Knot Shore Grocery analytics platform — bugs, gotchas, and surprises with their resolutions and takeaways.",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={i}
          className="font-mono text-[0.85em] bg-muted text-foreground px-1.5 py-0.5 rounded"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <Link key={i} href={linkMatch[2]} className="underline hover:text-foreground">
          {linkMatch[1]}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function LessonsPage() {
  return (
    <article className="mx-auto max-w-4xl px-6 py-8 space-y-10">
      <header className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <Link href="/about" className="hover:text-foreground transition-colors">
            About
          </Link>{" "}
          / Lessons
        </p>
        <h1 className="font-display text-4xl tracking-tight text-brand-deep-navy">Lessons</h1>
        <p className="text-lg text-muted-foreground">
          What the actual engineering journey looked like — things that broke, things that
          surprised, things that took longer than expected. Each entry has the same shape: what
          happened, how I handled it, what it taught me. The platform exists and works; this is
          how it got there.
        </p>
      </header>

      <nav className="rounded-lg border border-border bg-card p-5">
        <p className="text-sm font-medium mb-3">Lessons</p>
        <ul className="space-y-2 text-sm">
          {LESSONS.map((lesson) => (
            <li key={lesson.title}>
              <a
                href={`#${slugify(lesson.title)}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {lesson.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-8">
        {LESSONS.map((lesson) => (
          <LessonCard key={lesson.title} lesson={lesson} />
        ))}
      </div>
    </article>
  );
}

function LessonCard({ lesson }: { lesson: LessonEntry }) {
  return (
    <section
      className="rounded-lg border border-border bg-card p-6 space-y-5"
      id={slugify(lesson.title)}
    >
      <h2 className="text-xl font-semibold tracking-tight">{lesson.title}</h2>
      <LessonField label="What happened" paragraphs={lesson.whatHappened} />
      <LessonField label="How I handled it" paragraphs={lesson.howIHandledIt} />
      <LessonField label="What it taught me" paragraphs={lesson.whatItTaught} />
    </section>
  );
}

function LessonField({ label, paragraphs }: { label: string; paragraphs: string[] }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="space-y-3 text-sm leading-relaxed">
        {paragraphs.map((p, i) => (
          <p key={i}>{renderInline(p)}</p>
        ))}
      </div>
    </div>
  );
}
