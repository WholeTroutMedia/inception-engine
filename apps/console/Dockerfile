# ─── CONSOLE — Creative Liberation Engine Command Surface ────────────────────────────────
# Multi-stage: Node 22 builds the Vite app, nginx:alpine serves the static dist/
# Port 80 (internal) | Served at gateway root /
FROM node:22-alpine AS builder

WORKDIR /app

# Install deps directly (not a pnpm workspace — standalone install)
COPY apps/console/package.json apps/console/package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copy source and build
COPY apps/console/ .

# Production env: API paths routed through gateway prefix
ENV VITE_GENKIT_URL=/ai
ENV VITE_CAMPAIGN_URL=/campaign
ENV VITE_GOD_PROMPT_URL=/creative
ENV VITE_ZERO_DAY_URL=/ops
ENV VITE_COMET_URL=/comet

RUN npm run build

# ── Serve ──────────────────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

RUN apk add --no-cache curl

# SPA static files
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA nginx config (try_files fallback to index.html)
COPY apps/console/nginx.spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD curl -sf http://localhost/index.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
