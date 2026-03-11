FROM node:22-alpine

WORKDIR /app

# Copy package manifest and install only redis (no build step needed)
COPY packages/mobile-bridge/package.json ./
RUN npm install --omit=dev

# Copy source
COPY packages/mobile-bridge/src/ ./src/

EXPOSE 4800

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget -qO- http://localhost:4800/health || exit 1

CMD ["node", "src/server.js"]
