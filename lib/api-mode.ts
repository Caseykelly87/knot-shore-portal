/**
 * Two operating modes:
 *
 * - "offline" (default): the portal serves bundled JSON fixtures from
 *   the fixtures/ directory. No network, no upstream API needed. This is
 *   the demo mode that runs out of the box on a fresh clone.
 *
 * - "online": the portal proxies api calls to a running upstream
 *   economic-data-api instance at API_BASE_URL.
 *
 * The mode is read at module load (process start) and does not change
 * during the lifetime of the process. To switch modes, set the API_MODE
 * env var and restart.
 */

export type ApiMode = "offline" | "online";

export function getApiMode(): ApiMode {
  const raw = process.env.API_MODE;
  if (raw === "online") return "online";
  return "offline";
}

export function getUpstreamBaseUrl(): string {
  return process.env.API_BASE_URL ?? "http://localhost:8000";
}
