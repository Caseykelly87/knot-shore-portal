import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 space-y-8">
      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">About this platform</h1>
        <p className="text-lg text-muted-foreground">
          Stakeholder dashboard for the Knot Shore Grocery analytics platform — an 8-store fictional retail chain in the St. Louis metro area.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>How the platform is wired</CardTitle>
          <CardDescription>
            Four repositories, separated by responsibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-foreground">
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
          <CardTitle>Demo modes</CardTitle>
          <CardDescription>
            Offline (default) and online
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-foreground">
          <p>
            By default the portal runs in <strong>offline mode</strong>: the dashboard data you see comes from JSON snapshots committed to this repository, captured from the API running against a canonical 6-month synthetic dataset (July through December 2025).
          </p>
          <p>
            Setting <code className="rounded bg-muted px-1.5 py-0.5 text-sm">API_MODE=online</code> in <code className="rounded bg-muted px-1.5 py-0.5 text-sm">.env.local</code> switches the portal to proxy live calls to a running upstream API at <code className="rounded bg-muted px-1.5 py-0.5 text-sm">API_BASE_URL</code>. The footer indicator shows the current mode. Both modes are first-class operational paths.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
