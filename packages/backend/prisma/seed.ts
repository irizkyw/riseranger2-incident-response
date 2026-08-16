import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Automatically resolve single master .env from root or local
const rootEnv = path.resolve(process.cwd(), '../../.env');
const localEnv = path.resolve(process.cwd(), '.env');
const rootDirect = path.resolve(process.cwd(), '.env');

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
  const forceSeed = process.env.FORCE_SEED === 'true';
  const existingUsers = await prisma.user.count();

  if (existingUsers > 0 && !forceSeed) {
    console.log(`ℹ️ [SEED] Database sudah berisi ${existingUsers} user & data kompetisi. Seeding dilewati untuk menjaga session login dan data peserta.`);
    return;
  }

  console.log('🧹 Cleaning old database records...');
  // Clean up existing data to allow clean re-seeding
  await prisma.eventToken.deleteMany();
  await prisma.firstBlood.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.user.deleteMany();
  await prisma.event.deleteMany();
  await prisma.category.deleteMany();

  console.log('🚩 Seeding Event Arenas...');
  const mainEvent = await prisma.event.create({
    data: {
      name: 'RiseRanger 2 CTF 2026',
      join_token: 'RISERANGER2026',
      is_active: true,
      is_chained: true,
      start_time: new Date(Date.now() - 1000 * 60 * 60 * 2),
      end_time: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  const mhsEvent = await prisma.event.create({
    data: {
      name: 'CTF Kategori Mahasiswa 2026',
      join_token: 'MAHA2026',
      is_active: true,
      is_chained: true,
      start_time: new Date(Date.now() - 1000 * 60 * 60 * 3),
      end_time: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  const umumEvent = await prisma.event.create({
    data: {
      name: 'CTF Kategori Umum 2026',
      join_token: 'UMUM2026',
      is_active: true,
      is_chained: false,
      start_time: new Date(Date.now() - 1000 * 60 * 60 * 4),
      end_time: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  console.log('🎫 Seeding Access Tokens for Events...');
  const tokensToSeed = [
    // Main Event Tokens
    { token: 'RR26-VIP-ALPHA', event_id: mainEvent.id, label: 'Main Event VIP Key' },
    { token: 'RR26-VIP-BETA', event_id: mainEvent.id, label: 'Main Event Ticket 2' },
    // Mahasiswa Event Tokens
    { token: 'RR26-MHS-001', event_id: mhsEvent.id, label: 'Mahasiswa Team A Ticket' },
    { token: 'RR26-MHS-002', event_id: mhsEvent.id, label: 'Mahasiswa Team B Ticket' },
    { token: 'RR26-MHS-003', event_id: mhsEvent.id, label: 'Univ Indonesia Squad' },
    { token: 'RR26-MHS-004', event_id: mhsEvent.id, label: 'ITB Cyber Team' },
    // Umum Event Tokens
    { token: 'RR26-UMUM-001', event_id: umumEvent.id, label: 'Umum Team C Ticket' },
    { token: 'RR26-UMUM-002', event_id: umumEvent.id, label: 'Professional Security Batch' },
    { token: 'RR26-UMUM-003', event_id: umumEvent.id, label: 'Open Arena Ticket' },
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

  console.log('📦 Seeding Categories...');
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

  console.log('👤 Seeding Admin User...');
  const defaultPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@ctf.local',
      password_hash: defaultPassword,
      role: 'ADMIN',
      event_id: mainEvent.id,
    },
  });

  console.log('🎯 Seeding Challenges for Main & Mahasiswa & Umum Events...');
  // 1. Challenges for Main Event
  const mainChallenges = [
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
  ];

  const createdMainChallenges = [];
  for (const c of mainChallenges) {
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

  // 2. Challenges for Mahasiswa Event
  const mhsChallenges = [
    {
      title: 'Linux Syslog Forensics [Mahasiswa]',
      category: 'INCIDENT_RESPONSE',
      points: 100,
      flag: 'FLAG{mhs_auth_log_bruteforce_ssh}',
      description: 'Analisis /var/log/auth.log pada server Debian dan temukan IP attacker yang melakukan SSH brute-force attack.',
      hint: 'Cari kata kunci Failed password for invalid user.',
      hint_cost: 20,
    },
    {
      title: 'Network Wireshark Basic [Mahasiswa]',
      category: 'NETWORK_ANALYSIS',
      points: 150,
      flag: 'FLAG{mhs_ftp_plaintext_credentials}',
      description: 'Analisis packet capture lalu lintas FTP dan temukan credential plaintext yang bocor.',
      hint: 'Filter protokol ftp pada Wireshark.',
      hint_cost: 25,
    },
    {
      title: 'Simple Web Cookie Tampering [Mahasiswa]',
      category: 'WEB_EXPLOITATION',
      points: 200,
      flag: 'FLAG{mhs_cookie_role_admin_escalation}',
      description: 'Manipulasi session cookie auth_role dari guest menjadi admin pada portal ujian kampus.',
      hint: 'Ubah value auth_role=guest menjadi auth_role=admin dan refresh browser.',
      hint_cost: 30,
    },
  ];

  for (const c of mhsChallenges) {
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

  // 3. Challenges for Umum Event
  const umumChallenges = [
    {
      title: 'Active Directory Kerberoasting Triage [Umum]',
      category: 'INCIDENT_RESPONSE',
      points: 300,
      flag: 'FLAG{umum_spn_kerberoasting_hash_extracted}',
      description: 'Investigasi permintaan SPN Kerberos TGS abnormal pada Domain Controller dan identifikasi akun service yang disasar.',
      hint: 'Periksa Event ID 4769 dengan encryption type 0x17 (RC4).',
      hint_cost: 50,
    },
    {
      title: 'Cobalt Strike Beacon C2 Traffic [Umum]',
      category: 'NETWORK_ANALYSIS',
      points: 400,
      flag: 'FLAG{umum_c2_malleable_profile_discovered}',
      description: 'Analisis lalu lintas HTTP beaconing terenkripsi dengan malleable C2 profile dan ekstrak public key C2 listener.',
      hint: 'Gunakan JARM fingerprint dan TLS cert metadata.',
      hint_cost: 60,
    },
  ];

  for (const c of umumChallenges) {
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
        event_id: umumEvent.id,
        created_by: admin.id,
      },
    });
  }

  console.log('👥 Seeding Teams & Participants across Events...');
  // Teams for Main Event
  const mainTeamsData = [
    { name: 'CyberSentinels', username: 'sentinel_lead', email: 'sentinel@ctf.local', color: '#00F0FF', inviteCode: 'SENTINEL', score: 650, event_id: mainEvent.id },
    { name: 'ShadowDefenders', username: 'shadow_lead', email: 'shadow@ctf.local', color: '#FF0055', inviteCode: 'SHADOW26', score: 500, event_id: mainEvent.id },
  ];

  // Teams for Mahasiswa Event (Team A & Team B)
  const mhsTeamsData = [
    { name: 'Team A (Mahasiswa)', username: 'mhs_team_a', email: 'teama@mahasiswa.local', color: '#00FF66', inviteCode: 'MHS-TEAM-A', score: 250, event_id: mhsEvent.id },
    { name: 'Team B (Mahasiswa)', username: 'mhs_team_b', email: 'teamb@mahasiswa.local', color: '#FACC15', inviteCode: 'MHS-TEAM-B', score: 100, event_id: mhsEvent.id },
  ];

  // Teams for Umum Event (Team C)
  const umumTeamsData = [
    { name: 'Team C (Umum)', username: 'umum_team_c', email: 'teamc@umum.local', color: '#A855F7', inviteCode: 'UMUM-TEAM-C', score: 400, event_id: umumEvent.id },
  ];

  const allTeamsData = [...mainTeamsData, ...mhsTeamsData, ...umumTeamsData];
  const createdTeams = [];

  for (const t of allTeamsData) {
    const user = await prisma.user.create({
      data: {
        username: t.username,
        email: t.email,
        password_hash: userPassword,
        role: 'PARTICIPANT',
        event_id: t.event_id,
      },
    });

    const team = await prisma.team.create({
      data: {
        name: t.name,
        invite_code: t.inviteCode,
        leader_id: user.id,
        score: t.score,
        color: t.color,
        event_id: t.event_id,
      },
    });

    await prisma.teamMember.create({
      data: {
        team_id: team.id,
        user_id: user.id,
      },
    });

    createdTeams.push({ team, user });
  }

  console.log('🩸 Seeding Submissions & First Bloods for Main Event...');
  // 1. First Blood on Chal 0 (Apache Access Log) -> CyberSentinels
  const chal0 = createdMainChallenges[0];
  const team0 = createdTeams[0];
  await prisma.submission.create({
    data: {
      team_id: team0.team.id,
      user_id: team0.user.id,
      challenge_id: chal0.id,
      is_correct: true,
      submitted_at: new Date(Date.now() - 1000 * 60 * 90),
    },
  });
  await prisma.firstBlood.create({
    data: {
      challenge_id: chal0.id,
      team_id: team0.team.id,
      achieved_at: new Date(Date.now() - 1000 * 60 * 90),
    },
  });

  // 2. First Blood on Chal 1 (Ransomware Note) -> ShadowDefenders
  const chal1 = createdMainChallenges[1];
  const team1 = createdTeams[1];
  await prisma.submission.create({
    data: {
      team_id: team1.team.id,
      user_id: team1.user.id,
      challenge_id: chal1.id,
      is_correct: true,
      submitted_at: new Date(Date.now() - 1000 * 60 * 75),
    },
  });
  await prisma.firstBlood.create({
    data: {
      challenge_id: chal1.id,
      team_id: team1.team.id,
      achieved_at: new Date(Date.now() - 1000 * 60 * 75),
    },
  });

  console.log('\n=============================================');
  console.log('✅ DATABASE RE-SEEDED SUCCESSFULLY!');
  console.log('=============================================');
  console.log('🔐 Admin Account:');
  console.log('   Username: admin');
  console.log('   Email:    admin@ctf.local');
  console.log('   Password: admin123');
  console.log('---------------------------------------------');
  console.log('🎓 Event 1: CTF Kategori Mahasiswa 2026 (Token: MAHA2026)');
  console.log('   Tickets:  RR26-MHS-001, RR26-MHS-002, RR26-MHS-003');
  console.log('   Teams:    Team A (Mahasiswa) [Code: MHS-TEAM-A, User: mhs_team_a]');
  console.log('             Team B (Mahasiswa) [Code: MHS-TEAM-B, User: mhs_team_b]');
  console.log('---------------------------------------------');
  console.log('🌐 Event 2: CTF Kategori Umum 2026 (Token: UMUM2026)');
  console.log('   Tickets:  RR26-UMUM-001, RR26-UMUM-002, RR26-UMUM-003');
  console.log('   Teams:    Team C (Umum) [Code: UMUM-TEAM-C, User: umum_team_c]');
  console.log('---------------------------------------------');
  console.log('🏆 Main Event: RiseRanger CTF 2026');
  console.log('   Tickets:  RR26-VIP-ALPHA, RR26-VIP-BETA');
  console.log('   Teams:    CyberSentinels, ShadowDefenders');
  console.log('---------------------------------------------');
  console.log('🔑 Password untuk semua akun dummy peserta: password123');
  console.log('=============================================\n');
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
