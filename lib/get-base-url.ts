import { headers } from "next/headers";

const NON_REQUEST_CONTEXT_ERROR =
  "getBaseUrl() called from a non-request context. This function only works in dynamically-rendered server components or route handlers.";

/**
 * Build a base URL for same-origin fetches from server components.
 *
 * Reads the incoming request's Host and X-Forwarded-Proto so the URL
 * matches whatever upstream proxy or platform terminated the connection.
 *
 * Only safe to call from a request-scoped server context (route handler
 * or dynamically-rendered server component). On Next.js's static
 * prerender path, headers() either returns null or throws — both cases
 * surface here as a named error so the failure points at the call site
 * rather than at an opaque downstream "Cannot read properties of null"
 * during the Vercel build.
 */
export function getBaseUrl(): string {
  // Cast lets us defend against the static-prerender null without fighting
  // Next's type, which declares headers() as always-non-null.
  let h: ReturnType<typeof headers> | null;
  try {
    h = headers();
  } catch {
    throw new Error(NON_REQUEST_CONTEXT_ERROR);
  }
  if (h === null) {
    throw new Error(NON_REQUEST_CONTEXT_ERROR);
  }
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
