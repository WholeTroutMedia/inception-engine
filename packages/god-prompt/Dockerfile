# ─── GOD PROMPT — Creative Pipeline ────────────────────────────────────────────
# Creative Liberation Engine v5 | Port 7000
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache curl
RUN npm i -g tsx

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/god-prompt/package.json packages/god-prompt/
COPY packages/genkit/package.json packages/genkit/
COPY packages/memory/package.json packages/memory/
COPY packages/genmedia/package.json packages/genmedia/
COPY packages/auth/package.json packages/auth/
RUN pnpm install --frozen-lockfile --shamefully-hoist --filter @inception/god-prompt... --filter @inception/genkit... --filter @inception/memory --filter @inception/genmedia --filter @inception/auth

COPY packages/god-prompt/ packages/god-prompt/
COPY packages/genkit/ packages/genkit/
COPY packages/memory/ packages/memory/
COPY packages/genmedia/ packages/genmedia/
COPY packages/auth/ packages/auth/

ENV NODE_ENV=production
ENV PORT=7000
EXPOSE 7000

WORKDIR /app/packages/god-prompt
CMD ["tsx", "src/server.ts"]
