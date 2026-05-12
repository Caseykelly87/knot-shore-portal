/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["pino", "pino-pretty", "prom-client"],
};

export default nextConfig;
