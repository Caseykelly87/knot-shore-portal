import { makeProxyRoute } from "@/lib/proxy-route";
import { loadDashboardSummaryFixture } from "@/lib/fixture-loader";

export const GET = makeProxyRoute({
  path: "/api/dashboard-summary",
  upstreamPath: "/dashboard-summary",
  loadFixture: loadDashboardSummaryFixture,
});
