import Link from "next/link";
import { MermaidDiagram } from "@/components/about/MermaidDiagram";

export const metadata = {
  title: "ETL — Knot Shore Portal",
  description:
    "Architecture overview of the ETL: source-adapter separation, canonical fixtures, detection rules.",
};

const ETL_FLOW_DIAGRAM = `
graph LR
  subgraph Source
    SE[Simulation engine output<br/>daily/YYYY/MM/DD/]
  end

  subgraph Adapter["src/sim_ingest.py"]
    A1[load_store_summaries]
    A2[load_department_sales]
    A3[load_dim_stores]
    A1 --> SR[Typed records]
    A2 --> SR
    A3 --> SR
  end

  subgraph Transform["src/sim_transform.py"]
    SR --> T1[build_store_daily_metrics]
    SR --> T2[build_department_daily_metrics]
  end

  subgraph CLI["src/sim_cli.py"]
    T1 --> P1[store_daily_metrics.parquet]
    T2 --> P2[department_daily_metrics.parquet]
    A3 --> P3[dim_stores.parquet]
  end

  subgraph Detect["src/detect_cli.py"]
    P1 --> D1[Apply rules]
    D1 --> P4[anomaly_flags.parquet]
  end

  SE --> A1
  SE --> A2
  SE --> A3

  P1 --> CAN[data/processed/canonical/]
  P2 --> CAN
  P3 --> CAN
  P4 --> CAN
`;

