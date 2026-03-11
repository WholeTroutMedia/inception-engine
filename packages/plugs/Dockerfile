# ─── RELAY-MCP — THE PLUG Broker ───────────────────────────────────────────────
# Creative Liberation Engine v5 | Port 5000
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache curl
RUN npm i -g tsx

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/plugs/package.json packages/plugs/
COPY packages/genkit/package.json packages/genkit/
COPY packages/memory/package.json packages/memory/
COPY packages/genmedia/package.json packages/genmedia/
RUN pnpm install --frozen-lockfile --shamefully-hoist --filter @inception/plugs... --filter @inception/genkit... --filter @inception/memory --filter @inception/genmedia

COPY packages/plugs/ packages/plugs/
COPY packages/genkit/ packages/genkit/
COPY packages/memory/ packages/memory/
COPY packages/genmedia/ packages/genmedia/

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

WORKDIR /app/packages/plugs
CMD ["tsx", "src/server.ts"]
