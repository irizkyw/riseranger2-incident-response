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

    // Ensure unlocked_hints supports per-hint indexing
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "unlocked_hints" ADD COLUMN IF NOT EXISTS "hint_index" INTEGER NOT NULL DEFAULT 0;
      DROP INDEX IF EXISTS "unlocked_hints_team_id_challenge_id_key";
      CREATE UNIQUE INDEX IF NOT EXISTS "unlocked_hints_team_id_challenge_id_hint_index_key"
      ON "unlocked_hints" ("team_id", "challenge_id", "hint_index");
    `);

    // Ensure writeups table supports persistent database storage fallback
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "writeups" ADD COLUMN IF NOT EXISTS "file_data" TEXT;
    `);
  } catch (err) {
    // Silent ignore if tables are not yet created during migrations/first seed
  }
}).catch(() => {});

export default prisma;