export default function EtlPage() {
  return (
    <article className="mx-auto max-w-4xl px-6 py-8 space-y-10">
      <header className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <Link href="/about" className="hover:text-foreground transition-colors">
            About
          </Link>{" "}
          / ETL
        </p>
        <p className="text-sm text-muted-foreground">
          <a
            href="https://github.com/Caseykelly87/economic-data-etl"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            View source on GitHub →
          </a>
        </p>
        <h1 className="font-display text-4xl tracking-tight text-brand-deep-navy">ETL</h1>
        <p className="text-lg text-muted-foreground">
          The ingestion and detection pipeline. Reads sim engine output, validates schemas,
          applies static-band detection rules, and writes the canonical parquet artifacts that
          downstream layers consume.
        </p>
        <p className="text-sm text-muted-foreground">
          For the reasoning behind the choices this layer relies on, see the{" "}
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
          The ETL repo is the platform&apos;s data-shaping layer. It reads CSV files produced by
          the sim engine, validates that the data is well-formed, transforms it into canonical
          DataFrames, and writes parquet artifacts that become the API repo&apos;s fixture
          inputs and the basis for everything downstream.
        </p>
        <p>
          The repo houses two pipelines that share infrastructure but stay logically separate.
          The <strong>grocery pipeline</strong> ingests the sim engine&apos;s CSV output,
          shapes it into canonical parquets, and runs the static-band detection rules. The{" "}
          <strong>macro pipeline</strong> extracts series from FRED, BLS, and ERS and upserts
          them into Postgres. The two share configuration patterns, the structlog configurator,
          exception types, and CI; they don&apos;t share data models or deployment cadence. A
          regeneration of the grocery canonical doesn&apos;t touch the macro tables; a fresh
          macro extract doesn&apos;t touch the canonical parquets. Same repo, separate runtimes
          — chosen because the infrastructure overlap was real and splitting them would have
          duplicated that infrastructure for negligible architectural benefit.
        </p>
        <p>
          The grocery side is what feeds the dashboards in this portal. The canonical window is
          the two full calendar years 2024-01-01 through 2025-12-31 — 731 days, since 2024 is a
          leap year. The earlier half-year window&apos;s default was itself the subject of an
          off-by-one documentation bug; see{" "}
          <Link
            href="/about/lessons#the-off-by-one-in-the-canonical-backfill-default"
            className="underline hover:text-foreground"
          >
            The off-by-one in the canonical backfill default
          </Link>
          .
        </p>
      </section>

      <section className="space-y-4" id="adapter-transform">
        <h2 className="text-2xl font-semibold tracking-tight">
          Source-adapter / transform separation
        </h2>
        <p>
          The ETL&apos;s grocery ingestion is organized around a strict separation between
          source-format-aware code and source-format-agnostic transform code.
        </p>
        <p>
          <code className="bg-muted px-1 rounded">sim_ingest.py</code> owns all knowledge of the
          sim engine&apos;s output format — CSV column names, type coercion rules, the directory
          walk pattern, the typed records that are yielded for each row. Its public functions —{" "}
          <code className="bg-muted px-1 rounded">load_store_summaries</code>,{" "}
          <code className="bg-muted px-1 rounded">load_department_sales</code>,{" "}
          <code className="bg-muted px-1 rounded">load_dim_stores</code> — are the boundary at
          which the platform stops caring about CSV.
        </p>
        <p>
          <code className="bg-muted px-1 rounded">sim_transform.py</code> doesn&apos;t import
          anything that knows about CSV. Its functions take typed records and produce DataFrames
          with deterministic sort orders. If the sim engine ever changed its output format — to
          JSON, to a database, to streaming — only{" "}
          <code className="bg-muted px-1 rounded">sim_ingest.py</code> would need to change.
        </p>
        <p>
          This separation is the basic discipline of pipeline engineering. It looks like
          duplication on small examples; it pays back when the source format changes or when a
          new source needs to feed into the same transforms.
        </p>
      </section>

      <section className="space-y-4" id="canonical-flow">
        <h2 className="text-2xl font-semibold tracking-tight">The canonical fixture flow</h2>
        <MermaidDiagram source={ETL_FLOW_DIAGRAM} id="etl-flow" />
        <p>
          The diagram traces the data&apos;s path through the ETL. The sim engine&apos;s CSV
          output enters at the left; four parquet artifacts emerge at the right. Those four
          artifacts together are the <em>canonical</em> — committed to the repo at{" "}
          <code className="bg-muted px-1 rounded">data/processed/canonical/</code>, byte-
          identically copied into the API repo&apos;s{" "}
          <code className="bg-muted px-1 rounded">app/fixtures/</code>, and the source for the
          portal&apos;s captured JSON snapshots.
        </p>
        <p>The canonical artifacts:</p>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>
            <code className="bg-muted px-1 rounded">store_daily_metrics.parquet</code> — 5,848
            rows. 8 stores × 731 days (the full calendar years 2024 and 2025). Per store-day:
            total sales, transactions, basket size, labor cost percentage.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">department_daily_metrics.parquet</code> —
            58,424 rows. ~8 stores × 10 departments × 731 days, less zero-filtered cells. Per
            store-day-department: net sales, transactions, units, gross margin percentage.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">anomaly_flags.parquet</code> — 343 rows. Each
            row is a flagged store-day with the rule that fired, the actual value, the expected
            band, and a severity level. The flags spread across several rule kinds that write to
            the same schema: the{" "}
            <code className="bg-muted px-1 rounded">department_reconciliation</code>{" "}
            structural rule contributes 141 over the department grain (each store-day&apos;s
            department net_sales summed against the store total), the{" "}
            <code className="bg-muted px-1 rounded">department_coverage</code>{" "}
            structural-integrity rule 110, the{" "}
            <code className="bg-muted px-1 rounded">gross_margin_band</code> per-department margin
            rule 48, the{" "}
            <code className="bg-muted px-1 rounded">transactions_band</code> statistical rule 22
            over the store-day grain, the{" "}
            <code className="bg-muted px-1 rounded">revenue_zscore_28d</code> rolling-baseline
            rule 20, and{" "}
            <code className="bg-muted px-1 rounded">yoy_comp</code> 2.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">dim_stores.parquet</code> — 8 rows of store
            reference data: store name, address, city, ZIP, county FIPS, trade-area profile,
            sqft, open date.
          </li>
        </ul>
      </section>

      <section className="space-y-4" id="reproducibility">
        <h2 className="text-2xl font-semibold tracking-tight">Byte-identical regeneration</h2>
        <p>
          The{" "}
          <Link
            href="/about/operations#a-workflow-for-canonical-regeneration"
            className="underline hover:text-foreground"
          >
            canonical regeneration workflow
          </Link>
          , run twice from a clean clone, produces byte-identical parquet files. Same SHA-256,
          same row count, same column ordering, same page boundaries. The four canonical artifacts can be compared with{" "}
          <code className="bg-muted px-1 rounded">cmp</code> after a fresh run and the
          comparison returns no differences. This is the property that lets the same four
          files live byte-identically in the API repo&apos;s{" "}
          <code className="bg-muted px-1 rounded">app/fixtures/</code> directory — copy them
          across, verify with <code className="bg-muted px-1 rounded">cmp</code>, and trust
          that &quot;the canonical&quot; means the same thing in both repos.
        </p>
        <p>This requires three properties to hold together:</p>
        <ul className="list-disc list-inside text-sm space-y-2">
          <li>
            <strong>Deterministic seeding upstream.</strong> The sim engine&apos;s per-date
            seeding produces byte-identical CSV output for the same{" "}
            <code className="bg-muted px-1 rounded">(global_seed, date)</code>. Without that,
            nothing downstream can be deterministic.
          </li>
          <li>
            <strong>Deterministic transformation.</strong> The ETL transforms operate on typed
            in-memory records with explicit sort orders. No time-dependent operations, no
            system-clock reads, no hash-set-based deduplication (which would have
            insertion-order-dependent results). When a transform needs a sort, it sorts on an
            explicit key.
          </li>
          <li>
            <strong>Deterministic serialization.</strong> Parquet writes pin column order,
            compression codec, and row-group size. The same DataFrame written twice produces
            the same byte sequence — which is what makes &quot;byte-identical&quot; verifiable
            rather than aspirational.
          </li>
        </ul>
        <p>
          The discipline pays back at the cross-repo boundary. The four parquets exist
          byte-identically in the ETL repo&apos;s{" "}
          <code className="bg-muted px-1 rounded">data/processed/canonical/</code> and the API
          repo&apos;s <code className="bg-muted px-1 rounded">app/fixtures/</code>; an
          unintentional drift would show up as a binary diff in a PR. See{" "}
          <Link
            href="/about/decisions#byte-identical-fixtures-across-repos"
            className="underline hover:text-foreground"
          >
            Byte-identical fixtures across repos
          </Link>{" "}
          for the full rationale and the honest note on the highest-value automation that was
          skipped.
        </p>
      </section>

      <section className="space-y-4" id="detection">
        <h2 className="text-2xl font-semibold tracking-tight">Detection rules</h2>
        <p>
          Anomaly detection is heuristic, by design — five static-band rules over store-day
          metrics, three department-grain rules (row-count coverage, per-department margin, and
          cross-grain reconciliation against the store total), and one rolling-baseline rule
          that learns a per-store expectation. All in{" "}
          <code className="bg-muted px-1 rounded">detect_rules.py</code> with thresholds
          declared in <code className="bg-muted px-1 rounded">rules.yaml</code>. Not ML. Not a
          fitted model. The CLI{" "}
          <code className="bg-muted px-1 rounded">detect_cli.py</code> applies the rules to the
          canonical store-day and department-day parquets and writes a unified{" "}
          <code className="bg-muted px-1 rounded">anomaly_flags.parquet</code>.
        </p>
        <p>
          The five band rules: revenue band (±60% of the store&apos;s base daily revenue),
          labor-cost-pct band (±5 percentage points), avg-ticket band (±20%), transactions band
          (±45%), and yoy_comp (year-over-year revenue ratio outside [0.55, 1.40]). Each store carries a{" "}
          <code className="bg-muted px-1 rounded">trade_area_profile</code> — suburban-family,
          urban-dense, value-market — and bands are configured per profile. The yoy_comp rule
          fires only where a T-365 baseline exists; otherwise it&apos;s silently skipped. The
          rule that fires, the actual value, the expected band edges, and the severity score
          all land in <code className="bg-muted px-1 rounded">anomaly_flags.parquet</code> so
          downstream consumers can answer the &quot;why was this flagged&quot; question without
          re-running detection.
        </p>
        <p>
          The <code className="bg-muted px-1 rounded">revenue_zscore_28d</code> rule complements
          the static revenue band by learning a per-store expectation. For each store-day it
          computes the 28-day trailing mean and standard deviation of total sales, then flags
          any day with |z| ≥ 2.5; severity buckets at 2.5–3 (info), 3–4 (warning), and ≥ 4
          (critical). It catches gradual-drift cases where a store&apos;s true expected revenue
          has moved away from the static profile center but stays inside the wide static band —
          a class of misses the band rules can&apos;t see by construction. Cold-start dates with
          fewer than 14 days of history are skipped silently, the same way yoy_comp skips
          missing T-365 baselines. On the canonical dataset the rule contributes 20 flags,
          including the platform&apos;s first critical-severity row (store 4, 2024-09-24, |z| ≈
          4.02).
        </p>
        <p>
          Heuristic is the right shape here. The data is synthetic and small: 8 stores, two
          full calendar years of canonical. A fitted model would be measuring &quot;can a
          learned classifier reproduce a learned distribution&quot; rather than &quot;can these
          specific rules catch these specific injections.&quot; Static bands keep the question
          transparent — every flag is auditable in YAML — and they meet the recall ≥ 0.35 and
          false-positive rate ≤ 0.10 detection contract against the sim engine&apos;s ground
          truth. The bands are deliberately wide because they don&apos;t adjust for
          day-of-week or seasonal variance; the YAML notes this directly. Real retail data
          with seasonality would produce massive false-positive rates against bands this wide,
          at which point an empirical-baseline phase is necessary. See{" "}
          <Link
            href="/about/decisions#static-band-rules-over-ml-for-detection"
            className="underline hover:text-foreground"
          >
            Static-band rules over ML for detection
          </Link>{" "}
          for the rejected alternatives and the honest note on ML-as-engineering-theater.
        </p>
        <p>
          The contract itself is verified by a separate evaluation script —{" "}
          <code className="bg-muted px-1 rounded">scripts/evaluate_detection.py</code> — which
          is the only file in the entire platform allowed to read the sim engine&apos;s
          ground-truth log. The evaluation artifact is committed at{" "}
          <code className="bg-muted px-1 rounded">
            data/processed/canonical/detection_quality.json
          </code>
          . The boundary between detection code and ground-truth code is a deliberate social
          contract; see{" "}
          <Link
            href="/about/decisions#anomaly-log-boundary"
            className="underline hover:text-foreground"
          >
            Anomaly_log boundary
          </Link>
          .
        </p>
      </section>

      <section className="space-y-4" id="macro">
        <h2 className="text-2xl font-semibold tracking-tight">The macro pipeline</h2>
        <p>
          A separate concern lives in the same repo:{" "}
          <code className="bg-muted px-1 rounded">main.py</code>,{" "}
          <code className="bg-muted px-1 rounded">extract.py</code>,{" "}
          <code className="bg-muted px-1 rounded">transform.py</code>, and{" "}
          <code className="bg-muted px-1 rounded">load.py</code> form an extract-transform-load
          pipeline against three macro-economic data sources: FRED (Federal Reserve Economic
          Data), BLS (Bureau of Labor Statistics), and ERS (USDA Economic Research Service).
        </p>
        <p>
          The macro pipeline reads JSON from the FRED and BLS APIs (httpx with retry/backoff)
          and CSV from the ERS bulk-download endpoint. It normalizes responses into a canonical{" "}
          <code className="bg-muted px-1 rounded">(series_id, date, value, metadata)</code>{" "}
          shape and idempotently upserts to Postgres via SQLAlchemy with parameterized queries.
        </p>
        <p>
          The macro side leans on stdlib{" "}
          <code className="bg-muted px-1 rounded">logging.info(...)</code> calls with{" "}
          <code className="bg-muted px-1 rounded">extra=&#123;...&#125;</code> structured
          fields rather than native structlog idioms. That style requires a bridge — without
          it, the <code className="bg-muted px-1 rounded">extra</code> dict silently
          disappears from the JSON output. The bridge in this repo is{" "}
          <code className="bg-muted px-1 rounded">structlog.stdlib.ExtraAdder()</code>, added
          to the shared processors list in{" "}
          <code className="bg-muted px-1 rounded">observability.py</code>. Story:{" "}
          <Link
            href="/about/lessons#the-structlog-stdlib-bridge-that-nearly-didn-t-work"
            className="underline hover:text-foreground"
          >
            The structlog/stdlib bridge that nearly didn&apos;t work
          </Link>
          .
        </p>
      </section>

      <section className="space-y-4" id="code-organization">
        <h2 className="text-2xl font-semibold tracking-tight">Code organization</h2>
        <p>
          Source under <code className="bg-muted px-1 rounded">src/</code>. Tests under{" "}
          <code className="bg-muted px-1 rounded">tests/</code>. Schema definitions and
          exception classes are shared between the two pipelines. Module responsibilities:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>
            <code className="bg-muted px-1 rounded">sim_ingest.py</code> — source adapter for
            the sim engine&apos;s CSV layout. Walks the date-tree directory structure, validates
            schemas, yields typed records.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">sim_transform.py</code> — source-format-
            agnostic transforms that produce canonical DataFrames.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">sim_cli.py</code> — composes adapter and
            transform; writes the three primary parquet artifacts.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">detect_cli.py</code> +{" "}
            <code className="bg-muted px-1 rounded">detect_rules.py</code> — applies rules from{" "}
            <code className="bg-muted px-1 rounded">rules.yaml</code> to the canonical store-day
            parquet and writes anomaly_flags.parquet.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">schemas.py</code> — column contracts and
            typed records for both pipelines.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">exceptions.py</code> —{" "}
            <code className="bg-muted px-1 rounded">SchemaValidationError</code>{" "}
            (parse/type/referential failures) and{" "}
            <code className="bg-muted px-1 rounded">ReconciliationError</code> (pipeline-level
            mismatches: missing files, empty walks, row count mismatches).
          </li>
          <li>
            <code className="bg-muted px-1 rounded">main.py</code> — macro pipeline orchestrator.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">extract.py</code> — FRED, BLS, ERS clients
            with httpx retry/backoff.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">transform.py</code> — macro response
            normalization.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">load.py</code> — idempotent Postgres upsert.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">observability.py</code> — structlog
            configuration shared between the grocery and macro pipelines.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">scripts/build_canonical_fixtures.py</code> —
            runs sim_cli + detect_cli against a local sim engine output and produces the
            committed canonical artifacts.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">scripts/evaluate_detection.py</code> —
            measures detection recall and FPR against the sim engine&apos;s ground truth. The
            only file in the platform that reads anomaly_log.csv.
          </li>
        </ul>
      </section>

      <section className="space-y-4" id="testing">
        <h2 className="text-2xl font-semibold tracking-tight">Testing</h2>
        <p>
          The ETL has 287 tests. Coverage centers on the boundary contracts: schema validation
          rejects malformed input with descriptive errors, the source adapter and transform are
          isolated from each other (transform tests use synthetic typed records, not CSV
          fixtures), and the canonical fixture builder produces byte-identical output across
          successive runs.
        </p>
        <p>
          Each pipeline has its own happy-path integration test that exercises the full chain
          end-to-end against small synthetic fixtures (3 dates × 8 stores). The detection
          rules have unit tests for each rule&apos;s edge cases, plus the recall/FPR contract
          enforced by{" "}
          <code className="bg-muted px-1 rounded">scripts/evaluate_detection.py</code>.
        </p>
      </section>

      <section className="space-y-4" id="detection-roadmap">
        <h2 className="text-2xl font-semibold tracking-tight">Detection layer forward work</h2>
        <p>
          The detection layer in its current shape — nine rules, a unified schema, eval-script
          ground truth — is the working surface for the canonical window. Several extensions
          have been considered and deferred. Each is shaped here as what it would do, why it
          sits below the current line, and an honest sense of scope.
        </p>
        <ul className="list-disc list-outside ml-5 space-y-3 text-sm">
          <li>
            <strong>Vectorize the static-band rules.</strong> The five band rules currently
            iterate with <code className="bg-muted px-1 rounded">for row in enriched.itertuples()</code>,
            which is fine at canonical scale (5,848 store-day rows) but reads as iterative
            against a code-base whose other hot paths are vectorized. A pandas/numpy rewrite —
            column-wise comparison against the per-profile band bounds, severity assignment via{" "}
            <code className="bg-muted px-1 rounded">np.select</code> — is roughly 80 lines and
            exists more for pandas hygiene than for runtime performance at current scale.
          </li>
          <li>
            <strong>Empirical baselines for the remaining band metrics.</strong> The{" "}
            <code className="bg-muted px-1 rounded">revenue_zscore_28d</code> rule is the first
            instance of the learned-baseline pattern. Extending it to labor_pct, avg_ticket, and
            transactions would replace static thresholds with per-store learned expectations,
            with the static bands staying as fallback for cold-start periods where fewer than 14
            days of history exist. The shape mirrors the revenue rule: 28-day trailing mean and
            stddev per store-metric, |z| ≥ 2.5 fires, severity buckets at 3 and 4.
          </li>
          <li>
            <strong>Multivariate detection via Mahalanobis distance.</strong> Current rules
            evaluate one metric at a time. A multivariate rule would compute the Mahalanobis
            distance of the (revenue, transactions, avg_ticket) triple for each store-day
            against the per-store covariance matrix and flag dates where the joint distribution
            sits outside the expected ellipsoid — catching cases where no single metric is
            outside band but the combination is implausible. Roughly 200 lines; needs at least
            60 days of per-store history to fit covariances stably, so cold-start handling
            mirrors the z-score rule.
          </li>
          <li>
            <strong>Drift detection.</strong> The z-score rule catches per-day point anomalies
            but does not detect when a store&apos;s baseline itself is shifting. A separate
            drift layer would compare a recent rolling window (28 or 56 days) against a
            longer-window expectation (180 days) and flag stores whose mean has moved by more
            than a configured threshold. Operationally this is different work — &quot;the store
            is changing&quot; rather than &quot;this day is anomalous&quot; — and it deserves
            its own rule kind in the schema rather than a tweak to the z-score one.
          </li>
          <li>
            <strong>Forecasting endpoint.</strong> A{" "}
            <code className="bg-muted px-1 rounded">/forecasts</code> route returning 7-day and
            30-day per-store revenue projections, served by ARIMA, Prophet, or a learned model.
            Framed as deferred deliberately: forecasting is a different problem from anomaly
            detection — different objective, different evaluation, different failure modes — and
            bolting it onto the detection layer would muddy both. If it ships, it ships as its
            own concern with its own contract.
          </li>
        </ul>
      </section>
    </article>
  );
}
