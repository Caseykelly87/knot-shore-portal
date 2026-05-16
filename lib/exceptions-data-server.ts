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
  type DimStoreRaw,
} from "@/lib/exceptions-data";

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

  const [anomaliesRes, dimStoresRes] = await Promise.all([
    fetch(`${base}/api/anomalies?limit=200`, { cache: "no-store" }),
    fetch(`${base}/api/dim-stores`, { cache: "no-store" }),
  ]);

  if (!anomaliesRes.ok || !dimStoresRes.ok) {
    throw new Error(
      `Exceptions data fetch failed: anomalies=${anomaliesRes.status} dimStores=${dimStoresRes.status}`,
    );
  }

  const [page1, dimStores] = await Promise.all([
    anomaliesRes.json() as Promise<AnomaliesEnvelope>,
    dimStoresRes.json() as Promise<DimStoreRaw[]>,
  ]);

  // Online mode respects pagination, so fan out additional fetches for
  // pages 2..N when the first page didn't cover total.
  let allItems = page1.items;

  if (page1.items.length < page1.total) {
    const remainingPages: Promise<AnomaliesEnvelope>[] = [];
    for (let offset = page1.items.length; offset < page1.total; offset += 200) {
      remainingPages.push(
        fetch(`${base}/api/anomalies?limit=200&offset=${offset}`, { cache: "no-store" }).then((r) => {
          if (!r.ok) throw new Error(`Pagination fetch failed at offset=${offset}: ${r.status}`);
          return r.json();
        }),
      );
    }
    const additionalPages = await Promise.all(remainingPages);
    for (const page of additionalPages) {
      allItems = allItems.concat(page.items);
    }
  }

  return {
    anomalies: {
      total: page1.total,
      limit: page1.limit,
      offset: 0,
      items: allItems,
    },
    dimStores,
  };
}

export async function fetchExceptionsData(): Promise<ExceptionsData> {
  const { anomalies, dimStores } = await loadRawExceptionsInputs();
  return shapeExceptionsData(anomalies, dimStores);
}
