# ─── NAS WATCHER — Creative Liberation Engine Sovereign NAS Daemon ──────────────────────
# @inception/nas-watcher | Redis pub/sub + NAS filesystem watcher
# Monitors Synology NAS media directories and emits events via Redis
FROM node:22-alpine AS base

RUN apk add --no-cache curl inotify-tools

# ─── DEPS ─────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY packages/nas-watcher/package*.json ./
RUN npm install --omit=dev --ignore-scripts

# ─── BUILD ────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY packages/nas-watcher/ ./

RUN if [ -f tsconfig.json ]; then \
    npm install typescript --save-dev && \
    npx tsc --build; \
    fi

# ─── PROD ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS prod
WORKDIR /app

RUN apk add --no-cache curl inotify-tools

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
ENV NAS_WATCHER_PORT=4200
ENV REDIS_URL=redis://redis:6379
ENV NAS_WATCH_PATHS=/mnt/nas/media

# NAS media mount point
VOLUME ["/mnt/nas"]

EXPOSE 4200

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:4200/health || exit 1

CMD ["node", "dist/index.js"]
