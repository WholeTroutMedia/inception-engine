FROM node:22-alpine AS builder

WORKDIR /app

# Install deps
COPY apps/inception-hud/package.json ./
RUN npm install

# Copy source and build
COPY apps/inception-hud/ .
RUN npm run build

# ── Serve ──────────────────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

# SPA static files
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA nginx config (try_files fallback to index.html)
COPY apps/nginx.spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=3 CMD wget -qO- http://localhost/index.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
