import Link from "next/link";
import { fetchDetectionQuality } from "@/lib/detection-quality-data";
import { formatCount, formatPercent } from "@/lib/formatters";
import type { DetectionQualityAnomalyTypeStats } from "@/lib/types";

export const metadata = {
  title: "Detection quality — Knot Shore Portal",
  description:
    "Recall, false-positive rate, and the phase 2 contract verdict for the detection layer measured against the sim engine's ground-truth anomaly log.",
};

// Rendered on every request so the verdict reflects the latest
// detection_quality.json the API is serving (live or bundled).
export const dynamic = "force-dynamic";

export default async function DetectionQualityPage() {
  const data = await fetchDetectionQuality();

  const sortedTypes = Object.entries(data.by_anomaly_type).sort(
    ([a], [b]) => a.localeCompare(b),
  );

  return (
    <article className="mx-auto max-w-4xl px-6 py-8 space-y-10">
      <header className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <Link href="/about" className="hover:text-foreground transition-colors">
            About
          </Link>{" "}
          / Detection quality
        </p>
        <p className="text-sm text-muted-foreground">
          <a
            href="https://github.com/Caseykelly87/economic-data-etl/blob/main/scripts/evaluate_detection.py"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            View source on GitHub →
          </a>
        </p>
        <h1 className="font-display text-4xl tracking-tight text-brand-deep-navy">
          Detection quality
        </h1>
        <p className="text-lg text-muted-foreground">
          How well the detection layer matches the sim engine&apos;s
          ground-truth anomaly log — measured globally, by anomaly type,
          and against the platform&apos;s phase 2 contract.
        </p>
      </header>

      <VerdictBanner data={data} />

      <section className="space-y-4" id="contract">
        <h2 className="text-2xl font-semibold tracking-tight">The contract</h2>
        <p>
          Phase 2 requires <code className="bg-muted px-1 rounded">global_recall ≥ {data.contract.global_recall_threshold}</code>{" "}
          AND <code className="bg-muted px-1 rounded">fpr ≤ {data.contract.fpr_threshold}</code>.
          The thresholds were set during the platform&apos;s design phase as
          targets the static-band detection rules should clear against
          deterministically injected anomalies, not as industry standards.
          The reasoning behind 0.35/0.10 specifically — including why the
          bar wasn&apos;t set tighter — is recorded in the{" "}
          <Link
            href="/about/decisions#detection-contract-thresholds"
            className="underline hover:text-foreground"
          >
            detection-contract-thresholds decision
          </Link>
          . They represent &quot;the detector is doing its job&quot; for this
          synthetic dataset, not a universal recall benchmark.
        </p>
      </section>

      <section className="space-y-4" id="global">
        <h2 className="text-2xl font-semibold tracking-tight">Global metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricCard
            label="Recall"
            value={formatPercent(data.global.recall)}
            detail={`${formatCount(data.global.matched_pairs)} / ${formatCount(data.global.injected_pairs)} injected pairs matched`}
          />
          <MetricCard
            label="False-positive rate"
            value={formatPercent(data.false_positive_rate)}
            detail={`${formatCount(data.false_positives)} / ${formatCount(data.negative_universe)} negative (date, store) pairs flagged`}
          />
          <MetricCard
            label="Flag rate"
            value={formatPercent(data.flag_rate)}
            detail={`${formatCount(data.total_flags)} flags across ${formatCount(data.total_metric_rows)} store-day rows`}
          />
          <MetricCard
            label="Negative universe"
            value={formatCount(data.negative_universe)}
            detail="store-day pairs with no injected anomaly"
          />
        </div>
      </section>

      <section className="space-y-4" id="by-type">
        <h2 className="text-2xl font-semibold tracking-tight">Per-anomaly-type recall</h2>
        <p className="text-sm text-muted-foreground">
          Recall computed independently for each anomaly type the sim
          engine injects. Detection rules that target a specific signal
          (duplicate rows, missing-department coverage) score near 1.0;
          rules that look for distributional outliers (margin, integrity
          drift) are the ones that drag the global number down.
        </p>
        <AnomalyTypeTable entries={sortedTypes} />
      </section>

      <section className="space-y-4" id="boundary">
        <h2 className="text-2xl font-semibold tracking-tight">
          How the numbers are produced
        </h2>
        <p>
          The measurement script that produces these numbers —{" "}
          <code className="bg-muted px-1 rounded">scripts/evaluate_detection.py</code>{" "}
          in the ETL repo — is isolated from the detection layer by a
          social contract. It is the only file in the platform permitted
          to read{" "}
          <code className="bg-muted px-1 rounded">anomaly_log.csv</code>,
          the sim engine&apos;s ground-truth log of every injected
          anomaly. The detection layer in{" "}
          <code className="bg-muted px-1 rounded">src/detect_rules.py</code>{" "}
          operates purely on operational data — the same store-day and
          department-day parquets the API serves — and has no awareness
          that the ground-truth labels exist.
        </p>
        <p>
          The boundary is named rather than mechanically enforced: nothing
          in CI grep-checks the imports. The script lives in{" "}
          <code className="bg-muted px-1 rounded">scripts/</code> rather
          than{" "}
          <code className="bg-muted px-1 rounded">src/</code>{" "}
          specifically so the directory structure makes the violation
          visible the moment someone considers it. The full reasoning,
          including the temptation that named it, lives on the{" "}
          <Link
            href="/about/sim-engine#anomaly-log-boundary"
            className="underline hover:text-foreground"
          >
            sim-engine page
          </Link>
          .
        </p>
        <p>
          The artifact rendered above is{" "}
          <code className="bg-muted px-1 rounded">detection_quality.json</code>,
          written alongside the four canonical parquets by the ETL&apos;s{" "}
          <code className="bg-muted px-1 rounded">scripts/build_canonical_fixtures.py</code>{" "}
          and served byte-identical by the API at{" "}
          <code className="bg-muted px-1 rounded">/insights/detection-quality</code>.
          Whatever the verdict reads, it is committed honestly — the
          same artifact downstream consumers (this page included) read in
          both passing and failing states. It currently passes.
        </p>
      </section>
    </article>
  );
}

