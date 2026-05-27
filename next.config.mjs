/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    // Externalize: pino-pretty ships a worker-thread transport that webpack rewriting
    // breaks, and prom-client relies on a singleton Registry whose module identity
    // gets duplicated under Next's per-route bundle splitting (which causes metrics
    // to be registered against two separate Registry instances). Keep both at the
    // Node module level rather than letting webpack bundle them.
    serverComponentsExternalPackages: ["pino", "pino-pretty", "prom-client"],
  },
};

export default nextConfig;
