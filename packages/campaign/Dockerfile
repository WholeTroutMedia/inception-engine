# ─── CAMPAIGN — Creative OS Campaign Service ────────────────────────────────────
# Creative Liberation Engine v5 | Port 4006
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache curl ffmpeg
RUN npm i -g tsx typescript

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/campaign/package.json packages/campaign/
COPY packages/genkit/package.json packages/genkit/
COPY packages/god-prompt/package.json packages/god-prompt/
COPY packages/genmedia/package.json packages/genmedia/
RUN pnpm install --frozen-lockfile --shamefully-hoist \
    --filter @inception/campaign... \
    --filter @inception/genkit... \
    --filter @inception/god-prompt... \
    --filter @inception/genmedia

COPY packages/campaign/ packages/campaign/
COPY packages/genkit/ packages/genkit/
COPY packages/god-prompt/ packages/god-prompt/
COPY packages/genmedia/ packages/genmedia/

# Compile TypeScript
WORKDIR /app/packages/campaign
RUN tsc

ENV NODE_ENV=production
ENV PORT=4006
EXPOSE 4006

WORKDIR /app/packages/campaign
CMD ["tsx", "src/server.ts"]
