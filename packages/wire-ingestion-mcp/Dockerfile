# Wire Ingestion MCP — Docker Configuration

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

# MCP server runs on stdio — expose HTTP query port for Genkit tool fallback  
EXPOSE 4200

CMD ["node", "dist/server.js"]
