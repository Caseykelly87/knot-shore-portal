/**
 * Shared paginator for the portal's online-mode fetchers.
 *
 * Each /api/* route handler is a proxy onto the upstream economic-data
 * api; that api caps the limit query parameter at 200 (see the API's
 * Pydantic validation — `200-row API limit` decision card). Any portal
 * fetcher that needs more than 200 rows must page through the upstream's
 * paginated envelope.
 *
 * fetchPaginated walks the upstream window using its envelope's `total`
 * field, accumulating items until total is reached. It returns a single
 * envelope with the same shape the upstream emits but with the items
 * array containing the union of every page.
 *
 * The function forwards an optional `x-request-id` header on every
 * paginated request so the upstream's request log links the calls.
 * Page fetch failures throw; callers (the route handlers via
 * makeProxyRoute, or the lib/* fetchers via their own try/catch)
 * handle the fallback to fixture.
 */

const PAGE_SIZE = 200;

export interface PaginatedEnvelope<T> {
  total: number;
  limit?: number;
  offset?: number;
  items: T[];
}

export interface FetchPaginatedOptions {
  requestId?: string;
}

export async function fetchPaginated<T>(
  base: string,
  path: string,
  options: FetchPaginatedOptions = {},
): Promise<PaginatedEnvelope<T>> {
  const headers: Record<string, string> = {};
  if (options.requestId) {
    headers["x-request-id"] = options.requestId;
  }

  let offset = 0;
  let total = 0;
  const items: T[] = [];

  while (true) {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${base}${path}${sep}limit=${PAGE_SIZE}&offset=${offset}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
    if (!res.ok) {
      throw new Error(`paginated fetch failed: ${res.status} for ${url}`);
    }
    const body = (await res.json()) as PaginatedEnvelope<T>;
    total = body.total;
    items.push(...body.items);
    if (items.length >= total || body.items.length === 0) break;
    offset += PAGE_SIZE;
  }

  return { total, limit: items.length, offset: 0, items };
}
