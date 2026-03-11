# Wearable Ingestion MCP — Docker Configuration

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY tsconfig.json ./

# Install dependencies (need dev for tsc)
RUN npm install

# Copy source and build
COPY src/ ./src/
RUN npm run build

# Runtime env
ENV NODE_ENV=production
ENV REDIS_URL=redis://redis:6379
ENV DISPATCH_URL=http://dispatch:5050
ENV PORT=4350

# HTTP server for incoming wearable webhooks + health
EXPOSE 4350

CMD ["node", "dist/server.js"]
