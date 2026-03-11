# ─── ATLAS LIVE — Broadcast Engine ─────────────────────────────────────────────
# Creative Liberation Engine v5 | Port 8000
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache curl ffmpeg
RUN npm i -g tsx

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/atlas-live/package.json packages/atlas-live/
RUN pnpm install --frozen-lockfile --shamefully-hoist --filter @inception/atlas-live

COPY packages/atlas-live/ packages/atlas-live/

ENV NODE_ENV=production
ENV PORT=8000
EXPOSE 8000

WORKDIR /app/packages/atlas-live
CMD ["tsx", "src/server.ts"]
