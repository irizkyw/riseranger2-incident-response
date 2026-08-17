import { PrismaClient } from '@prisma/client';

// Ensure optimal connection pooling for high-concurrency CTF competitions
let databaseUrl = process.env.DATABASE_URL || '';
if (databaseUrl && !databaseUrl.includes('connection_limit')) {
  const separator = databaseUrl.includes('?') ? '&' : '?';
  databaseUrl = `${databaseUrl}${separator}connection_limit=25&pool_timeout=30`;
}

const prisma = new PrismaClient({
  datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Pre-warm database pool on boot to prevent cold start latency spikes
prisma.$connect().catch(() => {});

export default prisma;
