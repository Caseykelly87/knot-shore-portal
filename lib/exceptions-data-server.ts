/**
 * Server-only fetcher for the /exceptions page.
 *
 * Issues parallel fetches to /api/anomalies (paginated) and /api/dim-stores,
 * then delegates to shapeExceptionsData (pure) for the view-model
 * transformation. Split from lib/exceptions-data.ts so client components
 * can import the shape transformer and filter applicator without pulling
 * in next/headers.
 */

import { headers } from "next/headers";
import {
  shapeExceptionsData,
  type ExceptionsData,
  type AnomaliesEnvelope,
  type DimStoreRaw,
} from "@/lib/exceptions-data";

function getBaseUrl(): string {
  const h = headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function fetchExceptionsData(): Promise<ExceptionsData> {
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

  // Offline mode returns the full fixture in one call (route handler ignores
  // limit/offset). Online mode respects pagination, so we need to fan out
  // additional fetches for pages 2..N when the first page didn't cover total.
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

  const fullEnvelope: AnomaliesEnvelope = {
    total: page1.total,
    limit: page1.limit,
    offset: 0,
    items: allItems,
  };

  return shapeExceptionsData(fullEnvelope, dimStores);
}
