# ==============================================================================
# STAGE 1: Build Frontend Assets
# ==============================================================================
FROM oven/bun:1-slim AS builder
WORKDIR /app

# Copy dependency definition
COPY package.json ./

# Install dependencies
RUN bun install

# Copy source files
COPY tsconfig.json vite.config.ts postcss.config.js tailwind.config.js index.html ./
COPY src ./src

# Build production bundle with Vite
ENV VITE_API_URL=/api
ENV VITE_SOCKET_URL=
ENV VITE_ENABLE_DEBUG_LOGS=false
RUN bun run build

# ==============================================================================
# STAGE 2: Nginx Production Server
# ==============================================================================
FROM nginx:alpine AS runner

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
