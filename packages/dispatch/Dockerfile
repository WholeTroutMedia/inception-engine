FROM node:22-alpine

# better-sqlite3 requires native compilation — install build tools
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy manifests first for layer caching
COPY packages/dispatch/package.json ./
RUN npm install

# Copy source files
COPY packages/dispatch/src/ ./src/

# Write a fully self-contained tsconfig — no workspace extends needed
RUN echo '{"compilerOptions":{"target":"ES2022","module":"NodeNext","moduleResolution":"NodeNext","outDir":"build","rootDir":"src","strict":true,"esModuleInterop":true,"skipLibCheck":true,"declaration":true,"sourceMap":true},"include":["src/**/*"],"exclude":["node_modules","build"]}' > tsconfig.json

RUN npx tsc

# Data directory — mount NAS volume here in docker-compose
RUN mkdir -p /data
ENV DISPATCH_STORE_DIR=/data

EXPOSE 5050

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD wget -qO- http://localhost:5050/health || exit 1

# Prune dev deps — keep better-sqlite3 native bindings (runtime dep)
RUN npm prune --production

CMD ["node", "build/server.js"]

