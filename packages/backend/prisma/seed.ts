import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

const hashFlag = (flag: string): string => {
  return crypto.createHash('sha256').update(flag.trim()).digest('hex');
};

async function main() {
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

  console.log('🚩 Seeding Events...');
  const mainEvent = await prisma.event.create({
    data: {
      name: 'RiseRanger Incident Response CTF 2026',
      join_token: 'RISERANGER2026',
      is_active: true,
      is_chained: true,
      start_time: new Date(Date.now() - 1000 * 60 * 60 * 2), // started 2 hours ago
      end_time: new Date(Date.now() + 1000 * 60 * 60 * 24),  // ends tomorrow
    },
  });

  const event2 = await prisma.event.create({
    data: {
      name: 'Mahasiswa CTF 2026',
      join_token: 'MAHA2026',
      is_active: true,
      is_chained: true,
      start_time: new Date(Date.now() - 1000 * 60 * 60 * 5),
    },
  });

  const event3 = await prisma.event.create({
    data: {
      name: 'Umum Open Cyber Battle',
      join_token: 'UMUM2026',
      is_active: true,
      is_chained: false,
    },
  });

  console.log('🎫 Seeding Single-Use Access Tokens...');
  const sampleTokens = [
    { token: 'RR26-ALPHA-001', label: 'Team Alpha VIP' },
    { token: 'RR26-BETA-002', label: 'Team Beta Key' },
    { token: 'RR26-GAMMA-003', label: 'Univ Indonesia Batch A' },
    { token: 'RR26-DELTA-004', label: 'Finalist Team 1' },
    { token: 'RR26-EPSILON-005', label: 'Finalist Team 2' },
  ];
  for (const st of sampleTokens) {
    await prisma.eventToken.create({
      data: {
        token: st.token,
        event_id: mainEvent.id,
        label: st.label,
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

  console.log('👤 Seeding Admin & Users...');
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

  console.log('🎯 Seeding Challenges for Main Event...');
  const challengesData = [
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

  const createdChallenges = [];
  for (const c of challengesData) {
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
    createdChallenges.push({ ...chal, plainFlag: c.flag });
  }

  console.log('👥 Seeding Teams & Participants...');
  const teamsData = [
    {
      name: 'CyberSentinels',
      username: 'sentinel_lead',
      email: 'sentinel@ctf.local',
      color: '#00F0FF',
      inviteCode: 'SENTINEL',
      score: 650,
    },
    {
      name: 'ShadowDefenders',
      username: 'shadow_lead',
      email: 'shadow@ctf.local',
      color: '#FF0055',
      inviteCode: 'SHADOW26',
      score: 500,
    },
    {
      name: 'BinaryVanguard',
      username: 'binary_lead',
      email: 'binary@ctf.local',
      color: '#00FF66',
      inviteCode: 'BINARY01',
      score: 350,
    },
    {
      name: 'PacketWatchers',
      username: 'packet_lead',
      email: 'packet@ctf.local',
      color: '#FFE600',
      inviteCode: 'PACKET88',
      score: 100,
    },
  ];

  const createdTeams = [];

  for (const t of teamsData) {
    const user = await prisma.user.create({
      data: {
        username: t.username,
        email: t.email,
        password_hash: userPassword,
        role: 'PARTICIPANT',
        event_id: mainEvent.id,
      },
    });

    const team = await prisma.team.create({
      data: {
        name: t.name,
        invite_code: t.inviteCode,
        leader_id: user.id,
        score: t.score,
        color: t.color,
        event_id: mainEvent.id,
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

  console.log('🩸 Seeding Submissions & First Bloods...');
  // 1. First Blood on Chal 0 (Apache Access Log) -> CyberSentinels
  const chal0 = createdChallenges[0];
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
  const chal1 = createdChallenges[1];
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

  // CyberSentinels also solved Chal 1 later
  await prisma.submission.create({
    data: {
      team_id: team0.team.id,
      user_id: team0.user.id,
      challenge_id: chal1.id,
      is_correct: true,
      submitted_at: new Date(Date.now() - 1000 * 60 * 50),
    },
  });

  // 3. First Blood on Chal 2 (Memory Dump) -> CyberSentinels
  const chal2 = createdChallenges[2];
  await prisma.submission.create({
    data: {
      team_id: team0.team.id,
      user_id: team0.user.id,
      challenge_id: chal2.id,
      is_correct: true,
      submitted_at: new Date(Date.now() - 1000 * 60 * 30),
    },
  });
  await prisma.firstBlood.create({
    data: {
      challenge_id: chal2.id,
      team_id: team0.team.id,
      achieved_at: new Date(Date.now() - 1000 * 60 * 30),
    },
  });

  // 4. First Blood on Chal 3 (DNS Tunneling) -> BinaryVanguard
  const chal3 = createdChallenges[3];
  const team2 = createdTeams[2];
  await prisma.submission.create({
    data: {
      team_id: team2.team.id,
      user_id: team2.user.id,
      challenge_id: chal3.id,
      is_correct: true,
      submitted_at: new Date(Date.now() - 1000 * 60 * 20),
    },
  });
  await prisma.firstBlood.create({
    data: {
      challenge_id: chal3.id,
      team_id: team2.team.id,
      achieved_at: new Date(Date.now() - 1000 * 60 * 20),
    },
  });

  // Also add some failed attempts to simulate realistic battle log
  await prisma.submission.create({
    data: {
      team_id: createdTeams[3].team.id,
      user_id: createdTeams[3].user.id,
      challenge_id: chal0.id,
      is_correct: false,
      submitted_at: new Date(Date.now() - 1000 * 60 * 10),
    },
  });

  console.log('\n=============================================');
  console.log('✅ DATABASE SEEDED SUCCESSFULLY!');
  console.log('=============================================');
  console.log('🔐 Admin Credentials:');
  console.log('   Username: admin');
  console.log('   Email:    admin@ctf.local');
  console.log('   Password: admin123');
  console.log('---------------------------------------------');
  console.log('👥 Dummy Participants (Password: password123):');
  teamsData.forEach(t => {
    console.log(`   Team: ${t.name.padEnd(17)} | User: ${t.username.padEnd(14)} | Code: ${t.inviteCode}`);
  });
  console.log('---------------------------------------------');
  console.log('🏆 Main Event Token: RISERANGER2026');
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
