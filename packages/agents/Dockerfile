# ─── AGENTS — Creative Liberation Engine Agent Runtime ──────────────────────────────────
# @inception/agents | 14-agent ADK runtime + VERA guardrails + Firebase ADK
# Orchestrates AVERI Trinity and supporting agent hive on the NAS
FROM node:22-alpine AS base

RUN apk add --no-cache curl git

# ─── DEPS ─────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY packages/agents/package*.json ./
RUN npm install --omit=dev

# ─── BUILD ────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY packages/agents/ ./

RUN if [ -f tsconfig.json ]; then \
    npm install typescript --save-dev && \
    npx tsc --build; \
    fi

# ─── PROD ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS prod
WORKDIR /app

RUN apk add --no-cache curl git

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
ENV AGENTS_PORT=4700
# ADK + AVERI config
ENV GENKIT_URL=http://genkit:4001
ENV REDIS_URL=redis://redis:6379
ENV DISPATCH_URL=http://dispatch:5050

EXPOSE 4700

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:4700/health || exit 1

CMD ["node", "dist/index.js"]
