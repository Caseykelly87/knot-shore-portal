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
        <h1 className="text-4xl font-bold tracking-tight">Portal</h1>
        <p className="text-lg text-muted-foreground">
          The Next.js 14 application you&apos;re reading right now. Three primary user-facing
          pages plus this documentation hub.
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
          as a live deployment against an API.
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
          input-to-output) and always unit-tested. The fetcher is server-only and not unit-
          tested directly; its behavior is verified in integration via the page render. The
          split makes the testable surface as small as possible while exercising the
          interesting logic.
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
          <code className="bg-muted px-1 rounded">useSearchParams</code> is a client-only API in
          Next.js 14&apos;s App Router. The trade is worth it for the URL-as-state behavior.
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
      </section>

      <section className="space-y-4" id="code-organization">
        <h2 className="text-2xl font-semibold tracking-tight">Code organization</h2>
        <p>
          The Next.js App Router structure under{" "}
          <code className="bg-muted px-1 rounded">app/</code>; shared utilities under{" "}
          <code className="bg-muted px-1 rounded">lib/</code>; UI components under{" "}
          <code className="bg-muted px-1 rounded">components/</code>:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>
            <code className="bg-muted px-1 rounded">app/page.tsx</code>,{" "}
            <code className="bg-muted px-1 rounded">app/stores/[id]/page.tsx</code>,{" "}
            <code className="bg-muted px-1 rounded">app/exceptions/page.tsx</code> — the three
            primary user-facing pages. All server components.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">app/about/</code> — this documentation hub.
            All server components.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">app/api/*/route.ts</code> — portal-side
            route handlers. Each routes between offline (fixtures) and online (upstream proxy)
            based on <code className="bg-muted px-1 rounded">API_MODE</code>.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">lib/dashboard-data.ts</code>,{" "}
            <code className="bg-muted px-1 rounded">lib/store-data.ts</code>,{" "}
            <code className="bg-muted px-1 rounded">lib/exceptions-data.ts</code> /{" "}
            <code className="bg-muted px-1 rounded">-server.ts</code> — per-page data layer.
            Each is a pure shape transformer plus a server fetcher.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">lib/use-exceptions-filters.ts</code> — the
            URL-synced filter hook.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">lib/api-mode.ts</code> — mode resolution
            and upstream URL construction.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">lib/logger.ts</code> — pino with sync
            streams for Next.js compatibility; bound to incoming X-Request-ID via{" "}
            <code className="bg-muted px-1 rounded">getRequestLogger</code>.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">lib/metrics.ts</code> — prom-client custom
            Registry cached on{" "}
            <code className="bg-muted px-1 rounded">globalThis.__portalMetrics</code> so each
            route handler&apos;s webpack chunk shares the same instance.
          </li>
          <li>
            <code className="bg-muted px-1 rounded">components/dashboard/</code>,{" "}
            <code className="bg-muted px-1 rounded">components/store-drilldown/</code>,{" "}
            <code className="bg-muted px-1 rounded">components/exceptions/</code> — page-
            specific components. Charts use recharts (pinned to v2).
          </li>
          <li>
            <code className="bg-muted px-1 rounded">components/ui/</code> — shadcn primitives
            (Card, Button, Sheet, Select, etc.).
          </li>
          <li>
            <code className="bg-muted px-1 rounded">components/about/MermaidDiagram.tsx</code>{" "}
            — the lazy-CDN-loaded diagram component used on{" "}
            <code className="bg-muted px-1 rounded">/about</code> pages.
          </li>
        </ul>
      </section>

      <section className="space-y-4" id="charts">
        <h2 className="text-2xl font-semibold tracking-tight">Charts</h2>
        <p>
          Recharts, pinned to v2. The pin matters: recharts v3 changed several core component
          APIs (<code className="bg-muted px-1 rounded">LineChart</code> children, tooltip
          shape, etc.); upgrading would require rewriting every chart for no visual benefit.
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

      <section className="space-y-4" id="testing">
        <h2 className="text-2xl font-semibold tracking-tight">Testing</h2>
        <p>
          The portal has 51 tests via Vitest. Coverage emphasizes the pure shape transformers
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
