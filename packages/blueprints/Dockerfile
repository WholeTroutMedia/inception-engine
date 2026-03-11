# ─── BLUEPRINTS — Vertical Blueprint Runtime ─────────────────────────────────
# Creative Liberation Engine v5 | Port 4200
# Runs AI-powered Blueprint plans across Finance, Healthcare, Media verticals
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache curl
RUN npm i -g tsx typescript

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/blueprints/package.json packages/blueprints/
COPY packages/genkit/package.json packages/genkit/
COPY packages/inception-core/package.json packages/inception-core/
RUN pnpm install --frozen-lockfile --shamefully-hoist \
    --filter @inception/blueprints... \
    --filter @inception/genkit... \
    --filter @inception/inception-core

COPY packages/blueprints/ packages/blueprints/
COPY packages/genkit/ packages/genkit/
COPY packages/inception-core/ packages/inception-core/

# Compile TypeScript
WORKDIR /app/packages/blueprints
RUN tsc

ENV NODE_ENV=production
ENV BLUEPRINTS_PORT=4200
EXPOSE 4200

CMD ["tsx", "src/server.ts"]
