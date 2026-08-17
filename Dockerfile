FROM oven/bun:1-slim AS base
WORKDIR /app

# Install OpenSSL for Prisma engine compatibility and networking utilities
RUN apt-get update -y && apt-get install -y openssl ca-certificates curl && rm -rf /var/lib/apt/lists/*

# Copy dependency definition
COPY package.json ./
COPY packages/backend/package.json ./packages/backend/

# Install dependencies
RUN bun install

# Copy Prisma schema & generate client
COPY packages/backend/prisma ./packages/backend/prisma
RUN cd packages/backend && bun x prisma generate

# Copy source code and config
COPY packages/backend/tsconfig.json ./packages/backend/
COPY packages/backend/src ./packages/backend/src
COPY packages/backend/docker-entrypoint.sh ./packages/backend/

RUN chmod +x ./packages/backend/docker-entrypoint.sh

WORKDIR /app/packages/backend

# Environment & Ports
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "src/index.ts"]
