# ── Stage 1: Build ────────────────────────────────────────────────────────────
# Context MUST be the monorepo root so we can copy @inception/cloud-mesh source
FROM node:22-alpine AS builder
WORKDIR /mono

# Copy workspace config so npm understands package resolution
COPY package.json pnpm-workspace.yaml* ./
COPY packages/forge/package.json ./packages/forge/
COPY packages/cloud-mesh/package.json ./packages/cloud-mesh/
COPY packages/inception-core/package.json ./packages/inception-core/

# Install deps from workspace root (npm workspace mode)
RUN npm install --ignore-scripts 2>/dev/null || true

# Copy source trees
COPY packages/cloud-mesh/ ./packages/cloud-mesh/
COPY packages/inception-core/ ./packages/inception-core/
COPY packages/forge/ ./packages/forge/

# Build deps first (cloud-mesh, inception-core), then forge
RUN cd packages/inception-core && npx tsc 2>/dev/null || true
RUN cd packages/cloud-mesh && npx tsc
RUN cd packages/forge && npx tsc

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

# Install only forge production deps
COPY packages/forge/package.json ./
RUN npm install --omit=dev --ignore-scripts 2>/dev/null || npm install --omit=dev

# Copy built artifacts from builder
COPY --from=builder /mono/packages/forge/dist/ ./dist/

# Inline @inception/cloud-mesh so we don't need a separate npm link
RUN mkdir -p node_modules/@inception/cloud-mesh/dist
COPY --from=builder /mono/packages/cloud-mesh/dist/ ./node_modules/@inception/cloud-mesh/dist/
COPY --from=builder /mono/packages/cloud-mesh/package.json ./node_modules/@inception/cloud-mesh/

RUN mkdir -p node_modules/@inception/inception-core/dist
COPY --from=builder /mono/packages/inception-core/dist/ ./node_modules/@inception/inception-core/dist/
COPY --from=builder /mono/packages/inception-core/package.json ./node_modules/@inception/inception-core/

ENV NODE_ENV=production
ENV PORT=4300

VOLUME ["/data/forge"]
EXPOSE 4300

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:4300/health || exit 1

CMD ["node", "dist/server.js"]
