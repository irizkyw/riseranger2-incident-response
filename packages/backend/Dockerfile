FROM oven/bun:1-slim AS base
WORKDIR /app

# Install OpenSSL for Prisma engine compatibility
RUN apt-get update -y && apt-get install -y openssl ca-certificates curl && rm -rf /var/lib/apt/lists/*

# Copy dependency definition
COPY package.json ./

# Install dependencies
RUN bun install

# Copy Prisma schema & generate client
COPY prisma ./prisma
RUN bun x prisma generate

# Copy source code and config
COPY tsconfig.json ./
COPY src ./src
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

# Environment & Ports
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "src/index.ts"]
