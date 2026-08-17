import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Automatically resolve single master .env from root or local
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

const wadminList = [
  {
    username: 'resi',
    email: 'resi@riseranger.ctf',
    password: 'ResiSecret2026!',
    name: 'Resi'
  },
  {
    username: 'ken',
    email: 'ken@riseranger.ctf',
    password: 'KenSecret2026!',
    name: 'Ken'
  },
  {
    username: 'yusuf',
    email: 'yusuf@riseranger.ctf',
    password: 'YusufSecret2026!',
    name: 'Yusuf'
  },
  {
    username: 'subhi',
    email: 'subhi@riseranger.ctf',
    password: 'SubhiSecret2026!',
    name: 'Subhi'
  },
  {
    username: 'rey',
    email: 'rey@riseranger.ctf',
    password: 'ReySecret2026!',
    name: 'Rey'
  }
];

async function main() {
  console.log('🛡️  [SEEDMOD] Starting Seeding for Wakil Administrator (WADMIN) Accounts...\n');

  // 1. Ensure WADMIN CustomRole exists
  try {
    await (prisma as any).customRole.upsert({
      where: { name: 'WADMIN' },
      update: {
        display_name: 'Wakil Administrator (Wadmin)',
        description: 'Akses penuh seluruh kontrol HQ, live radar, event, tantangan, dan moderasi peserta.',
        badge_color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
        permissions: ['*'],
        is_system: true
      },
      create: {
        name: 'WADMIN',
        display_name: 'Wakil Administrator (Wadmin)',
        description: 'Akses penuh seluruh kontrol HQ, live radar, event, tantangan, dan moderasi peserta.',
        badge_color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
        permissions: ['*'],
        is_system: true
      }
    });
    console.log('✅ Custom Role [WADMIN] ensured.');
  } catch (err) {
    console.warn('⚠️ CustomRole upsert warning:', err);
  }

  // 2. Upsert each WADMIN User
  console.log('👤 Seeding 5 WADMIN Users...');
  for (const item of wadminList) {
    const password_hash = await bcrypt.hash(item.password, 10);
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        username: item.username,
        role: 'WADMIN',
        password_hash
      },
      create: {
        username: item.username,
        email: item.email,
        password_hash,
        role: 'WADMIN'
      }
    });

    console.log(`   🟢 [${item.name}] -> Email: ${user.email} | Role: ${user.role} | Password: ${item.password}`);
  }

  console.log('\n================================================================');
  console.log('🎉 [SEEDMOD COMPLETE] 5 WADMIN Accounts Successfully Provisioned:');
  console.log('================================================================');
  wadminList.forEach((acc, idx) => {
    console.log(`${idx + 1}. Name: ${acc.name}`);
    console.log(`   Email:    ${acc.email}`);
    console.log(`   Password: ${acc.password}`);
    console.log(`   Role:     WADMIN\n`);
  });
}

main()
  .catch((e) => {
    console.error('❌ [SEEDMOD ERROR]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
