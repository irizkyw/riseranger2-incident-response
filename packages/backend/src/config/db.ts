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

// Pre-warm database pool on boot and ensure database-level anti-race partial index
prisma.$connect().then(async () => {
  try {
    // Partial unique index: Allows unlimited wrong attempts (is_correct=false),
    // but strictly enforces at database level that at most ONE correct solve (is_correct=true)
    // can ever exist per team and challenge.
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "unique_correct_team_challenge_submission"
      ON "submissions" ("team_id", "challenge_id")
      WHERE "is_correct" = true;
    `);
  } catch (err) {
    // Silent ignore if tables are not yet created during migrations/first seed
  }
}).catch(() => {});

export default prisma;
