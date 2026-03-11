# ─── GHOST — Autonomous QA Engine ──────────────────────────────────────────────
# Creative Liberation Engine v5 | Port 6000
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache curl chromium nss freetype harfbuzz ca-certificates ttf-freefont
RUN npm i -g tsx

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ghost/package.json packages/ghost/
RUN pnpm install --frozen-lockfile --shamefully-hoist --filter @inception/ghost

COPY packages/ghost/ packages/ghost/

ENV NODE_ENV=production
ENV PORT=6000
EXPOSE 6000

WORKDIR /app/packages/ghost
CMD ["tsx", "src/server.ts"]
