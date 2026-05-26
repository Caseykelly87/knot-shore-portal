/**
 * Per-request observed-data-source state for the portal.
 *
 * The /api/* route handlers set `X-Data-Source: fallback` on responses
 * where online mode degraded to the bundled fixture (upstream
 * unreachable). The ModeIndicator surfaces that condition to the
 * operator so a degraded page doesn't render as "Live Data" without
 * any visible signal that the data isn't actually live.
 *
 * React's `cache()` creates a per-request memoized function — within a
 * single server-side request, every call to the cached factory returns
 * the same object. Server-side data fetchers call `markFallbackUsed()`
 * when they observe the header; the ModeIndicator reads
 * `wasFallbackUsed()` when it renders. Both share the same per-request
 * object because both go through the same cached factory.
 *
 * The React 18 test build doesn't expose `cache`. Next.js's bundled
 * React canary does. We grab `cache` off React with an optional access
 * so production gets the real per-request scoping and tests get a
 * single-process memo that resets between tests via `vi.resetModules()`.
 *
 * Order caveat: React server components in App Router can be resolved
 * concurrently. If the ModeIndicator renders before the page's data
 * fetcher observes the fallback header, the indicator shows "Live Data"
 * for that render and reflects the fallback on the next one. The
 * common case — non-streaming responses where the page render completes
 * before the layout's footer streams — is reliable; the edge case is
 * a single-render lag that resolves on the next request.
 */

import * as React from "react";

type CacheFn = <T extends (...args: never[]) => unknown>(fn: T) => T;

const reactCache = (React as unknown as { cache?: CacheFn }).cache;

const cache: CacheFn =
  reactCache ??
  (<T extends (...args: never[]) => unknown>(fn: T): T => {
    let resolved = false;
    let value: unknown;
    return ((...args: Parameters<T>) => {
      if (!resolved) {
        value = fn(...args);
        resolved = true;
      }
      return value;
    }) as T;
  });

interface DataSourceFlags {
  fallbackUsed: boolean;
}

const getFlags = cache((): DataSourceFlags => ({ fallbackUsed: false }));

export function markFallbackUsed(): void {
  getFlags().fallbackUsed = true;
}

export function wasFallbackUsed(): boolean {
  return getFlags().fallbackUsed;
}

export function trackResponse(res: Response): void {
  if (res.headers.get("X-Data-Source") === "fallback") {
    markFallbackUsed();
  }
}
