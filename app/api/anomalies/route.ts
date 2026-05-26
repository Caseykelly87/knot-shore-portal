import { makeProxyRoute } from "@/lib/proxy-route";
import { loadAnomaliesFixture } from "@/lib/fixture-loader";

export const GET = makeProxyRoute({
  path: "/api/anomalies",
  upstreamPath: "/anomalies",
  loadFixture: loadAnomaliesFixture,
});
