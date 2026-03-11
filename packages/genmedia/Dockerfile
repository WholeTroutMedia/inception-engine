# ─── GENMEDIA — AI Media Provider Engine ─────────────────────────────────────
# Creative Liberation Engine v5 | Port 4300
# Multi-provider generative media: FAL.ai, Vertex AI, Imagen, Veo
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate

RUN apk add --no-cache curl

RUN npm i -g tsx typescript

WORKDIR /app

# Install via pnpm workspace to get genkit + all cross-package workspace deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/genmedia/package.json packages/genmedia/
COPY packages/memory/package.json packages/memory/
COPY packages/genkit/package.json packages/genkit/
RUN pnpm install --frozen-lockfile --shamefully-hoist --filter @inception/genmedia... --filter @inception/memory --filter @inception/genkit

COPY packages/genmedia/ packages/genmedia/
COPY packages/memory/ packages/memory/
COPY packages/genkit/ packages/genkit/

ENV NODE_ENV=production
ENV GENMEDIA_PORT=4300

EXPOSE 4300

WORKDIR /app/packages/genmedia
CMD ["tsx", "src/server.ts"]
