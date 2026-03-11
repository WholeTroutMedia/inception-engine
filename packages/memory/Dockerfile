# ─── MEMORY PACKAGE — Creative Liberation Engine Unified Memory Bus ─────────────────────
# @inception/memory | ChromaDB + Git + SCRIBE memory layer
# NAS deployment — connects to ChromaDB vector store on sovereign infrastructure
FROM node:22-alpine AS base

RUN apk add --no-cache curl git openssh-client

# ─── DEPS ─────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY packages/memory/package*.json ./
# Install production deps only
RUN npm install --omit=dev --ignore-scripts

# ─── BUILD ────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copy deps from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY packages/memory/ ./

# Compile TypeScript if tsconfig present
RUN if [ -f tsconfig.json ]; then \
    npm install typescript --save-dev && \
    npx tsc --build; \
    fi

# ─── PROD ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS prod
WORKDIR /app

RUN apk add --no-cache curl git

# Copy compiled output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Env defaults (override at runtime)
ENV NODE_ENV=production
ENV MEMORY_PORT=4300
ENV CHROMA_URL=http://chromadb:8000
ENV GIT_MEMORY_PATH=/data/git-memory

# Persistent memory volume
VOLUME ["/data/git-memory"]

EXPOSE 4300

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:4300/health || exit 1

CMD ["node", "dist/index.js"]
