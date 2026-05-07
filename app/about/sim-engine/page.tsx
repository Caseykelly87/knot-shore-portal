import Link from "next/link";
import { MermaidDiagram } from "@/components/about/MermaidDiagram";

export const metadata = {
  title: "Sim engine — Knot Shore Portal",
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
          / Sim engine
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Sim engine</h1>
        <p className="text-lg text-muted-foreground">
          The synthetic data generator for the platform. Produces deterministic store and
          department-level retail data with injected anomalies and ground-truth labels.
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
          The ground-truth log is the platform&apos;s detection-quality reference. No code in any
          repo&apos;s <code className="bg-muted px-1 rounded">src/</code> or{" "}
          <code className="bg-muted px-1 rounded">tests/</code> reads it. Only the ETL
          repo&apos;s <code className="bg-muted px-1 rounded">scripts/evaluate_detection.py</code>{" "}
          may read it, and only for measuring the static-band rules&apos; recall and false-
          positive rate against the truth.
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
          This property is what makes the platform&apos;s paired-year canonical possible. The
          ETL repo&apos;s 2024-07-01 row would have been the same byte sequence whether it was
          produced by{" "}
          <code className="bg-muted px-1 rounded">cmd_run --date 2025-07-01</code> (which
          generates t-365 paired data) or{" "}
          <code className="bg-muted px-1 rounded">
            cmd_backfill --start-date 2024-07-01 --days 184
          </code>
          . The seed-from-date mechanism is the architectural invariant that makes paired-year
          generation safe.
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

      <section className="space-y-4" id="testing">
        <h2 className="text-2xl font-semibold tracking-tight">Testing</h2>
        <p>
          The sim engine has 122 tests. Coverage emphasizes determinism and the stage-pipeline
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
      </section>
    </article>
  );
}
