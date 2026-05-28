/**
 * Server-side fetcher for the detection-quality measurement payload.
 *
 * The portal's /api/insights/detection-quality proxy routes between
 * bundled fixture (offline) and upstream API (online) via the shared
 * makeProxyRoute factory; this fetcher is the consumer of that proxy.
 * Running on the server lets the about page render the verdict at
 * request time with the same dual-mode resolution every other portal
 * data fetcher uses.
 */

import { getBaseUrl } from "@/lib/get-base-url";
import { trackResponse } from "@/lib/data-source-state";
import type { DetectionQuality } from "@/lib/types";

export async function fetchDetectionQuality(): Promise<DetectionQuality> {
  const res = await fetch(`${getBaseUrl()}/api/insights/detection-quality`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `detection-quality fetch failed: status ${res.status}`,
    );
  }
  trackResponse(res);
  return (await res.json()) as DetectionQuality;
}
