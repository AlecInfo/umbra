FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

# --- deps: install only api dependencies ---
FROM base AS deps
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
# Stub other workspace packages so pnpm doesn't error
RUN mkdir -p apps/web apps/landing packages && \
    echo '{"name":"web","version":"0.0.0"}' > apps/web/package.json && \
    echo '{"name":"landing","version":"0.0.0"}' > apps/landing/package.json
RUN pnpm install --no-frozen-lockfile --filter=api

# --- builder: compile TypeScript ---
FROM base AS builder
WORKDIR /workspace
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/apps/api/node_modules ./apps/api/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api ./apps/api
WORKDIR /workspace/apps/api
RUN node --import=tsx ace.js build --ignore-ts-errors && \
    sed -i 's/\.ts"/\.js"/g' build/package.json

# --- runner: production image ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /workspace/apps/api/build .
COPY --from=builder /workspace/apps/api/resources ./resources
RUN npm install --omit=dev --ignore-scripts

EXPOSE 3333
CMD ["node", "bin/server.js"]