function VerdictBanner({
  data,
}: {
  data: {
    contract: { passes: boolean; reasons: string[] };
    global: { recall: number };
    false_positive_rate: number;
  };
}) {
  const passes = data.contract.passes;
  const containerClasses = passes
    ? "border-emerald-500/50 bg-emerald-500/10"
    : "border-amber-500/60 bg-amber-500/10";
  const labelClasses = passes
    ? "text-emerald-700 dark:text-emerald-400"
    : "text-amber-700 dark:text-amber-400";
  return (
    <section
      className={`rounded-lg border-2 p-6 space-y-3 ${containerClasses}`}
      data-testid="verdict-banner"
      data-passes={passes ? "true" : "false"}
    >
      <p className={`text-xs uppercase tracking-wider font-semibold ${labelClasses}`}>
        Phase 2 contract verdict
      </p>
      <p className="text-3xl font-display font-semibold">
        {passes ? "PASS" : "FAIL"}
      </p>
      <p className="text-sm text-muted-foreground">
        Recall {formatPercent(data.global.recall)} ·
        FPR {formatPercent(data.false_positive_rate)}
      </p>
      {!passes && data.contract.reasons.length > 0 && (
        <ul className="text-sm space-y-1" data-testid="verdict-reasons">
          {data.contract.reasons.map((reason) => (
            <li key={reason} className="text-foreground">
              · {reason}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-2xl font-display font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function AnomalyTypeTable({
  entries,
}: {
  entries: Array<[string, DetectionQualityAnomalyTypeStats]>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid="by-type-table">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Anomaly type</th>
            <th className="py-2 px-4 font-medium text-right">Injected</th>
            <th className="py-2 px-4 font-medium text-right">Matched</th>
            <th className="py-2 pl-4 font-medium text-right">Recall</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([type, stats]) => (
            <tr key={type} className="border-b border-border/50">
              <td className="py-2 pr-4 font-mono">{type}</td>
              <td className="py-2 px-4 text-right">{formatCount(stats.injected)}</td>
              <td className="py-2 px-4 text-right">{formatCount(stats.matched)}</td>
              <td className="py-2 pl-4 text-right">{formatPercent(stats.recall)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
