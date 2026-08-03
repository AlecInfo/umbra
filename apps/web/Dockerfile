FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

# --- deps ---
FROM base AS deps
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
RUN mkdir -p apps/api apps/landing packages && \
    echo '{"name":"api","version":"0.0.0"}' > apps/api/package.json && \
    echo '{"name":"landing","version":"0.0.0"}' > apps/landing/package.json
RUN pnpm install --no-frozen-lockfile --filter=web

# --- builder ---
FROM base AS builder
WORKDIR /workspace
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/apps/web/node_modules ./apps/web/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web ./apps/web
WORKDIR /workspace/apps/web
RUN pnpm build

# --- runner ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

COPY --from=builder /workspace/apps/web/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
