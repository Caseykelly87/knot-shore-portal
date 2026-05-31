/**
 * Server-side fetcher for the detection-quality measurement payload.
 *
 * In offline mode the bundled fixture is imported directly — no HTTP,
 * no headers() — which keeps this fetcher safe to call during Next.js
 * partial prerendering where headers() returns null. In online mode the
 * existing fetch path against the portal's own
 * /api/insights/detection-quality route is preserved, including
 * trackResponse and the !res.ok throw, so the data-source indicator and
 * error handling are unchanged when an upstream API is wired.
 *
 * Mirrors the dual-mode shape of lib/exceptions-data-server.ts; the
 * dashboard, exceptions, and store fetchers were given this offline
 * short-circuit in an earlier pass and this fetcher was missed.
 */

import { getApiMode } from "@/lib/api-mode";
import { getBaseUrl } from "@/lib/get-base-url";
import { trackResponse } from "@/lib/data-source-state";
import type { DetectionQuality } from "@/lib/types";

export async function fetchDetectionQuality(): Promise<DetectionQuality> {
  if (getApiMode() === "offline") {
    const mod = await import("@/fixtures/insights-detection-quality.json");
    return mod.default as unknown as DetectionQuality;
  }

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
