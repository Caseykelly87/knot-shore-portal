import Link from "next/link";
import { MermaidDiagram } from "@/components/about/MermaidDiagram";

export const metadata = {
  title: "Portal — Knot Shore Portal",
  description:
    "Architecture overview of the portal: server-component data flow, URL-synced state, offline/online routing.",
};

const PORTAL_DATA_FLOW_DIAGRAM = `
graph LR
  B[Browser request] --> SC[Server component<br/>app/page.tsx]
  SC --> F[fetchDashboardData]
  F --> RH[Portal route handler<br/>app/api/store-metrics/route.ts]
  RH --> MODE{API_MODE?}
  MODE -->|offline| FX[fixtures/*.json]
  MODE -->|online| UP[Upstream API]
  FX --> SH[Pure shape transformer]
  UP --> SH
  SH --> SC
  SC --> CC[Client components<br/>charts, KPI cards]
  CC --> HTML[Streamed HTML]
  HTML --> B
`;

export default function PortalPage() {
  return (
    <article className="mx-auto max-w-4xl px-6 py-8 space-y-10">
      <header className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <Link href="/about" className="hover:text-foreground transition-colors">
            About
          </Link>{" "}
          / Portal
        </p>
        <h1 className="font-display text-4xl tracking-tight text-brand-deep-navy">Portal</h1>
        <p className="text-lg text-muted-foreground">
          The Next.js 14 application you&apos;re reading right now. Three primary user-facing
          pages plus this documentation hub.
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
          The portal is the platform&apos;s user-facing surface. Stakeholders interact with the
          data here: a daily dashboard at <code className="bg-muted px-1 rounded">/</code>, a
          per-store drilldown at <code className="bg-muted px-1 rounded">/stores/[id]</code>,
          an exception triage interface at{" "}
          <code className="bg-muted px-1 rounded">/exceptions</code>. Plus this{" "}
          <code className="bg-muted px-1 rounded">/about</code> hub for architectural
          documentation.
        </p>
        <p>
          The portal can run in offline mode (against bundled JSON fixtures) or online mode
          (against an upstream API). Both modes serve the same dashboards with the same shape;
          neither is a degraded fallback. A clone-and-run demo against fixtures looks the same
          as a live deployment against an API. The public Vercel deployment runs offline mode
          by default — see{" "}
          <Link
            href="/about/decisions#offline-mode-as-the-public-deploy-default"
            className="underline hover:text-foreground"
          >
            Offline mode as the public-deploy default
          </Link>{" "}
          for why a public reviewer should not depend on a live API being up.
        </p>
      </section>

      <section className="space-y-4" id="who">
        <h2 className="text-2xl font-semibold tracking-tight">Who would use this and how</h2>
        <p>
          The portal is designed for a small set of operator workflows. The shape of the UI
          serves these workflows specifically rather than building features no specific user
          would ask for.
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li>
            <strong>A store manager</strong> checks yesterday&apos;s exceptions for their
            store — a focused view filtered to one store, sorted by severity, with the
            actual-vs-expected band visible on each flag.
          </li>
          <li>
            <strong>A regional manager</strong> reviews the network-wide exception trend —
            counts by day, severity mix, which stores are over-flagging this week. The
            dashboard&apos;s KPI cards and trend chart serve this read.
          </li>
          <li>
            <strong>An analyst</strong> investigates specific anomalies via the drilldown —
            click an exception, land on the store, look at year-over-year and the department
            mix for context.
          </li>
        </ul>
        <p>
          Several features are deliberately absent — no admin dashboard, no{" "}
          <Link
            href="/about/operations#authentication"
            className="underline hover:text-foreground"
          >
            user management
          </Link>
          , no notification preferences, no{" "}
          <Link
            href="/about/operations#authorization"
            className="underline hover:text-foreground"
          >
            annotations or saved views
          </Link>
          . Those features would be right for a different audience. For this
          triage-and-analysis tool, they are intentional non-features.
        </p>
      </section>

      <section className="space-y-4" id="data-flow">
        <h2 className="text-2xl font-semibold tracking-tight">Data flow</h2>
        <MermaidDiagram source={PORTAL_DATA_FLOW_DIAGRAM} id="portal-data-flow" />
        <p>
          Pages are server components. They fetch data on the server (no client-side waterfalls,
          no auth tokens in the browser, fewer JS bytes shipped). Fetches go through the
          portal&apos;s own <code className="bg-muted px-1 rounded">/api/*</code> route
          handlers, which inspect <code className="bg-muted px-1 rounded">API_MODE</code> and
          either read a JSON fixture or proxy to the upstream API. The fetched data is shaped
          by a pure transformer function and passed as props to client components, which render
          the charts and interactive UI.
        </p>
        <p>
          The data-shaping transformer is always pure (no I/O, no side effects, deterministic
          input-to-output) and always unit-tested. The fetcher is server-only and not
          unit-tested directly; its behavior is verified in integration via the page render.
          The split makes the testable surface as small as possible while exercising the
          interesting logic. See{" "}
          <Link
            href="/about/decisions#charts-as-client-components-pages-as-server-components"
            className="underline hover:text-foreground"
          >
            Charts as client components, pages as server components
          </Link>{" "}
          for the boundary rationale.
        </p>
      </section>

      <section className="space-y-4" id="state">
        <h2 className="text-2xl font-semibold tracking-tight">URL-synced state</h2>
        <p>
          The exceptions page&apos;s filter state lives in URL query parameters, not in
          component state. The mechanism is a custom hook (
          <code className="bg-muted px-1 rounded">lib/use-exceptions-filters.ts</code>) that
          reads from <code className="bg-muted px-1 rounded">useSearchParams</code> on every
          render and writes via <code className="bg-muted px-1 rounded">router.push</code>.
        </p>
        <p>
          The benefits: shareable URLs (a link with{" "}
          <code className="bg-muted px-1 rounded">?severity=warning&amp;store=3</code>{" "}
          reproduces the same view); browser back and forward navigation restore prior filter
          state; page refresh preserves filters. These are small UX details that signal the
          difference between a quick demo and serious frontend work.
        </p>
        <p>
          The cost: more code than <code className="bg-muted px-1 rounded">useState</code>{" "}
          would require, and the consuming page must be wrapped in{" "}
          <code className="bg-muted px-1 rounded">&lt;Suspense&gt;</code> because{" "}
          <code className="bg-muted px-1 rounded">useSearchParams</code> is a client-only API
          in Next.js 14&apos;s App Router. The trade is worth it for the URL-as-state
          behavior. See{" "}
          <Link
            href="/about/decisions#url-synced-filter-state"
            className="underline hover:text-foreground"
          >
            URL-synced filter state
          </Link>{" "}
          for the rejected alternatives.
        </p>
        <p>
          Filter application itself runs client-side after one fetch. The exceptions page
          fetches all 894 anomalies on page load — paginated through the API&apos;s 200-row
          cap in online mode, one fixture in offline mode — then re-filters in memory on every
          filter change. At this dataset size the re-filter is imperceptible; at a million
          rows it would freeze the browser. The decision is explicit that the choice
          won&apos;t scale, and that&apos;s the right call at current scale. See{" "}
          <Link
            href="/about/decisions#client-side-filtering-after-one-fetch"
            className="underline hover:text-foreground"
          >
            Client-side filtering after one fetch
          </Link>
          .
        </p>
      </section>

      <section className="space-y-4" id="loading-and-errors">
        <h2 className="text-2xl font-semibold tracking-tight">Loading and error states</h2>
        <p>
          Server components fetch data on the server, which means the user sees nothing in the
          browser until the first byte of the response arrives. On a fast connection that gap
          is sub-100ms; on a slow connection it can be seconds. A skeleton-loader pattern
          fills the visual gap and signals &quot;data is coming.&quot; Without one, the page
          is blank during the fetch, which is operationally indistinguishable from a broken
          page. The skeletons are not decorative — they&apos;re feedback. Each page has its
          own skeleton component matching the eventual layout (KPI card outlines, chart
          rectangles, table row placeholders) so the visual shape is stable across the
          transition.
        </p>
        <p>
          A global <code className="bg-muted px-1 rounded">app/global-error.tsx</code>{" "}
          boundary catches unhandled exceptions in any route. It logs the actual error to the
          console with a <code className="bg-muted px-1 rounded">useEffect</code>-deferred{" "}
          <code className="bg-muted px-1 rounded">console.error</code>. The boundary
          originally went in to diagnose a Vercel deploy bug that surfaced only in production
          — local dev streamed dynamically and never hit the problematic path. Without the
          boundary, Vercel&apos;s logs showed only an opaque digest. With it, the error
          turned into a specific TypeError that pointed at the bug in seconds. The boundary
          stayed in place after the bug was fixed because that&apos;s exactly when this
          diagnostic is load-bearing — when something else is unexpectedly broken in
          production. Full story:{" "}
          <Link
            href="/about/lessons#the-vercel-deploy-bug-that-became-an-architectural-improvement"
            className="underline hover:text-foreground"
          >
            The Vercel deploy bug that became an architectural improvement
          </Link>
          .
        </p>
        <p>
          One known framework-level rough edge: the{" "}
          <code className="bg-muted px-1 rounded">/stores/[id]</code> page&apos;s{" "}
          <code className="bg-muted px-1 rounded">notFound()</code> call renders the
          not-found UI correctly but returns HTTP 200, not 404. RSC streaming has already
          flushed response headers by the time the validation fails. The UI behavior is
          right; the status code mismatch is documented as an accepted limitation. See{" "}
          <Link
            href="/about/lessons#the-streaming-bug-where-404-returned-200"
            className="underline hover:text-foreground"
          >
            The streaming bug where 404 returned 200
          </Link>
          .
        </p>
      </section>

      <section className="space-y-4" id="next-headers">
        <h2 className="text-2xl font-semibold tracking-tight">The next/headers boundary</h2>
        <p>
          Next.js refuses to bundle modules that import{" "}
          <code className="bg-muted px-1 rounded">next/headers</code> into client components.
          Any data layer that has both a server-only fetcher (which uses{" "}
          <code className="bg-muted px-1 rounded">headers()</code> for auth-token forwarding,
          host detection, etc.) and a pure utility importable from client components (filter
          applicators, shape transformers) must be split.
        </p>
        <p>
          The convention in this repo:{" "}
          <code className="bg-muted px-1 rounded">lib/exceptions-data.ts</code> contains the
          types, the shape transformer, and the filter applicator (importable everywhere);{" "}
          <code className="bg-muted px-1 rounded">lib/exceptions-data-server.ts</code> contains
          the fetcher (server-only). The{" "}
          <code className="bg-muted px-1 rounded">-server.ts</code> suffix is the marker;
          it&apos;s not enforced by tooling but it&apos;s the convention.
        </p>
        <p>
          This split was the second design, not the first. The discovery story —{" "}
          <Link
            href="/about/lessons#the-next-headers-error-that-revealed-the-server-client-boundary"
            className="underline hover:text-foreground"
          >
            The next/headers error that revealed the server/client boundary
          </Link>{" "}
          — covers why the framework needs this partition at bundle time rather than runtime,
          and why the error message reads as a runtime mystery until that lands. The decision
          itself is documented at{" "}
          <Link
            href="/about/decisions#module-split-for-next-headers-boundary"
            className="underline hover:text-foreground"
          >
            Module split for next/headers boundary
          </Link>
          .
        </p>
      </section>

      <section className="space-y-4" id="code-organization">
        <h2 className="text-2xl font-semibold tracking-tight">Code organization</h2>
        <p>
          The Next.js App Router structure under{" "}
          <code className="bg-muted px-1 rounded">app/</code>: route segments are server
          components by default; client islands are explicitly marked.{" "}
          <code className="bg-muted px-1 rounded">app/api/*/route.ts</code> contains the
          portal-side route handlers that switch between offline (direct fixture import) and
          online (upstream proxy) based on{" "}
          <code className="bg-muted px-1 rounded">API_MODE</code>.
        </p>
        <p>
          The per-page data layer lives under{" "}
          <code className="bg-muted px-1 rounded">lib/</code>: a pure shape transformer (types,
          filters, mapping; importable from anywhere) plus a server-only fetcher (the{" "}
          <code className="bg-muted px-1 rounded">-server.ts</code> file with{" "}
          <code className="bg-muted px-1 rounded">headers()</code> imports). The shape
          transformers are the unit-test surface; the fetchers are exercised in integration.
        </p>
        <p>
          Cross-route infrastructure also lives in{" "}
          <code className="bg-muted px-1 rounded">lib/</code>: a pino logger bound to the
          incoming <code className="bg-muted px-1 rounded">X-Request-ID</code>, a prom-client
          custom Registry cached on{" "}
          <code className="bg-muted px-1 rounded">globalThis.__portalMetrics</code> (because
          each route handler is its own webpack chunk; see{" "}
          <Link
            href="/about/lessons#the-prometheus-metrics-that-vanished-between-routes"
            className="underline hover:text-foreground"
          >
            The Prometheus metrics that vanished between routes
          </Link>
          ), and the mode-resolution helper that the route handlers branch on.
        </p>
        <p>
          UI components under <code className="bg-muted px-1 rounded">components/</code> are
          grouped by feature (dashboard, store-drilldown, exceptions, about) with shadcn
          primitives under <code className="bg-muted px-1 rounded">components/ui/</code>. The
          department list is hardcoded as a TypeScript constant in{" "}
          <code className="bg-muted px-1 rounded">lib/dim-departments.ts</code> rather than
          fetched through the API — see{" "}
          <Link
            href="/about/decisions#department-names-embedded-portal-side"
            className="underline hover:text-foreground"
          >
            Department names embedded portal-side
          </Link>{" "}
          for why 10 strings of stable reference data don&apos;t earn an API round-trip.
        </p>
      </section>

      <section className="space-y-4" id="charts">
        <h2 className="text-2xl font-semibold tracking-tight">Charts</h2>
        <p>
          Recharts, pinned to <code className="bg-muted px-1 rounded">^2.13.0</code>. The pin
          is load-bearing, not housekeeping. Recharts v3 changed several core component APIs
          (<code className="bg-muted px-1 rounded">LineChart</code> children, tooltip shape);
          upgrading would require rewriting every chart for no visual benefit. The chart
          components are also deliberately not unit-tested — recharts internals are too
          fragile to assert against across versions — so visual review is the only safety
          net. That makes the version pin part of the test strategy, not separate from it. An
          afternoon was lost discovering this:{" "}
          <Link
            href="/about/lessons#the-recharts-v3-release-that-broke-everything-for-an-afternoon"
            className="underline hover:text-foreground"
          >
            The recharts v3 release that broke everything for an afternoon
          </Link>
          . Decision write-up:{" "}
          <Link
            href="/about/decisions#recharts-pinned-to-v2"
            className="underline hover:text-foreground"
          >
            Recharts pinned to v2
          </Link>
          .
        </p>
        <p>
          Chart components are always client components (use{" "}
          <code className="bg-muted px-1 rounded">&quot;use client&quot;</code> at the top)
          because recharts uses browser APIs. Data is shaped server-side and passed as props;
          the client component is responsible for rendering only.
        </p>
        <p>
          Theme tokens are used throughout: chart strokes reference{" "}
          <code className="bg-muted px-1 rounded">hsl(var(--primary))</code>, axis labels use{" "}
          <code className="bg-muted px-1 rounded">
            stroke=&quot;hsl(var(--muted-foreground))&quot;
          </code>
          , tooltip backgrounds use{" "}
          <code className="bg-muted px-1 rounded">hsl(var(--popover))</code>. Color choices
          that carry meaning (severity dots, trade-area badges) use semantic colors directly
          because their meaning shouldn&apos;t shift with the theme.
        </p>
      </section>

      <section className="space-y-4" id="engineering-deferred">
        <h2 className="text-2xl font-semibold tracking-tight">Engineering items deferred</h2>
        <p>
          A handful of small items surfaced during the most recent code review and sit below
          the line because each is genuinely small. None of them changes behavior the user
          sees; documenting them keeps the picture accurate for a future reader.
        </p>
        <ul className="list-disc list-outside ml-5 space-y-3 text-sm">
          <li>
            <strong>
              <code className="bg-muted px-1 rounded">lib/api-mode.ts</code> comment is out of
              step with its body.
            </strong>{" "}
            The header comment claims the mode is read once at module load; the implementation
            reads <code className="bg-muted px-1 rounded">process.env.API_MODE</code> on every
            call. Either cache the value at module-load time (matches the comment, costs
            nothing) or rewrite the comment to match the call-time read. Trivial either way.
          </li>
          <li>
            <strong>
              <code className="bg-muted px-1 rounded">scripts/capture-fixtures.ts</code> assumes
              a JSON body on every response.
            </strong>{" "}
            The script deliberately lets a 503 status through to surface upstream issues
            clearly, then calls <code className="bg-muted px-1 rounded">.json()</code> on the
            response — which would throw without a useful message if the upstream returned 503
            with an HTML body. A defensive content-type check before the JSON parse would print
            the raw body for diagnosis instead.
          </li>
          <li>
            <strong>
              <code className="bg-muted px-1 rounded">pino-pretty</code> is loaded via{" "}
              <code className="bg-muted px-1 rounded">require()</code> with an inline
              eslint-disable.
            </strong>{" "}
            The pattern is correct for a dev-only transport that should not be bundled into
            production, but it leaves an inline disable at the top of the logger module.
            Isolating the <code className="bg-muted px-1 rounded">require()</code> in a thin{" "}
            <code className="bg-muted px-1 rounded">logger-pretty-transport.ts</code> module
            would push the disable to a single file the rest of the code-base does not see.
            Cosmetic, but it cleans up the logger&apos;s top-of-file.
          </li>
          <li>
            <strong>
              <code className="bg-muted px-1 rounded">dim-stores</code> fetches duplicated
              across three data modules.
            </strong>{" "}
            <code className="bg-muted px-1 rounded">lib/store-data.ts</code>,{" "}
            <code className="bg-muted px-1 rounded">lib/dashboard-data.ts</code>, and{" "}
            <code className="bg-muted px-1 rounded">lib/exceptions-data-server.ts</code> each
            contain a small inline fetch for{" "}
            <code className="bg-muted px-1 rounded">/api/dim-stores</code>. Three copies is the
            rule-of-three threshold called out in{" "}
            <Link
              href="/about/lessons#rule-of-three-caught-late"
              className="underline hover:text-foreground"
            >
              Rule of three caught late
            </Link>
            ; the judgment call here is that the three copies are short enough and divergent
            enough in surrounding usage that a fourth callsite is the right trigger for
            extraction, not the third. If a fourth appears, it gets folded into a shared{" "}
            <code className="bg-muted px-1 rounded">fetchJson&lt;T&gt;</code> helper alongside
            the existing proxy-route and pagination extractions.
          </li>
        </ul>
      </section>

      <section className="space-y-4" id="testing">
        <h2 className="text-2xl font-semibold tracking-tight">Testing</h2>
        <p>
          The portal has 153 tests via Vitest. Coverage emphasizes the pure shape transformers
          (each <code className="bg-muted px-1 rounded">lib/*-data.ts</code> module&apos;s
          transformer has a dedicated test file with edge-case fixtures). The presentational
          components — charts, headers, KPI cards, the exception table — are not unit tested;
          rendering correctness is verified by inspecting the page in a browser.
        </p>
        <p>
          The split is deliberate. Unit-testing recharts components via Vitest is fragile (SVG
          internals, layout-dependent assertions); the cost outweighs the benefit. Pure logic
          gets dense unit coverage; rendering gets visual review.
        </p>
      </section>
    </article>
  );
}
