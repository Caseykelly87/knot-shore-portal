import { headers } from "next/headers";

/**
 * Build a base URL for same-origin fetches from server components.
 *
 * Reads the incoming request's Host and X-Forwarded-Proto so the URL
 * matches whatever upstream proxy or platform terminated the connection.
 *
 * Only safe to call from a request-scoped server context (route handler
 * or dynamically-rendered server component). On Next.js's static
 * prerender path, headers() returns null and reading .get() on it
 * throws — callers that may run during prerender should branch around
 * this and use a direct fixture import or an env-derived URL instead.
 */
export function getBaseUrl(): string {
  const h = headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
