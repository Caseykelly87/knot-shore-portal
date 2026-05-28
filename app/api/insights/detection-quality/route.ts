import { makeProxyRoute } from "@/lib/proxy-route";
import { loadDetectionQualityFixture } from "@/lib/fixture-loader";

export const GET = makeProxyRoute({
  path: "/api/insights/detection-quality",
  upstreamPath: "/insights/detection-quality",
  loadFixture: loadDetectionQualityFixture,
});
