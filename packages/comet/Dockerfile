# ─── COMET — Sovereign Spatial Intelligence Layer ───────────────────────────
# Creative Liberation Engine v5 | Port 7100
FROM node:20-alpine

RUN apk add --no-cache \
    chromium nss freetype harfbuzz ca-certificates ttf-freefont udev curl jq

ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV COMET_HEADLESS=true

WORKDIR /app

# 1. Strip workspace:* dep and place clean package.json
COPY packages/comet/package.json /tmp/comet-pkg.json
RUN mkdir -p packages/comet && \
    jq 'del(.dependencies["@inception/ghost"])' /tmp/comet-pkg.json > packages/comet/package.json

# 2. Install dependencies
RUN cd packages/comet && npm install --legacy-peer-deps

# 3. Copy source files only (node_modules stays from install step)
COPY packages/comet/src packages/comet/src
COPY packages/comet/tsconfig.json packages/comet/tsconfig.json

# 4. Compile TypeScript
RUN cd packages/comet && npx tsc

ENV NODE_ENV=production
ENV PORT=7100
EXPOSE 7100

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=15s \
    CMD curl -f http://localhost:7100/health || exit 1

WORKDIR /app/packages/comet
CMD ["node", "dist/server.js"]
