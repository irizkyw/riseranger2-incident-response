import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@ctf.local',
      password_hash: adminPassword,
      role: 'ADMIN',
    },
  });

  console.log('Admin user created:', admin.username);

  const event = await prisma.event.create({
    data: {
      name: 'Mahasiswa CTF',
      join_token: 'MAHA2026',
    },
  });

  console.log('Mahasiswa event created:', event.name);

  const event2 = await prisma.event.create({
    data: {
      name: 'Umum CTF',
      join_token: 'UMUM2026',
    },
  });

  console.log('Umum event created:', event2.name);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
