import { NextRequest, NextResponse } from "next/server";
import { getApiMode, getUpstreamBaseUrl } from "@/lib/api-mode";
import { loadAnomaliesFixture } from "@/lib/fixture-loader";

export async function GET(req: NextRequest) {
  if (getApiMode() === "offline") {
    return NextResponse.json(loadAnomaliesFixture());
  }
  const upstream = `${getUpstreamBaseUrl()}/anomalies${req.nextUrl.search}`;
  const res = await fetch(upstream, { cache: "no-store" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
