import { NextResponse } from "next/server";
import { registry } from "@/lib/metrics";

// Force per-request evaluation. Without this Next.js 14 prerenders the
// route at build time (since GET takes no NextRequest parameter) and
// serves the cached build-time output, so counter increments from other
// routes never show up.
export const dynamic = "force-dynamic";

/**
 * Prometheus metrics endpoint. Returns the portal's registry contents
 * in Prometheus text exposition format. Unauthenticated by convention —
 * production deploys should restrict access via firewall, reverse proxy,
 * or service mesh.
 */
export async function GET() {
  const body = await registry.metrics();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": registry.contentType,
    },
  });
}
