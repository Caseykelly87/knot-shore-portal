import { makeProxyRoute } from "@/lib/proxy-route";
import { loadDepartmentMetricsFixture } from "@/lib/fixture-loader";

export const GET = makeProxyRoute({
  path: "/api/department-metrics",
  upstreamPath: "/department-metrics",
  loadFixture: loadDepartmentMetricsFixture,
});
