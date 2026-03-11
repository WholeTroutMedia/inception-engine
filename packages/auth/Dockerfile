# ─── AUTH — Creative Liberation Engine Authentication Service ───────────────────────────
# @inception/auth | Firebase Auth + JWT gateway + session management
# Sovereign auth layer — Firebase credentials, Google OAuth, API key validation
FROM node:22-alpine AS base

RUN apk add --no-cache curl

# ─── DEPS ─────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY packages/auth/package*.json ./
RUN npm install --omit=dev

# ─── BUILD ────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY packages/auth/ ./

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
ENV AUTH_PORT=4100
ENV REDIS_URL=redis://redis:6379

# Firebase service account must be injected at runtime via Docker secret or ENV
# ENV GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/firebase-sa.json

EXPOSE 4100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:4100/health || exit 1

CMD ["node", "dist/index.js"]
