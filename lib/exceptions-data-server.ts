/**
 * Server-only fetcher for the /exceptions page.
 *
 * In offline mode the bundled JSON fixtures are imported directly — no
 * HTTP, no headers() — which keeps this fetcher safe to call during
 * Next.js partial prerendering where headers() returns null. In online
 * mode the existing fetch path against the portal's own /api/* routes
 * is preserved, including the page-2..N fan-out for the upstream's
 * paginated response shape.
 *
 * Split from lib/exceptions-data.ts so client components can import
 * shapeExceptionsData, applyFilters, and the type definitions without
 * pulling in next/headers.
 */

import { getApiMode } from "@/lib/api-mode";
import { getBaseUrl } from "@/lib/get-base-url";
import {
  shapeExceptionsData,
  type ExceptionsData,
  type AnomaliesEnvelope,
  type AnomalyFlagRaw,
  type DimStoreRaw,
} from "@/lib/exceptions-data";
import { fetchPaginated } from "@/lib/pagination";
import { trackResponse } from "@/lib/data-source-state";

interface RawExceptionsInputs {
  anomalies: AnomaliesEnvelope;
  dimStores: DimStoreRaw[];
}

async function loadRawExceptionsInputs(): Promise<RawExceptionsInputs> {
  if (getApiMode() === "offline") {
    const [anomaliesMod, dimStoresMod] = await Promise.all([
      import("@/fixtures/anomalies.json"),
      import("@/fixtures/dim-stores.json"),
    ]);
    return {
      anomalies: anomaliesMod.default as unknown as AnomaliesEnvelope,
      dimStores: dimStoresMod.default as unknown as DimStoreRaw[],
    };
  }

  const base = getBaseUrl();

  const [anomaliesEnvelope, dimStoresRes] = await Promise.all([
    fetchPaginated<AnomalyFlagRaw>(base, "/api/anomalies"),
    fetch(`${base}/api/dim-stores`, { cache: "no-store" }),
  ]);

  if (!dimStoresRes.ok) {
    throw new Error(`Exceptions data fetch failed: dimStores=${dimStoresRes.status}`);
  }

  trackResponse(dimStoresRes);
  const dimStores = (await dimStoresRes.json()) as DimStoreRaw[];

  return {
    anomalies: {
      total: anomaliesEnvelope.total,
      limit: anomaliesEnvelope.limit ?? anomaliesEnvelope.items.length,
      offset: 0,
      items: anomaliesEnvelope.items,
    } satisfies AnomaliesEnvelope,
    dimStores,
  };
}

export async function fetchExceptionsData(): Promise<ExceptionsData> {
  const { anomalies, dimStores } = await loadRawExceptionsInputs();
  return shapeExceptionsData(anomalies, dimStores);
}
