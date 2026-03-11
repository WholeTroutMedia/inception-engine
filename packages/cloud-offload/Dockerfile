FROM node:22-slim

WORKDIR /app

# Ensure standard build dependencies are present
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json tsconfig.json ./

# Install exactly what we need
RUN npm install express @genkit-ai/vertexai genkit
RUN npm install -D typescript @types/express @types/node

COPY src/ ./src/

# Compile TypeScript
RUN npm run build

# Only need production dependencies for the run phase
ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]
