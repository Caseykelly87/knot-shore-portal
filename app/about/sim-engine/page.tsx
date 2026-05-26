import Link from "next/link";
import { MermaidDiagram } from "@/components/about/MermaidDiagram";

export const metadata = {
  title: "Simulation engine — Knot Shore Portal",
  description:
    "Architecture overview of the sim engine: determinism, anomaly injection, paired-year generation.",
};

const STAGE_FLOW_DIAGRAM = `
graph LR
  A[CLI invocation<br/>cmd_run / cmd_backfill] --> B[Resolve target dates]
  B --> C[For each date]
  C --> D[generate_day<br/>Stage 1]
  D --> E{realism<br/>enabled?}
  E -->|yes| F[realism.adjust<br/>Stage 2]
  E -->|no| G[Skip realism]
  F --> H[anomalies.inject]
  G --> H
  H --> I[write_daily<br/>Stage 3]
  I --> J[CSV files written<br/>daily/MM/DD/YYYY/]
  C -.-> C
`;

export default function SimEnginePage() {
  return (
    <article className="mx-auto max-w-4xl px-6 py-8 space-y-10">
      <header className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <Link href="/about" className="hover:text-foreground transition-colors">
            About
          </Link>{" "}
          / Simulation engine
        </p>
        <h1 className="font-display text-4xl tracking-tight text-brand-deep-navy">Simulation engine</h1>
        <p className="text-lg text-muted-foreground">
          The synthetic data generator for the platform. Produces deterministic store and
          department-level retail data with injected anomalies and ground-truth labels.
        </p>
        <p className="text-sm text-muted-foreground">
          For the reasoning behind specific choices the sim engine relies on, see the{" "}
          <Link href="/about/decisions" className="underline hover:text-foreground">
            Decisions
          </Link>{" "}
          page; for the bugs and surprises that shaped it, see{" "}
          <Link href="/about/lessons" className="underline hover:text-foreground">
            Lessons
          </Link>
          .
        </p>
      </header>

      <section className="space-y-4" id="role">
        <h2 className="text-2xl font-semibold tracking-tight">Role in the platform</h2>
        <p>
          The sim engine sits at the upstream end of the data pipeline. Its output — a tree of CSV
          files under <code className="bg-muted px-1 rounded">daily/MM/DD/YYYY/</code> — is the
          ETL repo&apos;s only input source for the grocery side of its pipeline. Everything
          downstream (canonical parquets, API responses, portal dashboards) traces back to what
          the sim engine wrote.
        </p>
        <p>
          The sim engine is intentionally standalone. It has no web surface, no database, no
          orchestrator. It runs as a command-line tool, writes CSV files, and exits. Determinism
          is its central engineering property: the same seed and the same date produces
          byte-identical output across runs, machines, and operating systems.
        </p>
      </section>

      <section className="space-y-4" id="stage-flow">
        <h2 className="text-2xl font-semibold tracking-tight">Stage flow within a single day</h2>
        <p>
          For each target date, the sim engine runs a three-stage pipeline. The stages are
          composable but not interchangeable; the order matters.
        </p>
        <MermaidDiagram source={STAGE_FLOW_DIAGRAM} id="sim-engine-stage-flow" />
        <p>
          Stage 1 (<code className="bg-muted px-1 rounded">generate_day</code>) produces the
          baseline store summaries and department sales for the date — the &quot;what would this
          store make on this day under nominal conditions&quot; layer. Stage 2 (
          <code className="bg-muted px-1 rounded">realism.adjust</code>) optionally adds
          variability to make the data feel like real retail: small daily noise, weather effects,
          local promotions. Stage 2 is opt-out via{" "}
          <code className="bg-muted px-1 rounded">--no-realism</code>. Stage 3 (
          <code className="bg-muted px-1 rounded">anomalies.inject</code>) injects a bounded set
          of anomalies — sales spikes or drops, transaction anomalies, labor cost irregularities
          — and records the ground truth in{" "}
          <code className="bg-muted px-1 rounded">anomaly_log.csv</code> alongside the data files.
        </p>
        <p>
          The ground-truth log is the platform&apos;s detection-quality reference. It is
          deliberately quarantined — only one file in the entire platform is permitted to read
          it. See{" "}
          <a href="#anomaly-log-boundary" className="underline hover:text-foreground">
            The anomaly_log boundary
          </a>{" "}
          below for the reasoning and the honest note about how this boundary was named rather
          than enforced.
        </p>
      </section>

      <section className="space-y-4" id="determinism">
        <h2 className="text-2xl font-semibold tracking-tight">Determinism</h2>
        <p>
          The sim engine seeds each generated day with a deterministic function of the global
          seed and the target date:
        </p>
        <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
          <code>{`date_seed = global_seed + target_date.toordinal()
rng = np.random.default_rng(date_seed)`}</code>
        </pre>
        <p>
          The implication: a date&apos;s output depends only on{" "}
          <code className="bg-muted px-1 rounded">(global_seed, date)</code>, not on what came
          before in the run, not on the order of the date list, not on whether realism was
          enabled for an earlier date. Regenerating any single date in isolation produces the
          same data as generating it as part of a larger backfill.
        </p>
        <p>
          The natural alternative is a single global RNG that walks forward in time, advancing
          state through each generated date in order. That approach is shorter to write — one{" "}
          <code className="bg-muted px-1 rounded">np.random.default_rng(global_seed)</code>{" "}
          at the top of the run — but it cascades. Any fix to the generation logic for
          2025-08-15 would change every date generated after it, because the RNG state at
          2025-08-16 would depend on every random draw made on 2025-08-15. Partial regeneration
          becomes impossible. Fixing a bug on one date invalidates every subsequent date in the
          canonical window.
        </p>
        <p>
          Per-date seeding sidesteps the cascade. Anomaly injection and the realism layer take
          the same shape with offset constants —{" "}
          <code className="bg-muted px-1 rounded">date_seed + 1_000_000</code> for injection,{" "}
          <code className="bg-muted px-1 rounded">date_seed + 999_999</code> for realism — so
          their distributions don&apos;t accidentally overlap with the baseline sales RNG.
          Backfilling 2024-07-01 produces byte-identical data whether it&apos;s part of a 2024
          backfill, a 2025 anchor&apos;s T-365 paired generation, or a single-day regeneration.
          The architectural property is that partial regeneration is safe.
        </p>
        <p>
          This is what makes the paired-year canonical possible. The ETL repo&apos;s 2024-07-01
          row would have been the same byte sequence whether it was produced by{" "}
          <code className="bg-muted px-1 rounded">cmd_run --date 2025-07-01</code> (which
          generates T-365 paired data) or{" "}
          <code className="bg-muted px-1 rounded">
            cmd_backfill --start-date 2024-07-01 --days 184
          </code>
          . It is also what makes the byte-identical canonical fixture flow possible across
          repos — a regeneration in the ETL repo produces the same parquet bytes that a fresh
          regeneration on a clean clone would produce. The full rationale, including the
          options that were rejected, lives in{" "}
          <Link
            href="/about/decisions#per-date-deterministic-seeding"
            className="underline hover:text-foreground"
          >
            Per-date deterministic seeding
          </Link>{" "}
          on the Decisions page.
        </p>
      </section>

      <section className="space-y-4" id="anomaly-injection">
        <h2 className="text-2xl font-semibold tracking-tight">Anomaly injection</h2>
        <p>
          Stage 3 injects four anomaly types — sales spikes, sales drops, transaction
          anomalies, and labor-cost irregularities — using static, deterministic rules in{" "}
          <code className="bg-muted px-1 rounded">anomalies.py</code>. Each anomaly type fires
          with a bounded per-store-day probability; the per-day RNG seeded from{" "}
          <code className="bg-muted px-1 rounded">date_seed + 1_000_000</code> selects whether
          and where to fire. Every injection is recorded in{" "}
          <code className="bg-muted px-1 rounded">anomaly_log.csv</code> alongside the data
          files, with the rule that fired, the store-day it landed on, and the magnitude of
          the injection.
        </p>
        <p>
          The choice is deliberately not ML-based. The detection layer downstream — five
          static-band rules over store-day metrics and one structural-integrity rule over
          department-grain metrics, both writing to a shared anomaly schema — needs ground
          truth to measure recall and false-positive rate against. If the ground truth were learned from a distribution rather than
          generated from rules, the eval would be measuring &quot;can a learned classifier
          reproduce a learned distribution&quot; instead of &quot;can these specific rules
          detect these specific injections.&quot; Static rules keep the question transparent:
          every injected anomaly traces to a specific rule, and every detection match traces
          back to the same source.
        </p>
        <p>Two properties matter:</p>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li>
            <strong>Explainability.</strong> Each row in the anomaly log answers what was
            injected, when, where, and by which rule. That&apos;s the ground truth the eval
            script compares against — the basis for the recall and false-positive numbers in
            the detection-quality report.
          </li>
          <li>
            <strong>Reproducibility.</strong> The same{" "}
            <code className="bg-muted px-1 rounded">(global_seed, date)</code> produces the
            same anomaly injections, byte-identically. The eval&apos;s recall and FPR metrics
            are stable across runs, which is what the recall ≥ 0.35 and FPR ≤ 0.10 detection
            contract depends on.
          </li>
        </ul>
        <p>
          The symmetric rationale on the detection side — why the ETL uses static-band rules
          rather than ML for matching — lives in{" "}
          <Link
            href="/about/decisions#static-band-rules-over-ml-for-detection"
            className="underline hover:text-foreground"
          >
            Static-band rules over ML for detection
          </Link>
          .
        </p>
      </section>

      <section className="space-y-4" id="anomaly-log-boundary">
        <h2 className="text-2xl font-semibold tracking-tight">The anomaly_log boundary</h2>
        <p>
          The anomaly log is the platform&apos;s detection-quality ground truth. Exactly one
          file in the entire platform may read it: the ETL repo&apos;s{" "}
          <code className="bg-muted px-1 rounded">scripts/evaluate_detection.py</code>. The ETL
          package itself must remain importable and runnable without the log existing. The
          detection code reads the canonical store-day parquet, not the log. The boundary is
          enforced socially, by file location and naming, not mechanically.
        </p>
        <p>
          The temptation to violate this boundary is real. &quot;Just join the anomaly log into
          the detection output&quot; would make eval trivial — every detection&apos;s
          ground-truth label would be directly available — and would also defeat the entire
          purpose of the eval. A detector that reads the answer key isn&apos;t detecting; it&apos;s
          looking up. The eval script lives in{" "}
          <code className="bg-muted px-1 rounded">scripts/</code> rather than{" "}
          <code className="bg-muted px-1 rounded">src/</code> specifically so the boundary is
          visible in the directory structure: anything in <code className="bg-muted px-1 rounded">src/</code>{" "}
          is part of the platform; anything in <code className="bg-muted px-1 rounded">scripts/</code>{" "}
          is operational tooling that runs outside the platform&apos;s normal execution path.
        </p>
        <p>
          I felt the temptation. The eval script lives where it does specifically so I could
          rationalize &quot;but this is just for measurement&quot; without it leaking into the
          package. The boundary works because it was named and structurally located, not
          because of discipline. Nothing automated enforces the rule — a future contributor
          could violate it and CI would not catch it. If the team grows beyond one engineer or
          the detection rules grow complex enough that the temptation grows with them, a lint
          rule or a CI grep check becomes worth adding. See{" "}
          <Link
            href="/about/decisions#anomaly-log-boundary"
            className="underline hover:text-foreground"
          >
            Anomaly_log boundary
          </Link>{" "}
          for the full decision and what was rejected.
        </p>
      </section>

      <section className="space-y-4" id="commands">
        <h2 className="text-2xl font-semibold tracking-tight">Commands</h2>
        <p>The sim engine has three top-level commands:</p>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li>
            <code className="bg-muted px-1 rounded">cmd_init</code> — generates dimension tables
            (dim_stores, dim_departments, dim_calendar) and the four-year promotion schedule.
            Idempotent: skips files that already exist. Run once per repo clone.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">cmd_run</code> — daily incremental
            generation. Default behavior: generates 8 dates per invocation — the anchor date, the
            6 trailing days, and the same calendar date one year prior (anchor minus 365 days).
            The t-365 mechanism is what enables natural paired-year accumulation when the command
            is invoked daily.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">cmd_backfill</code> — historical range
            generation. Generates a contiguous range of dates with no t-365 paired generation.
            Used for filling explicit windows (the canonical demo window, a specific month for
            testing, a paired prior year that wasn&apos;t generated by daily runs).
          </li>
        </ul>
      </section>

      <section className="space-y-4" id="code-organization">
        <h2 className="text-2xl font-semibold tracking-tight">Code organization</h2>
        <p>
          Source under <code className="bg-muted px-1 rounded">src/knot_shore/</code>. Tests
          under <code className="bg-muted px-1 rounded">tests/</code>. Module responsibilities:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>
            <code className="bg-muted px-1 rounded">cli.py</code> — argument parsing, command
            dispatch, the three command functions, the shared{" "}
            <code className="bg-muted px-1 rounded">_run_pipeline</code> helper
          </li>
          <li>
            <code className="bg-muted px-1 rounded">config.py</code> — store and department
            configurations (8 stores, 10 departments), trade-area-profile parameters, baseline
            revenue values
          </li>
          <li>
            <code className="bg-muted px-1 rounded">sales_generator.py</code> — Stage 1 (baseline
            daily generation) using factors and seeded RNGs
          </li>
          <li>
            <code className="bg-muted px-1 rounded">factors.py</code> — deterministic per-date
            multipliers: seasonality, day-of-week effects, holiday adjustments, trend
          </li>
          <li>
            <code className="bg-muted px-1 rounded">realism.py</code> — Stage 2 (optional realism
            layer) with the <code className="bg-muted px-1 rounded">--no-realism</code> opt-out
            path
          </li>
          <li>
            <code className="bg-muted px-1 rounded">anomalies.py</code> — Stage 3 anomaly
            injection with bounded rates and ground-truth labels
          </li>
          <li>
            <code className="bg-muted px-1 rounded">output.py</code> — Stage 3 CSV writers,
            directory layout (<code className="bg-muted px-1 rounded">daily/MM/DD/YYYY/</code>)
          </li>
          <li>
            <code className="bg-muted px-1 rounded">dimensions.py</code> — dim_stores,
            dim_departments, dim_calendar generators
          </li>
          <li>
            <code className="bg-muted px-1 rounded">promotions.py</code> — promotion schedule
            generation (used as input by{" "}
            <code className="bg-muted px-1 rounded">cmd_init</code>)
          </li>
          <li>
            <code className="bg-muted px-1 rounded">reports.py</code> — per-store human-readable
            reports written by <code className="bg-muted px-1 rounded">cmd_run</code> for the
            anchor date only
          </li>
          <li>
            <code className="bg-muted px-1 rounded">date_resolver.py</code> — backfill date range
            resolution from CLI args
          </li>
          <li>
            <code className="bg-muted px-1 rounded">observability.py</code> — structlog
            configuration shared across CLI commands
          </li>
        </ul>
      </section>

      <section className="space-y-4" id="not-simulated">
        <h2 className="text-2xl font-semibold tracking-tight">
          What the sim engine doesn&apos;t simulate
        </h2>
        <p>
          The scope is deliberately bounded. Several plausible features were considered and
          left out:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li>
            <strong>SKU-level data.</strong> Only department aggregates. SKU-level would
            require storage and UI affordances out of proportion to the audience (regional
            managers, not category buyers).
          </li>
          <li>
            <strong>Supply chain.</strong> No upstream inventory effects, no truck-arrival
            noise, no stockouts. Sales are modeled as direct functions of demand factors, not
            as <code className="bg-muted px-1 rounded">min(demand, inventory)</code>.
          </li>
          <li>
            <strong>Customer demographics.</strong> No per-customer segmentation, no loyalty
            data, no basket-level customer attribution. The unit of analysis is the
            store-day-department.
          </li>
          <li>
            <strong>Real-time POS feeds.</strong> Batch daily-grain only. The decision to
            operate at daily grain is platform-wide, not just sim-engine-specific.
          </li>
          <li>
            <strong>Multi-channel sales.</strong> No online vs. in-store split. All sales flow
            through one channel.
          </li>
          <li>
            <strong>Promotional planning workflows.</strong> Promotions are generated by{" "}
            <code className="bg-muted px-1 rounded">cmd_init</code> and apply to the data; the
            sim engine does not model the workflow of authoring or approving a promo.
          </li>
        </ul>
        <p>
          Each of these would add complexity that doesn&apos;t earn its keep against the
          platform&apos;s stated audience and questions. The scope of what&apos;s modeled is
          the scope of what stakeholder dashboards in this audience class actually need.
        </p>
      </section>

      <section className="space-y-4" id="schema-deferred">
        <h2 className="text-2xl font-semibold tracking-tight">Schema additions deferred</h2>
        <p>
          Two columns sit just outside the current store-day schema:{" "}
          <code className="bg-muted px-1 rounded">labor_hours</code> and{" "}
          <code className="bg-muted px-1 rounded">active_drawers</code>. Both are reasonable
          additions to the sim engine&apos;s daily output and to the ETL&apos;s canonical
          schema; neither is in scope today.
        </p>
        <p>
          <code className="bg-muted px-1 rounded">labor_hours</code> would pair with the
          existing <code className="bg-muted px-1 rounded">labor_cost</code> column. Together
          they make scheduling-vs-actual variance detectable as a new signal: a store whose
          hours track demand while cost overshoots suggests overtime drift; the reverse
          suggests understaffing. The sim engine would generate hours deterministically from a
          per-store staffing model parameterized similarly to the existing trade-area profiles,
          the ETL schema would absorb the new column, and the band-rules layer would gain a
          labor-hours rule that fires alongside the existing labor-cost-pct band.
        </p>
        <p>
          <code className="bg-muted px-1 rounded">active_drawers</code> would carry the count of
          registers open per store-day. Paired with{" "}
          <code className="bg-muted px-1 rounded">transactions</code>, it makes
          lane-utilization patterns visible: low drawers against high transactions points at
          a bottleneck; high drawers against low transactions points at excess capacity. The
          detection layer would gain a structural rule on the ratio, in the same shape as the
          existing department_coverage rule.
        </p>
        <p>
          Both are bounded extensions — schema columns, deterministic generators, one rule each
          — rather than reshapes of the existing data model. They stay deferred because the
          current schema already supports the operational questions the dashboards answer.
          These are second-order capabilities, not first-order ones.
        </p>
      </section>

      <section className="space-y-4" id="testing">
        <h2 className="text-2xl font-semibold tracking-tight">Testing</h2>
        <p>
          The sim engine has 138 tests. Coverage emphasizes determinism and the stage-pipeline
          contracts: a test that asserts byte-identity across two successive runs of the same
          seed is the most important property the suite verifies.
        </p>
        <p>
          The anomaly injection rate is bounded and asserted in tests against a tolerance, which
          protects against accidental drift in the injection mechanism. Determinism tests also
          cover the realism layer&apos;s opt-out path:{" "}
          <code className="bg-muted px-1 rounded">--no-realism</code> must produce the same
          baseline data that the un-flagged run produces before realism touches it.
        </p>
        <p>
          Determinism tests caught one of the platform&apos;s most interesting bugs — a
          cross-platform test failure that turned out to depend on which Python packages were
          installed in CI, not on anything the sim engine did or didn&apos;t do. The fix was
          twelve lines; the diagnosis took longer. Full story:{" "}
          <Link
            href="/about/lessons#the-cross-platform-seeding-test-that-wasn-t-actually-a-seeding-bug"
            className="underline hover:text-foreground"
          >
            The cross-platform seeding test that wasn&apos;t actually a seeding bug
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
