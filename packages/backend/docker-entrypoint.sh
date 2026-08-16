#!/bin/sh
set -e

echo "🚀 [RISERANGER 2] Starting Backend Container..."

# Push Prisma Database Schema
echo "📦 Running Prisma DB Push..."
bun x prisma db push --accept-data-loss || true

# Seed database if DB_SEED=true
if [ "$DB_SEED" = "true" ]; then
  echo "🌱 Seeding initial tournament data..."
  bun run prisma/seed.ts || true
fi

echo "⚡ Starting Backend Service..."
exec "$@"
