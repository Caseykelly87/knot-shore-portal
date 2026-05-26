import { makeProxyRoute } from "@/lib/proxy-route";
import { loadDimStoresFixture } from "@/lib/fixture-loader";

export const GET = makeProxyRoute({
  path: "/api/dim-stores",
  upstreamPath: "/dim-stores",
  loadFixture: loadDimStoresFixture,
});
