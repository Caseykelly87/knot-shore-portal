/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["pino", "pino-pretty", "prom-client"],
  },
};

export default nextConfig;
