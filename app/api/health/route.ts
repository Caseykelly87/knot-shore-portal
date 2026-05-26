import { makeProxyRoute } from "@/lib/proxy-route";
import { loadHealthFixture } from "@/lib/fixture-loader";

export const GET = makeProxyRoute({
  path: "/api/health",
  upstreamPath: "/health",
  loadFixture: loadHealthFixture,
  onUpstreamFailure: {
    body: {
      status: "upstream_unreachable",
      version: "unknown",
      grocery_pipeline: { status: "unavailable" },
      macro_pipeline: { status: "unavailable" },
    },
    status: 503,
  },
});
