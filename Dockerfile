# Multi-stage build for the knot-shore-portal Next.js application.
#
# Stage 1 (deps): install all npm packages including dev dependencies.
# Stage 2 (builder): produce the Next.js standalone output bundle.
# Stage 3 (runtime): minimal Node 20 alpine image with only the runtime
# bundle and a non-root user.

FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Use 127.0.0.1 rather than localhost — Node may resolve "localhost" to ::1 (IPv6)
# while the server binds to 0.0.0.0 (IPv4 only), which makes the healthcheck fail
# intermittently. The orchestration repo's docker/portal.Dockerfile already does this.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:${PORT}/api/health || exit 1

CMD ["node", "server.js"]
