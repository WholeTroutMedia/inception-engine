# ── DIRECTOR — Autonomous Task Queue Populator ────────────────────────────
# Build context: repo root (context: .)
# docker-compose.genesis.yml sets context: . / dockerfile: packages/director/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY packages/director/package.json packages/director/package-lock.json* ./
RUN npm install

# Build TypeScript
COPY packages/director/tsconfig.json ./
COPY packages/director/src/ ./src/
RUN npm run build

# ---- Runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Workspace root is mounted as a read-only volume at /workspace
# The cron runs the audit against this mounted monorepo
ENV WORKSPACE_ROOT=/workspace

CMD ["node", "dist/cron.js"]
