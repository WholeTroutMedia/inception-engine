# ─── THEME ENGINE — Creative Liberation Engine CSS Theme Generator ──────────────────────
# @inception/theme-engine | Runtime theme generation, switching, and CSS injection
# Generates design token CSS variables at runtime for dynamic theme switching
FROM node:22-alpine AS base

RUN apk add --no-cache curl

# ─── DEPS ─────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY packages/theme-engine/package*.json ./
RUN npm install --omit=dev

# ─── BUILD ────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY packages/theme-engine/ ./

RUN if [ -f tsconfig.json ]; then \
    npm install typescript --save-dev && \
    npx tsc --build; \
    fi

# ─── PROD ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS prod
WORKDIR /app

RUN apk add --no-cache curl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
ENV THEME_ENGINE_PORT=4600

EXPOSE 4600

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:4600/health || exit 1

CMD ["node", "dist/index.js"]
