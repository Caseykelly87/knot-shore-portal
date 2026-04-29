import { NextResponse } from "next/server";
import { getApiMode, getUpstreamBaseUrl } from "@/lib/api-mode";
import { loadHealthFixture } from "@/lib/fixture-loader";

export async function GET() {
  if (getApiMode() === "offline") {
    return NextResponse.json(loadHealthFixture());
  }
  try {
    const res = await fetch(`${getUpstreamBaseUrl()}/health`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { status: "upstream_unreachable", data_source: "live" },
      { status: 503 }
    );
  }
}
