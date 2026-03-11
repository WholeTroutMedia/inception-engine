# ─── GENKIT — AI Orchestration Server ──────────────────────────────────────────
# Creative Liberation Engine v5 | Port 4000
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache curl
RUN npm i -g tsx

WORKDIR /app

# ── Install workspace deps (shamefully-hoist for Docker compatibility) ─────────
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/genkit/package.json packages/genkit/
COPY packages/memory/package.json packages/memory/
COPY packages/genmedia/package.json packages/genmedia/
COPY packages/auth/package.json packages/auth/
RUN pnpm install --frozen-lockfile --shamefully-hoist

# ── Copy source ────────────────────────────────────────────────────────────────
COPY packages/genkit/ packages/genkit/
COPY packages/memory/ packages/memory/
COPY packages/genmedia/ packages/genmedia/
COPY packages/auth/ packages/auth/

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

WORKDIR /app/packages/genkit
CMD ["tsx", "src/server.ts"]
