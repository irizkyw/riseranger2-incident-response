import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const rootEnv = path.resolve(process.cwd(), '../../.env');
const localEnv = path.resolve(process.cwd(), '.env');

if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else {
  dotenv.config();
}

const prisma = new PrismaClient();

async function main() {
  const isForce = process.env.FORCE_SEED === 'true';

  if (isForce) {
    console.log('🧹 [FORCE_SEED] Cleaning old database records...');
    await (prisma as any).challengeAttempt?.deleteMany().catch(() => { });
    await (prisma as any).writeupSubmission?.deleteMany().catch(() => { });
    await prisma.writeup.deleteMany().catch(() => { });
    await (prisma as any).userTeamHistory?.deleteMany().catch(() => { });
    await prisma.eventToken.deleteMany();
    await prisma.firstBlood.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.challenge.deleteMany();
    await prisma.user.deleteMany();
    await prisma.event.deleteMany();
    await prisma.category.deleteMany();
    await (prisma as any).customRole?.deleteMany().catch(() => { });
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } }).catch(() => null);
  if (existingAdmin && !isForce) {
    console.log('✨ Admin already exists. Skipping seed.');
    return;
  }

  console.log('🛡️ Seeding ADMIN CustomRole...');
  await (prisma as any).customRole.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      display_name: 'Super Administrator',
      description: 'Full access to all system features, events, challenges, and configurations.',
      badge_color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      permissions: ['*'],
      is_system: true,
    },
  }).catch(async () => {
    // fallback if no unique constraint on name for upsert
    const exists = await (prisma as any).customRole.findFirst({ where: { name: 'ADMIN' } }).catch(() => null);
    if (!exists) {
      await (prisma as any).customRole.create({
        data: {
          name: 'ADMIN',
          display_name: 'Super Administrator',
          description: 'Full access to all system features, events, challenges, and configurations.',
          badge_color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
          permissions: ['*'],
          is_system: true,
        },
      }).catch(() => { });
    }
  });

  console.log('🚩 Seeding base Event (required FK for user)...');
  let mainEvent = await prisma.event.findFirst({ where: { join_token: 'RISERANGER2026' } });
  if (!mainEvent) {
    mainEvent = await prisma.event.create({
      data: {
        name: 'RiseRanger 2 CTF 2026',
        join_token: 'RISERANGER2026',
        participation_mode: 'TEAM',
        min_team_size: 1,
        max_team_size: 5,
        is_active: true,
        is_chained: true,
        start_time: new Date(Date.now() - 1000 * 60 * 60 * 4),
        end_time: new Date(Date.now() + 1000 * 60 * 60 * 20),
      },
    });
  }

  console.log('👤 Seeding Admin Account...');
  const defaultPassword = await bcrypt.hash('!ctfriseranger#017', 10);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@ctf.local',
      password_hash: defaultPassword,
      role: 'ADMIN',
      event_id: mainEvent.id,
    },
  });

  console.log('\n===============================================================');
  console.log('✨ ADMIN SEEDED SUCCESSFULLY ✨');
  console.log('===============================================================');
  console.log(`Username: admin`);
  console.log(`Email:    admin@ctf.local`);
  console.log(`Password: !ctfriseranger#017`);
  console.log(`User ID:  ${admin.id}`);
  console.log('===============================================================\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });