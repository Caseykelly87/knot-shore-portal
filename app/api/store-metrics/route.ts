import { makeProxyRoute } from "@/lib/proxy-route";
import { loadStoreMetricsFixture } from "@/lib/fixture-loader";

export const GET = makeProxyRoute({
  path: "/api/store-metrics",
  upstreamPath: "/store-metrics",
  loadFixture: loadStoreMetricsFixture,
});
