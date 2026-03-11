# ─── INCEPTION BROWSER MCP — Sovereign Playwright Browser ─────────────────────
# Creative Liberation Engine v5 | 40-tool browser automation MCP server
# Uses Playwright + Chromium for sovereign, headless browser control
FROM node:22-bookworm-slim AS base

# Playwright requires glibc-based distro (not Alpine)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ─── DEPS ─────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY packages/inception-browser/package*.json ./
RUN npm install --omit=dev

# Install Playwright with bundled Chromium
RUN npx playwright install chromium --with-deps

# ─── BUILD ────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY packages/inception-browser/ ./

# Build TypeScript
RUN if [ -f tsconfig.json ]; then \
    npm install typescript --save-dev && \
    npx tsc --build; \
    fi

# ─── PROD ─────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS prod
WORKDIR /app

# Install Playwright browser deps in prod image
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2 libcups2 \
    curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Copy Playwright browser binaries
COPY --from=deps /root/.cache/ms-playwright /root/.cache/ms-playwright

ENV NODE_ENV=production
ENV BROWSER_MCP_PORT=4500
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright

# SQLite persistence volume for browser sessions/memory
VOLUME ["/data/browser-sessions"]

EXPOSE 4500

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:4500/health || exit 1

CMD ["node", "dist/index.js"]
