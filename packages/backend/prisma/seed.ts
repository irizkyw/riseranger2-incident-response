import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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

const hashFlag = (flag: string): string => {
  return crypto.createHash('sha256').update(flag.trim()).digest('hex');
};

async function main() {
  console.log('🧹 Cleaning old database records...');
  // Clean up all existing records for a pristine tournament state
  await (prisma as any).challengeAttempt?.deleteMany().catch(() => {});
  await (prisma as any).writeupSubmission?.deleteMany().catch(() => {});
  await prisma.writeup.deleteMany().catch(() => {});
  await (prisma as any).userTeamHistory?.deleteMany().catch(() => {});
  await prisma.eventToken.deleteMany();
  await prisma.firstBlood.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.user.deleteMany();
  await prisma.event.deleteMany();
  await prisma.category.deleteMany();
  await (prisma as any).customRole?.deleteMany().catch(() => {});

  console.log('🛡️ 1. Seeding Custom Roles & Hierarchies...');
  try {
    await (prisma as any).customRole.createMany({
      data: [
        {
          name: 'ADMIN',
          display_name: 'Super Administrator',
          description: 'Full access to all system features, events, challenges, and configurations.',
          badge_color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
          permissions: ['*'],
          is_system: true
        },
        {
          name: 'WADMIN',
          display_name: 'Wakil Administrator (Wadmin)',
          description: 'Akses penuh seluruh kontrol HQ, live radar, event, tantangan, dan moderasi peserta, diproteksi dari pengubahan akun Super Admin.',
          badge_color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
          permissions: ['*'],
          is_system: true
        },
        {
          name: 'JURY',
          display_name: 'Juri & Penilai',
          description: 'Evaluates writeups and reviews challenge submissions.',
          badge_color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          permissions: ['view_challenges', 'evaluate_writeups', 'view_scoreboard'],
          is_system: true
        },
        {
          name: 'MODERATOR',
          display_name: 'Moderator Kompetisi',
          description: 'Monitors teams, audits logs, and tracks live challenge activity.',
          badge_color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
          permissions: ['view_challenges', 'manage_teams', 'view_activity', 'view_logs'],
          is_system: true
        },
        {
          name: 'PARTICIPANT',
          display_name: 'Partisipan / Operative',
          description: 'Standard CTF competitor role.',
          badge_color: 'text-primary bg-primary/10 border-primary/30',
          permissions: ['view_challenges', 'submit_flags', 'view_scoreboard', 'manage_own_team'],
          is_system: true
        }
      ]
    });
  } catch (err) {
    console.warn('CustomRole createMany skipped:', err);
  }

  console.log('🚩 2. Seeding Event Arenas...');
  const mainEvent = await prisma.event.create({
    data: {
      name: 'RiseRanger 2 CTF 2026',
      join_token: 'RISERANGER2026',
      participation_mode: 'TEAM',
      min_team_size: 1,
      max_team_size: 5,
      is_active: true,
      is_chained: true,
      start_time: new Date(Date.now() - 1000 * 60 * 60 * 4), // Started 4 hours ago
      end_time: new Date(Date.now() + 1000 * 60 * 60 * 20),
    },
  });

  const mhsEvent = await prisma.event.create({
    data: {
      name: 'CTF Kategori Mahasiswa 2026',
      join_token: 'MAHA2026',
      participation_mode: 'TEAM',
      min_team_size: 1,
      max_team_size: 3,
      is_active: true,
      is_chained: true,
      start_time: new Date(Date.now() - 1000 * 60 * 60 * 5),
      end_time: new Date(Date.now() + 1000 * 60 * 60 * 19),
    },
  });

  const umumEvent = await prisma.event.create({
    data: {
      name: 'CTF Kategori Umum 2026',
      join_token: 'UMUM2026',
      participation_mode: 'HYBRID',
      min_team_size: 1,
      max_team_size: 4,
      is_active: true,
      is_chained: false,
      start_time: new Date(Date.now() - 1000 * 60 * 60 * 6),
      end_time: new Date(Date.now() + 1000 * 60 * 60 * 18),
    },
  });

  console.log('🎫 3. Seeding Event Access Tokens...');
  const tokensToSeed = [
    { token: 'RR26-VIP-ALPHA', event_id: mainEvent.id, label: 'Main Event VIP Key' },
    { token: 'RR26-VIP-BETA', event_id: mainEvent.id, label: 'Main Event Ticket 2' },
    { token: 'RR26-MHS-001', event_id: mhsEvent.id, label: 'Univ Indonesia Squad Ticket' },
    { token: 'RR26-MHS-002', event_id: mhsEvent.id, label: 'ITB Cyber Security Ticket' },
    { token: 'RR26-UMUM-001', event_id: umumEvent.id, label: 'Professional Security Batch' },
  ];

  for (const t of tokensToSeed) {
    await prisma.eventToken.create({
      data: {
        token: t.token,
        event_id: t.event_id,
        label: t.label,
        is_used: false,
      }
    });
  }

  console.log('📦 4. Seeding Challenge Categories...');
  const categoryNames = [
    'INCIDENT_RESPONSE',
    'DIGITAL_FORENSICS',
    'WEB_EXPLOITATION',
    'NETWORK_ANALYSIS',
    'REVERSE_ENGINEERING',
    'CRYPTOGRAPHY',
    'MISC'
  ];

  for (const name of categoryNames) {
    await prisma.category.create({
      data: { name }
    });
  }

  console.log('👤 5. Seeding Staff Accounts (Admin, Wadmin, Jury, Moderator)...');
  const defaultPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@ctf.local',
      password_hash: defaultPassword,
      role: 'ADMIN',
      event_id: mainEvent.id,
    },
  });

  const wadmin = await prisma.user.create({
    data: {
      username: 'wadmin',
      email: 'wadmin@ctf.local',
      password_hash: await bcrypt.hash('wadmin123', 10),
      role: 'WADMIN',
      event_id: mainEvent.id,
    },
  });

  const jury = await prisma.user.create({
    data: {
      username: 'jury',
      email: 'jury@ctf.local',
      password_hash: await bcrypt.hash('jury123', 10),
      role: 'JURY',
      event_id: mainEvent.id,
    },
  });

  const moderator = await prisma.user.create({
    data: {
      username: 'moderator',
      email: 'moderator@ctf.local',
      password_hash: await bcrypt.hash('moderator123', 10),
      role: 'MODERATOR',
      event_id: mainEvent.id,
    },
  });

  console.log('👥 6. Seeding Participant Competitor Users...');
  const u1 = await prisma.user.create({
    data: {
      username: 'shadow_hunter',
      email: 'shadow@ctf.local',
      password_hash: userPassword,
      role: 'PARTICIPANT',
      event_id: mainEvent.id,
    },
  });

  const u2 = await prisma.user.create({
    data: {
      username: 'cipher_ghost',
      email: 'cipher@ctf.local',
      password_hash: userPassword,
      role: 'PARTICIPANT',
      event_id: mainEvent.id,
    },
  });

  const u3 = await prisma.user.create({
    data: {
      username: 'byte_ninja',
      email: 'ninja@ctf.local',
      password_hash: userPassword,
      role: 'PARTICIPANT',
      event_id: mainEvent.id,
    },
  });

  const u4 = await prisma.user.create({
    data: {
      username: 'neon_spectre',
      email: 'neon@ctf.local',
      password_hash: userPassword,
      role: 'PARTICIPANT',
      event_id: mainEvent.id,
    },
  });

  const u5 = await prisma.user.create({
    data: {
      username: 'zero_day',
      email: 'zeroday@ctf.local',
      password_hash: userPassword,
      role: 'PARTICIPANT',
      event_id: mainEvent.id,
    },
  });

  const u6 = await prisma.user.create({
    data: {
      username: 'red_sentinel',
      email: 'red@ctf.local',
      password_hash: userPassword,
      role: 'PARTICIPANT',
      event_id: mainEvent.id,
    },
  });

  const u7 = await prisma.user.create({
    data: {
      username: 'apex_predator',
      email: 'apex@ctf.local',
      password_hash: userPassword,
      role: 'PARTICIPANT',
      event_id: mainEvent.id,
    },
  });

  const u8 = await prisma.user.create({
    data: {
      username: 'solo_operative',
      email: 'solo@ctf.local',
      password_hash: userPassword,
      role: 'PARTICIPANT',
      event_id: mainEvent.id,
    },
  });

  console.log('🛡️ 7. Seeding Teams & Roster Memberships...');
  // Team 1: Aegis Cyber Squad (Rank #1)
  const team1 = await prisma.team.create({
    data: {
      name: 'Aegis Cyber Squad',
      invite_code: 'AEGIS26',
      leader_id: u1.id,
      color: '#00F0FF',
      event_id: mainEvent.id,
      score: 0, // will be updated based on solves
    },
  });
  await prisma.teamMember.createMany({
    data: [
      { team_id: team1.id, user_id: u1.id },
      { team_id: team1.id, user_id: u2.id },
      { team_id: team1.id, user_id: u3.id },
    ]
  });

  // Team 2: Shadow Legion (Rank #2)
  const team2 = await prisma.team.create({
    data: {
      name: 'Shadow Legion',
      invite_code: 'SHADOW26',
      leader_id: u4.id,
      color: '#A855F7',
      event_id: mainEvent.id,
      score: 0,
    },
  });
  await prisma.teamMember.createMany({
    data: [
      { team_id: team2.id, user_id: u4.id },
      { team_id: team2.id, user_id: u5.id },
    ]
  });

  // Team 3: Red Team Syndicate (Rank #3)
  const team3 = await prisma.team.create({
    data: {
      name: 'Red Team Syndicate',
      invite_code: 'REDTEAM26',
      leader_id: u6.id,
      color: '#F43F5E',
      event_id: mainEvent.id,
      score: 0,
    },
  });
  await prisma.teamMember.create({
    data: { team_id: team3.id, user_id: u6.id }
  });

  // Team 4: Binary Apex (Rank #4)
  const team4 = await prisma.team.create({
    data: {
      name: 'Binary Apex',
      invite_code: 'APEX26',
      leader_id: u7.id,
      color: '#10B981',
      event_id: mainEvent.id,
      score: 0,
    },
  });
  await prisma.teamMember.create({
    data: { team_id: team4.id, user_id: u7.id }
  });

  // Team 5: Solo Operative Unit (Rank #5)
  const team5 = await prisma.team.create({
    data: {
      name: 'Ghost Operative',
      invite_code: 'GHOST26',
      leader_id: u8.id,
      color: '#FACC15',
      event_id: mainEvent.id,
      score: 0,
    },
  });
  await prisma.teamMember.create({
    data: { team_id: team5.id, user_id: u8.id }
  });

  console.log('🎯 8. Seeding Challenges for Main Arena & Sub-Arenas...');
  const mainChallengesData = [
    {
      title: 'Apache Access Log Triage',
      category: 'INCIDENT_RESPONSE',
      points: 100,
      flag: 'FLAG{apache_access_log_rce_found}',
      description: 'Sebuah web server production dilaporkan mengalami lonjakan traffic aneh. Periksa access.log dan temukan IP attacker serta command injection yang dieksekusi.',
      hint: 'Cari request method POST dengan status code 200 yang mengakses endpoint /cgi-bin/.',
      hint_cost: 20,
    },
    {
      title: 'Ransomware Note Investigation',
      category: 'DIGITAL_FORENSICS',
      points: 150,
      flag: 'FLAG{shadow_copy_deleted_vssadmin}',
      description: 'Host Windows klien terinfeksi ransomware LockBit. Temukan command PowerShell / Batch yang digunakan malware untuk menghapus Volume Shadow Copies.',
      hint: 'Periksa command yang mengeksekusi binary bawaan vssadmin.exe atau wmic shadowcopy delete.',
      hint_cost: 30,
    },
    {
      title: 'Memory Dump Analysis - LSASS Injection',
      category: 'DIGITAL_FORENSICS',
      points: 250,
      flag: 'FLAG{mimikatz_lsass_dump_detected}',
      description: 'Ditemukan file memory dump (vmem) dari domain controller yang disusupi. Identifikasi tool credential dumping yang disuntikkan ke proses lsass.exe.',
      hint: 'Gunakan Volatility plugin windows.malfind atau windows.pslist.',
      hint_cost: 50,
    },
    {
      title: 'Suspicious DNS Tunneling PCAP',
      category: 'NETWORK_ANALYSIS',
      points: 200,
      flag: 'FLAG{c2_dns_tunneling_exfiltration}',
      description: 'SOC Alert mendeteksi anomali volume DNS query TXT record yang sangat tinggi ke domain asing. Analisis file pcap dan rekonstruksi payload yang diekfiltrasi.',
      hint: 'Decode base64 chunk pada subdomain query TXT record di Wireshark.',
      hint_cost: 40,
    },
    {
      title: 'Helpdesk Portal SQLi Bypass',
      category: 'WEB_EXPLOITATION',
      points: 300,
      flag: 'FLAG{union_based_auth_bypass_success}',
      description: 'Portal internal helpdesk rentan terhadap SQL Injection pada form login admin. Ekstrak secret flag yang tersimpan di table internal_config.',
      hint: 'Gunakan UNION SELECT payload untuk membypass otentikasi login admin.',
      hint_cost: 60,
    },
    {
      title: 'Obfuscated PowerShell Downloader',
      category: 'REVERSE_ENGINEERING',
      points: 350,
      flag: 'FLAG{amsi_bypass_obfuscated_string}',
      description: 'SOC berhasil mengisolasi script dropper PowerShell yang sangat diobfuskasi dengan XOR dan Base64 multilayer. Deobfuskasi script dan temukan AMSI bypass string.',
      hint: 'Gunakan tool CyberChef atau deobfuscator pipeline untuk melepaskan layer XOR.',
      hint_cost: 70,
    },
    {
      title: 'Corrupted Windows Event Log (.evtx)',
      category: 'INCIDENT_RESPONSE',
      points: 400,
      flag: 'FLAG{event_4624_type_10_rdp_breach}',
      description: 'Attacker mencoba menghapus Security Event Log setelah melakukan lateral movement via RDP. Analisis sisa log Event ID 4624 (Logon Type 10) untuk mengungkap akun yang dikompromikan.',
      hint: 'Cari logon type 10 (RemoteInteractive) pada Event Viewer.',
      hint_cost: 80,
    },
    {
      title: 'Ransomware Master Decryption Key',
      category: 'CRYPTOGRAPHY',
      points: 500,
      flag: 'FLAG{elliptic_curve_weak_nonce_recovered}',
      description: 'Ditemukan dua ciphertext terenkripsi ransomware yang menggunakan ECDSA nonce yang sama (nonce reuse vulnerability). Rekonstruksi private key attacker untuk mendekripsi data.',
      hint: 'Gunakan serangan ECDSA Repeated k-value untuk mengkalkulasi private key d.',
      hint_cost: 100,
    },
  ];

  const createdMainChallenges: any[] = [];
  for (const c of mainChallengesData) {
    const chal = await prisma.challenge.create({
      data: {
        title: c.title,
        description: c.description,
        category: c.category,
        points: c.points,
        flag: c.flag,
        flag_hash: hashFlag(c.flag),
        hint: c.hint,
        hint_cost: c.hint_cost,
        is_active: true,
        event_id: mainEvent.id,
        created_by: admin.id,
      },
    });
    createdMainChallenges.push(chal);
  }

  // Mahasiswa Event Challenges
  const mhsChallengesData = [
    {
      title: 'Basic Wireshark HTTP Extraction [Mhs]',
      category: 'NETWORK_ANALYSIS',
      points: 100,
      flag: 'FLAG{mhs_plaintext_cred_found}',
      description: 'Lakukan analisis paket pcap sederhana dan temukan kredensial plaintext yang dikirim melalui protokol HTTP unencrypted.',
      hint: 'Filter Wireshark: http.request.method == "POST"',
      hint_cost: 20,
    },
    {
      title: 'Linux Syslog Brute Force Analysis [Mhs]',
      category: 'INCIDENT_RESPONSE',
      points: 150,
      flag: 'FLAG{mhs_ssh_bruteforce_ip_banned}',
      description: 'Analisis file /var/log/auth.log dan identifikasi IP attacker yang melakukan SSH brute-force attack bertubi-tubi.',
      hint: 'Gunakan grep "Failed password" auth.log | awk...',
      hint_cost: 30,
    },
    {
      title: 'Hidden Metadata in Exif [Mhs]',
      category: 'DIGITAL_FORENSICS',
      points: 200,
      flag: 'FLAG{mhs_exiftool_geotag_extracted}',
      description: 'Ekstrak metadata tersembunyi pada barang bukti gambar evidence.jpg menggunakan exiftool.',
      hint: 'Periksa field Artist, Comment, atau GPS coordinates.',
      hint_cost: 40,
    },
  ];

  for (const c of mhsChallengesData) {
    await prisma.challenge.create({
      data: {
        title: c.title,
        description: c.description,
        category: c.category,
        points: c.points,
        flag: c.flag,
        flag_hash: hashFlag(c.flag),
        hint: c.hint,
        hint_cost: c.hint_cost,
        is_active: true,
        event_id: mhsEvent.id,
        created_by: admin.id,
      },
    });
  }

  console.log('⚡ 9. Seeding Realistic Submissions (Valid Solves & Wrong Attempts)...');
  const c0 = createdMainChallenges[0]; // 100 pts
  const c1 = createdMainChallenges[1]; // 150 pts
  const c2 = createdMainChallenges[2]; // 250 pts
  const c3 = createdMainChallenges[3]; // 200 pts
  const c4 = createdMainChallenges[4]; // 300 pts
  const c5 = createdMainChallenges[5]; // 350 pts

  // Team 1 (Aegis Cyber Squad) Solves: c0, c1, c2, c3 = 100 + 150 + 250 + 200 = 700 pts
  // Member 1 (u1 shadow_hunter): Solved c0 & c3 (300 pts) + 1 wrong attempt
  // Member 2 (u2 cipher_ghost): Solved c1 (150 pts)
  // Member 3 (u3 byte_ninja): Solved c2 (250 pts) + 1 wrong attempt
  await prisma.submission.createMany({
    data: [
      // c0 by u1 (SOLVED)
      { team_id: team1.id, user_id: u1.id, challenge_id: c0.id, is_correct: true, submitted_at: new Date(Date.now() - 1000 * 60 * 180) },
      // wrong attempt on c1 by u1
      { team_id: team1.id, user_id: u1.id, challenge_id: c1.id, is_correct: false, submitted_at: new Date(Date.now() - 1000 * 60 * 160) },
      // c1 by u2 (SOLVED)
      { team_id: team1.id, user_id: u2.id, challenge_id: c1.id, is_correct: true, submitted_at: new Date(Date.now() - 1000 * 60 * 140) },
      // wrong attempt on c2 by u3
      { team_id: team1.id, user_id: u3.id, challenge_id: c2.id, is_correct: false, submitted_at: new Date(Date.now() - 1000 * 60 * 110) },
      // c2 by u3 (SOLVED)
      { team_id: team1.id, user_id: u3.id, challenge_id: c2.id, is_correct: true, submitted_at: new Date(Date.now() - 1000 * 60 * 90) },
      // c3 by u1 (SOLVED)
      { team_id: team1.id, user_id: u1.id, challenge_id: c3.id, is_correct: true, submitted_at: new Date(Date.now() - 1000 * 60 * 60) },
    ]
  });

  // Team 2 (Shadow Legion) Solves: c0, c1, c3 = 100 + 150 + 200 = 450 pts
  // Member 1 (u4 neon_spectre): Solved c0 & c1 (250 pts) + 1 wrong
  // Member 2 (u5 zero_day): Solved c3 (200 pts) + 1 wrong
  await prisma.submission.createMany({
    data: [
      { team_id: team2.id, user_id: u4.id, challenge_id: c0.id, is_correct: true, submitted_at: new Date(Date.now() - 1000 * 60 * 170) },
      { team_id: team2.id, user_id: u4.id, challenge_id: c1.id, is_correct: true, submitted_at: new Date(Date.now() - 1000 * 60 * 130) },
      { team_id: team2.id, user_id: u5.id, challenge_id: c2.id, is_correct: false, submitted_at: new Date(Date.now() - 1000 * 60 * 100) },
      { team_id: team2.id, user_id: u5.id, challenge_id: c3.id, is_correct: true, submitted_at: new Date(Date.now() - 1000 * 60 * 50) },
      { team_id: team2.id, user_id: u4.id, challenge_id: c4.id, is_correct: false, submitted_at: new Date(Date.now() - 1000 * 60 * 20) },
    ]
  });

  // Team 3 (Red Team Syndicate) Solves: c0, c3 = 100 + 200 = 300 pts
  await prisma.submission.createMany({
    data: [
      { team_id: team3.id, user_id: u6.id, challenge_id: c0.id, is_correct: true, submitted_at: new Date(Date.now() - 1000 * 60 * 150) },
      { team_id: team3.id, user_id: u6.id, challenge_id: c1.id, is_correct: false, submitted_at: new Date(Date.now() - 1000 * 60 * 120) },
      { team_id: team3.id, user_id: u6.id, challenge_id: c3.id, is_correct: true, submitted_at: new Date(Date.now() - 1000 * 60 * 40) },
    ]
  });

  // Team 4 (Binary Apex) Solves: c0 = 100 pts
  await prisma.submission.createMany({
    data: [
      { team_id: team4.id, user_id: u7.id, challenge_id: c0.id, is_correct: true, submitted_at: new Date(Date.now() - 1000 * 60 * 140) },
      { team_id: team4.id, user_id: u7.id, challenge_id: c2.id, is_correct: false, submitted_at: new Date(Date.now() - 1000 * 60 * 70) },
    ]
  });

  // Team 5 (Ghost Operative) Solves: c1 = 150 pts
  await prisma.submission.createMany({
    data: [
      { team_id: team5.id, user_id: u8.id, challenge_id: c0.id, is_correct: false, submitted_at: new Date(Date.now() - 1000 * 60 * 160) },
      { team_id: team5.id, user_id: u8.id, challenge_id: c1.id, is_correct: true, submitted_at: new Date(Date.now() - 1000 * 60 * 80) },
      { team_id: team5.id, user_id: u8.id, challenge_id: c3.id, is_correct: false, submitted_at: new Date(Date.now() - 1000 * 60 * 30) },
    ]
  });

  // Update Team Scores
  await prisma.team.update({ where: { id: team1.id }, data: { score: 700 } });
  await prisma.team.update({ where: { id: team2.id }, data: { score: 450 } });
  await prisma.team.update({ where: { id: team3.id }, data: { score: 300 } });
  await prisma.team.update({ where: { id: team4.id }, data: { score: 100 } });
  await prisma.team.update({ where: { id: team5.id }, data: { score: 150 } });

  console.log('🩸 10. Seeding First Blood Records...');
  // c0 first blood: Team 1 (Aegis Cyber Squad)
  await prisma.firstBlood.create({
    data: {
      challenge_id: c0.id,
      team_id: team1.id,
      achieved_at: new Date(Date.now() - 1000 * 60 * 180),
    }
  });

  // c1 first blood: Team 1 (Aegis Cyber Squad)
  await prisma.firstBlood.create({
    data: {
      challenge_id: c1.id,
      team_id: team1.id,
      achieved_at: new Date(Date.now() - 1000 * 60 * 140),
    }
  });

  // c2 first blood: Team 1 (Aegis Cyber Squad)
  await prisma.firstBlood.create({
    data: {
      challenge_id: c2.id,
      team_id: team1.id,
      achieved_at: new Date(Date.now() - 1000 * 60 * 90),
    }
  });

  // c3 first blood: Team 1 (Aegis Cyber Squad)
  await prisma.firstBlood.create({
    data: {
      challenge_id: c3.id,
      team_id: team1.id,
      achieved_at: new Date(Date.now() - 1000 * 60 * 60),
    }
  });

  console.log('💡 10.5 Seeding Unlocked Hints...');
  await (prisma as any).unlockedHint.createMany({
    data: [
      // Aegis Cyber Squad unlocked hint on c1 (30 pts)
      {
        team_id: team1.id,
        user_id: u1.id,
        challenge_id: c1.id,
        event_id: mainEvent.id,
        cost_deducted: 30,
        unlocked_at: new Date(Date.now() - 1000 * 60 * 150),
      },
      // Shadow Legion unlocked hint on c2 (50 pts)
      {
        team_id: team2.id,
        user_id: u5.id,
        challenge_id: c2.id,
        event_id: mainEvent.id,
        cost_deducted: 50,
        unlocked_at: new Date(Date.now() - 1000 * 60 * 105),
      }
    ]
  });

  console.log('📜 11. Seeding User Team Histories (Past & Current Squads)...');
  await (prisma as any).userTeamHistory.createMany({
    data: [
      // shadow_hunter history
      {
        user_id: u1.id,
        team_name: 'Aegis Cyber Squad',
        invite_code: 'AEGIS26',
        role: 'LEADER',
        event_name: 'RiseRanger 2 CTF 2026',
        action: 'CREATED',
        color: '#00F0FF',
        score: 700,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 4),
      },
      {
        user_id: u1.id,
        team_name: 'CyberGuardians 2025',
        invite_code: 'CG2025',
        role: 'LEADER',
        event_name: 'RiseRanger National CTF 2025',
        action: 'DISBANDED',
        color: '#F59E0B',
        score: 1250,
        created_at: new Date('2025-11-20T10:00:00Z'),
      },
      {
        user_id: u1.id,
        team_name: 'Vanguard Defenders',
        invite_code: 'VG2024',
        role: 'MEMBER',
        event_name: 'Cyber Defense Arena 2024',
        action: 'LEFT',
        color: '#10B981',
        score: 850,
        created_at: new Date('2024-08-15T09:00:00Z'),
      },
      // cipher_ghost history
      {
        user_id: u2.id,
        team_name: 'Aegis Cyber Squad',
        invite_code: 'AEGIS26',
        role: 'MEMBER',
        event_name: 'RiseRanger 2 CTF 2026',
        action: 'JOINED',
        color: '#00F0FF',
        score: 700,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 4),
      },
      {
        user_id: u2.id,
        team_name: 'CryptoKnights',
        invite_code: 'CK2025',
        role: 'LEADER',
        event_name: 'Cryptography Challenge 2025',
        action: 'DISBANDED',
        color: '#A855F7',
        score: 600,
        created_at: new Date('2025-05-10T14:00:00Z'),
      },
      // neon_spectre history
      {
        user_id: u4.id,
        team_name: 'Shadow Legion',
        invite_code: 'SHADOW26',
        role: 'LEADER',
        event_name: 'RiseRanger 2 CTF 2026',
        action: 'CREATED',
        color: '#A855F7',
        score: 450,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 4),
      },
      {
        user_id: u4.id,
        team_name: 'DarkSector Ops',
        invite_code: 'DARK2025',
        role: 'LEADER',
        event_name: 'Winter Incident Triage 2025',
        action: 'DISBANDED',
        color: '#EF4444',
        score: 1100,
        created_at: new Date('2025-12-01T08:00:00Z'),
      },
      // Admin history for demo
      {
        user_id: admin.id,
        team_name: 'RiseRanger Red Team Ops',
        invite_code: 'ADMIN26',
        role: 'LEADER',
        event_name: 'RiseRanger 2 CTF 2026',
        action: 'CREATED',
        color: '#F43F5E',
        score: 0,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 10),
      }
    ]
  });

  console.log('📝 12. Seeding Writeup Submissions & Jury Evaluations...');
  await prisma.writeup.create({
    data: {
      team_id: team1.id,
      user_id: u1.id,
      event_id: mainEvent.id,
      file_url: '/uploads/writeups/aegis_incident_response_writeup.pdf',
      file_name: 'aegis_incident_response_writeup.pdf',
      file_size: 1458920,
      notes: 'Laporan investigasi insiden lengkap untuk skenario Apache RCE, LockBit Ransomware, dan LSASS memory forensics.',
      score: 95,
      feedback: 'Investigasi sangat metodologis, rantai bukti chain of custody dijaga dengan sangat rapi. Rekomendasi mitigasi praktis dan jelas.',
      evaluated_by: 'jury',
      evaluated_at: new Date(Date.now() - 1000 * 60 * 30),
      submitted_at: new Date(Date.now() - 1000 * 60 * 90),
    }
  });

  await prisma.writeup.create({
    data: {
      team_id: team2.id,
      user_id: u4.id,
      event_id: mainEvent.id,
      file_url: '/uploads/writeups/shadow_legion_forensics_report.pdf',
      file_name: 'shadow_legion_forensics_report.pdf',
      file_size: 984500,
      notes: 'Writeup digital forensics dan DNS tunneling triage report.',
      score: 85,
      feedback: 'Analisis DNS query sangat mendalam, namun deobfuskasi script powershell belum tercakup menyeluruh.',
      evaluated_by: 'jury',
      evaluated_at: new Date(Date.now() - 1000 * 60 * 20),
      submitted_at: new Date(Date.now() - 1000 * 60 * 75),
    }
  });

  console.log('\n===============================================================');
  console.log('✨ DATABASE SEEDING COMPLETED SUCCESSFULLY WITH RICH DATA! ✨');
  console.log('===============================================================');
  console.log('🔐 STAFF ACCOUNTS (HQ ACCESS):');
  console.log('  1. Super Administrator (Ketua):');
  console.log('     Username: admin       | Email: admin@ctf.local     | Pass: admin123');
  console.log('  2. Wakil Administrator (Wadmin):');
  console.log('     Username: wadmin      | Email: wadmin@ctf.local    | Pass: wadmin123');
  console.log('  3. Juri Penilai (Jury):');
  console.log('     Username: jury        | Email: jury@ctf.local      | Pass: jury123');
  console.log('  4. Moderator (Pengawas):');
  console.log('     Username: moderator   | Email: moderator@ctf.local | Pass: moderator123');
  console.log('---------------------------------------------------------------');
  console.log('🎮 PARTICIPANT OPERATIVE ACCOUNTS (Password: user123):');
  console.log('  • shadow_hunter  (Leader: Aegis Cyber Squad - 700 PTS - Rank #1)');
  console.log('  • cipher_ghost   (Member: Aegis Cyber Squad - 150 PTS)');
  console.log('  • byte_ninja     (Member: Aegis Cyber Squad - 250 PTS)');
  console.log('  • neon_spectre   (Leader: Shadow Legion     - 450 PTS - Rank #2)');
  console.log('  • zero_day       (Member: Shadow Legion     - 200 PTS)');
  console.log('  • red_sentinel   (Leader: Red Team Syndicate- 300 PTS - Rank #3)');
  console.log('  • apex_predator  (Leader: Binary Apex       - 100 PTS - Rank #4)');
  console.log('  • solo_operative (Solo Competitor           - 150 PTS - Rank #5)');
  console.log('---------------------------------------------------------------');
  console.log('📊 DATA POPULATION SUMMARY:');
  console.log('  ✓ 3 Event Arenas (Main Championship, Mahasiswa, Umum)');
  console.log('  ✓ 11 Multi-Category CTF Challenges with Flags & Hints');
  console.log('  ✓ 5 Competing Squads with Custom Colors & Dynamic Rosters');
  console.log('  ✓ 17 Realistic Flag Submissions (Solves & Wrong Attempts)');
  console.log('  ✓ 4 First Blood Records with Live Timestamps');
  console.log('  ✓ 8 User Team History Records (Current & Disbanded Squads)');
  console.log('  ✓ 2 Evaluated Writeup Reports with Jury Scores & Feedback');
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
