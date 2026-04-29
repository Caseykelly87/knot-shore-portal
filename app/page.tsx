import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 space-y-8">
      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Knot Shore Portal</h1>
        <p className="text-lg text-slate-600">
          Stakeholder dashboard for the Knot Shore Grocery analytics platform — an 8-store fictional retail chain in the St. Louis metro area.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>About this platform</CardTitle>
          <CardDescription>
            A four-repo data engineering project demonstrating end-to-end pipeline ownership
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-slate-700">
          <p>
            The platform comprises a synthetic data generator (the simulation engine), an ETL pipeline that ingests and validates that data, a FastAPI service that exposes it as JSON, and this portal — the front door rendering dashboards over the resulting datasets.
          </p>
          <p>
            Each layer owns its concerns. The simulation engine is the only place synthetic data is generated. The ETL is the only place anomaly detection runs. The API is the only place data is queryable. The portal is the only place rendering happens. No layer reaches into another&apos;s domain.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What you&apos;re looking at right now</CardTitle>
          <CardDescription>
            Demo mode vs live data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-slate-700">
          <p>
            By default the portal runs in <strong>demo mode</strong>: the dashboard data you see comes from JSON snapshots committed to this repository, captured from the API running against a canonical 6-month synthetic dataset (July through December 2025).
          </p>
          <p>
            Setting <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">API_MODE=online</code> in <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">.env.local</code> switches the portal to proxy live calls to a running upstream API at <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">API_BASE_URL</code>. The footer indicator below shows the current mode.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coming next</CardTitle>
          <CardDescription>Future phases of this portal build</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-slate-700">
          <ul className="list-disc list-inside space-y-1">
            <li>Daily KPI dashboard — total sales, transactions, active exceptions, labor cost percentage</li>
            <li>Per-store drilldown with department-level breakdowns and year-over-year comparisons</li>
            <li>Exception triage — severity-ranked anomaly list with rule context and band-distance details</li>
            <li>&ldquo;Behind the Build&rdquo; — architecture walkthrough, design decisions, and detection-quality narrative</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
