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
  const existingUsers = await prisma.user.count().catch(() => 0);
  if (existingUsers > 0 && process.env.FORCE_SEED !== 'true') {
    console.log(`🛡️ [SEED] Database already contains ${existingUsers} users. Skipping destructive purge to protect production data! (Set FORCE_SEED=true if you really want to reset).`);
    return;
  }

  console.log('🧹 [SEED] Purging all previous database records for a clean tournament state...');
  
  // Clean all records in correct foreign key order
  await (prisma as any).challengeAttempt?.deleteMany().catch(() => {});
  await (prisma as any).writeupSubmission?.deleteMany().catch(() => {});
  await prisma.writeup.deleteMany().catch(() => {});
  await (prisma as any).userTeamHistory?.deleteMany().catch(() => {});
  await prisma.unlockedHint.deleteMany().catch(() => {});
  await prisma.submission.deleteMany().catch(() => {});
  await prisma.firstBlood.deleteMany().catch(() => {});
  await prisma.teamMember.deleteMany().catch(() => {});
  await prisma.team.deleteMany().catch(() => {});
  await prisma.challenge.deleteMany().catch(() => {});
  await prisma.eventToken.deleteMany().catch(() => {});
  await prisma.user.deleteMany().catch(() => {});
  await prisma.event.deleteMany().catch(() => {});
  await prisma.category.deleteMany().catch(() => {});
  await (prisma as any).customRole?.deleteMany().catch(() => {});

  console.log('🛡️ 1. Seeding Custom Roles...');
  const roles = [
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
  ];

  for (const r of roles) {
    await (prisma as any).customRole.create({ data: r }).catch(() => {});
  }

  console.log('🚩 2. Seeding Event Arenas with Chaining Enabled...');
  const mainEvent = await prisma.event.create({
    data: {
      name: 'RiseRanger 2 CTF 2026',
      join_token: 'RISERANGER2026',
      participation_mode: 'TEAM',
      min_team_size: 1,
      max_team_size: 5,
      is_active: true,
      is_chained: true,
      enable_fb_bonus: true,
      fb_bonus_1st: 1000,
      fb_bonus_2nd: 500,
      fb_bonus_3rd: 250,
      solve_decay_pts: 125,
      start_time: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      end_time: new Date(Date.now() + 1000 * 60 * 60 * 22),   // 22 hours from now
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
      enable_fb_bonus: true,
      fb_bonus_1st: 1000,
      fb_bonus_2nd: 500,
      fb_bonus_3rd: 250,
      solve_decay_pts: 125,
      start_time: new Date(Date.now() - 1000 * 60 * 60 * 2),
      end_time: new Date(Date.now() + 1000 * 60 * 60 * 22),
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
      is_chained: true,
      enable_fb_bonus: true,
      fb_bonus_1st: 1000,
      fb_bonus_2nd: 500,
      fb_bonus_3rd: 250,
      solve_decay_pts: 125,
      start_time: new Date(Date.now() - 1000 * 60 * 60 * 2),
      end_time: new Date(Date.now() + 1000 * 60 * 60 * 22),
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

  console.log('👤 5. Seeding Staff Accounts...');
  const defaultAdminPass = await bcrypt.hash('!ctfriseranger#017', 10);
  const adminAlternativePass = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@ctf.local',
      password_hash: defaultAdminPass,
      role: 'ADMIN',
      event_id: mainEvent.id,
    },
  });

  await prisma.user.create({
    data: {
      username: 'wadmin',
      email: 'wadmin@ctf.local',
      password_hash: await bcrypt.hash('wadmin123', 10),
      role: 'WADMIN',
      event_id: mainEvent.id,
    },
  });

  await prisma.user.create({
    data: {
      username: 'jury',
      email: 'jury@ctf.local',
      password_hash: await bcrypt.hash('jury123', 10),
      role: 'JURY',
      event_id: mainEvent.id,
    },
  });

  await prisma.user.create({
    data: {
      username: 'moderator',
      email: 'moderator@ctf.local',
      password_hash: await bcrypt.hash('moderator123', 10),
      role: 'MODERATOR',
      event_id: mainEvent.id,
    },
  });

  // Additional WADMIN accounts
  const wadminList = [
    { username: 'resi', email: 'resi@riseranger.ctf', password: 'ResiSecret2026!' },
    { username: 'ken', email: 'ken@riseranger.ctf', password: 'KenSecret2026!' },
    { username: 'yusuf', email: 'yusuf@riseranger.ctf', password: 'YusufSecret2026!' },
    { username: 'subhi', email: 'subhi@riseranger.ctf', password: 'SubhiSecret2026!' },
    { username: 'rey', email: 'rey@riseranger.ctf', password: 'ReySecret2026!' }
  ];

  for (const item of wadminList) {
    const pwHash = await bcrypt.hash(item.password, 10);
    await prisma.user.create({
      data: {
        username: item.username,
        email: item.email,
        password_hash: pwHash,
        role: 'WADMIN',
        event_id: mainEvent.id
      }
    });
  }

  console.log('👥 6. Seeding Participant Users...');
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

  console.log('🛡️ 7. Seeding Teams (Clean 0 Scores)...');
  // Team 1: Aegis Cyber Squad
  const team1 = await prisma.team.create({
    data: {
      name: 'Aegis Cyber Squad',
      invite_code: 'AEGIS26',
      leader_id: u1.id,
      color: '#00F0FF',
      event_id: mainEvent.id,
      score: 0,
      writeup_score: 0
    },
  });
  await prisma.teamMember.createMany({
    data: [
      { team_id: team1.id, user_id: u1.id },
      { team_id: team1.id, user_id: u2.id },
      { team_id: team1.id, user_id: u3.id },
    ]
  });

  // Team 2: Shadow Legion
  const team2 = await prisma.team.create({
    data: {
      name: 'Shadow Legion',
      invite_code: 'SHADOW26',
      leader_id: u4.id,
      color: '#A855F7',
      event_id: mainEvent.id,
      score: 0,
      writeup_score: 0
    },
  });
  await prisma.teamMember.createMany({
    data: [
      { team_id: team2.id, user_id: u4.id },
      { team_id: team2.id, user_id: u5.id },
    ]
  });

  // Team 3: Red Team Syndicate
  const team3 = await prisma.team.create({
    data: {
      name: 'Red Team Syndicate',
      invite_code: 'REDTEAM26',
      leader_id: u6.id,
      color: '#F43F5E',
      event_id: mainEvent.id,
      score: 0,
      writeup_score: 0
    },
  });
  await prisma.teamMember.create({
    data: { team_id: team3.id, user_id: u6.id }
  });

  // Team 4: Binary Apex
  const team4 = await prisma.team.create({
    data: {
      name: 'Binary Apex',
      invite_code: 'APEX26',
      leader_id: u7.id,
      color: '#10B981',
      event_id: mainEvent.id,
      score: 0,
      writeup_score: 0
    },
  });
  await prisma.teamMember.create({
    data: { team_id: team4.id, user_id: u7.id }
  });

  // Team 5: Ghost Operative
  const team5 = await prisma.team.create({
    data: {
      name: 'Ghost Operative',
      invite_code: 'GHOST26',
      leader_id: u8.id,
      color: '#FACC15',
      event_id: mainEvent.id,
      score: 0,
      writeup_score: 0
    },
  });
  await prisma.teamMember.create({
    data: { team_id: team5.id, user_id: u8.id }
  });

  console.log('🎯 8. Seeding Chained Challenges for Main Championship & Mahasiswa Arenas...');
  
  // Main Arena Chained Challenges:
  // Each category has sequenced steps: unlock_order 1 (Starting Stage) -> unlock_order 2 (Locked until Stage 1 solved) -> unlock_order 3 (Locked until Stage 2 solved)
  const mainChallengesData = [
    // ----------------- INCIDENT_RESPONSE -----------------
    {
      title: 'Apache Access Log Triage',
      category: 'INCIDENT_RESPONSE',
      points: 100,
      unlock_order: 1,
      flag: 'FLAG{apache_access_log_rce_found}',
      description: 'Sebuah web server production dilaporkan mengalami lonjakan traffic aneh. Periksa access.log dan temukan IP attacker serta command injection yang dieksekusi.',
      hint: 'Cari request method POST dengan status code 200 yang mengakses endpoint /cgi-bin/.',
      hint_cost: 20,
    },
    {
      title: 'Corrupted Windows Event Log (.evtx)',
      category: 'INCIDENT_RESPONSE',
      points: 250,
      unlock_order: 2,
      flag: 'FLAG{event_4624_type_10_rdp_breach}',
      description: 'Attacker mencoba menghapus Security Event Log setelah melakukan lateral movement via RDP. Analisis sisa log Event ID 4624 (Logon Type 10) untuk mengungkap akun yang dikompromikan.',
      hint: 'Cari logon type 10 (RemoteInteractive) pada Event Viewer.',
      hint_cost: 50,
    },
    {
      title: 'Active Directory Kerberoasting Incident',
      category: 'INCIDENT_RESPONSE',
      points: 400,
      unlock_order: 3,
      flag: 'FLAG{spn_tgs_hashcat_cracked_admin}',
      description: 'Ditemukan request ticket TGS mencurigakan untuk SPN MSSQLService. Ekstrak ticket hash dan lakukan brute-force offline untuk menemukan kata sandi service account.',
      hint: 'Gunakan hashcat mode 13100 untuk melakukan audit Kerberos TGS-REP hash.',
      hint_cost: 80,
    },

    // ----------------- DIGITAL_FORENSICS -----------------
    {
      title: 'Ransomware Note Investigation',
      category: 'DIGITAL_FORENSICS',
      points: 100,
      unlock_order: 1,
      flag: 'FLAG{shadow_copy_deleted_vssadmin}',
      description: 'Host Windows klien terinfeksi ransomware LockBit. Temukan command PowerShell / Batch yang digunakan malware untuk menghapus Volume Shadow Copies.',
      hint: 'Periksa command yang mengeksekusi binary bawaan vssadmin.exe atau wmic shadowcopy delete.',
      hint_cost: 20,
    },
    {
      title: 'Memory Dump Analysis - LSASS Injection',
      category: 'DIGITAL_FORENSICS',
      points: 250,
      unlock_order: 2,
      flag: 'FLAG{mimikatz_lsass_dump_detected}',
      description: 'Ditemukan file memory dump (vmem) dari domain controller yang disusupi. Identifikasi tool credential dumping yang disuntikkan ke proses lsass.exe.',
      hint: 'Gunakan Volatility plugin windows.malfind atau windows.pslist.',
      hint_cost: 50,
    },
    {
      title: 'Master File Table (MFT) Timestomping Forensics',
      category: 'DIGITAL_FORENSICS',
      points: 400,
      unlock_order: 3,
      flag: 'FLAG{mft_timestomping_detected_0x30}',
      description: 'Attacker melakukan teknik Timestomping untuk menyamarkan timestamp malware di filesystem NTFS. Bandingkan attribute $STANDARD_INFORMATION (0x10) dan $FILE_NAME (0x30) pada $MFT.',
      hint: 'Tool seperti MFTECmd atau analyzeMFT dapat membedakan anomali timestamp pada atribut 0x30.',
      hint_cost: 80,
    },

    // ----------------- NETWORK_ANALYSIS -----------------
    {
      title: 'Suspicious DNS Tunneling PCAP',
      category: 'NETWORK_ANALYSIS',
      points: 150,
      unlock_order: 1,
      flag: 'FLAG{c2_dns_tunneling_exfiltration}',
      description: 'SOC Alert mendeteksi anomali volume DNS query TXT record yang sangat tinggi ke domain asing. Analisis file pcap dan rekonstruksi payload yang diekfiltrasi.',
      hint: 'Decode base64 chunk pada subdomain query TXT record di Wireshark.',
      hint_cost: 30,
    },
    {
      title: 'TLS C2 Beaconing JA3 Analysis',
      category: 'NETWORK_ANALYSIS',
      points: 350,
      unlock_order: 2,
      flag: 'FLAG{ja3_fingerprint_c2_ja3s_matched}',
      description: 'Attacker menggunakan channel komunikasi terenkripsi HTTPS untuk C2 Beaconing. Lakukan analisis JA3/JA3S fingerprint pada Client Hello paket SSL/TLS untuk mengidentifikasi framework implant.',
      hint: 'Gunakan Wireshark filter tls.handshake.type == 1 dan inspect string JA3 hash.',
      hint_cost: 70,
    },

    // ----------------- WEB_EXPLOITATION -----------------
    {
      title: 'Helpdesk Portal SQLi Bypass',
      category: 'WEB_EXPLOITATION',
      points: 150,
      unlock_order: 1,
      flag: 'FLAG{union_based_auth_bypass_success}',
      description: 'Portal internal helpdesk rentan terhadap SQL Injection pada form login admin. Ekstrak secret flag yang tersimpan di table internal_config.',
      hint: 'Gunakan UNION SELECT payload untuk membypass otentikasi login admin.',
      hint_cost: 30,
    },
    {
      title: 'Server-Side Template Injection to RCE',
      category: 'WEB_EXPLOITATION',
      points: 350,
      unlock_order: 2,
      flag: 'FLAG{ssti_jinja2_rce_flag_pwned}',
      description: 'Fitur custom notification template di aplikasi web mengevaluasi string input user secara langsung menggunakan Jinja2 template engine. Dapatkan shell dan baca /root/flag.txt.',
      hint: 'Eksploitasi subclass python object __mro__ untuk memanggil os.popen() atau subprocess.',
      hint_cost: 70,
    },

    // ----------------- REVERSE_ENGINEERING -----------------
    {
      title: 'Obfuscated PowerShell Downloader',
      category: 'REVERSE_ENGINEERING',
      points: 200,
      unlock_order: 1,
      flag: 'FLAG{amsi_bypass_obfuscated_string}',
      description: 'SOC berhasil mengisolasi script dropper PowerShell yang sangat diobfuskasi dengan XOR dan Base64 multilayer. Deobfuskasi script dan temukan AMSI bypass string.',
      hint: 'Gunakan tool CyberChef atau deobfuscator pipeline untuk melepaskan layer XOR.',
      hint_cost: 40,
    },
    {
      title: 'Golang C2 Implant Binary Decompilation',
      category: 'REVERSE_ENGINEERING',
      points: 400,
      unlock_order: 2,
      flag: 'FLAG{ghidra_golang_c2_entrypoint_unpacked}',
      description: 'Analisis binary ELF 64-bit yang dikompilasi dengan Go. Temukan fungsi C2 connection handler dan ekstrak hardcoded AES decryption key.',
      hint: 'Gunakan Ghidra dengan plugin GoHelper untuk memulihkan symbol table dan runtime metadata.',
      hint_cost: 80,
    },

    // ----------------- CRYPTOGRAPHY -----------------
    {
      title: 'Ransomware Stream Cipher XOR Key Recovery',
      category: 'CRYPTOGRAPHY',
      points: 150,
      unlock_order: 1,
      flag: 'FLAG{known_plaintext_xor_keystream_broken}',
      description: 'Attacker mengenkripsi file laporan PDF menggunakan repeated-key XOR sederhana. Manfaatkan known-plaintext header PDF (%PDF-1.7) untuk merekonstruksi key.',
      hint: 'Header file PDF selalu diawali dengan byte 25 50 44 46 2D 31 2E. Lakukan XOR dengan ciphertext.',
      hint_cost: 30,
    },
    {
      title: 'Ransomware Master Decryption Key (ECDSA Nonce Reuse)',
      category: 'CRYPTOGRAPHY',
      points: 450,
      unlock_order: 2,
      flag: 'FLAG{elliptic_curve_weak_nonce_recovered}',
      description: 'Ditemukan dua signature ciphertext terenkripsi ransomware yang menggunakan ECDSA nonce yang sama (nonce reuse vulnerability). Rekonstruksi private key attacker untuk mendekripsi master vault.',
      hint: 'Gunakan serangan ECDSA Repeated k-value untuk mengkalkulasi private key d: d = (s2*z1 - s1*z2) / (s1*r - s2*r) mod n.',
      hint_cost: 90,
    },
  ];

  for (const c of mainChallengesData) {
    await prisma.challenge.create({
      data: {
        title: c.title,
        description: c.description,
        category: c.category,
        points: c.points,
        unlock_order: c.unlock_order,
        flag: c.flag,
        flag_hash: hashFlag(c.flag),
        hint: c.hint,
        hint_cost: c.hint_cost,
        is_active: true,
        is_hidden: false,
        event_id: mainEvent.id,
        created_by: admin.id,
      },
    });
  }

  // Mahasiswa Arena Chained Challenges
  const mhsChallengesData = [
    {
      title: 'Basic Wireshark HTTP Extraction [Mhs]',
      category: 'NETWORK_ANALYSIS',
      points: 100,
      unlock_order: 1,
      flag: 'FLAG{mhs_plaintext_cred_found}',
      description: 'Lakukan analisis paket pcap sederhana dan temukan kredensial plaintext yang dikirim melalui protokol HTTP unencrypted.',
      hint: 'Filter Wireshark: http.request.method == "POST"',
      hint_cost: 20,
    },
    {
      title: 'FTP Raw Command & Exfiltration [Mhs]',
      category: 'NETWORK_ANALYSIS',
      points: 200,
      unlock_order: 2,
      flag: 'FLAG{mhs_ftp_pcap_dump_recovered}',
      description: 'Analisis traffic FTP control channel dan data channel (passive mode) untuk merekonstruksi file zip yang diekfiltrasi.',
      hint: 'Gunakan Wireshark filter ftp atau ftp-data.',
      hint_cost: 40,
    },
    {
      title: 'Linux Syslog Brute Force Analysis [Mhs]',
      category: 'INCIDENT_RESPONSE',
      points: 150,
      unlock_order: 1,
      flag: 'FLAG{mhs_ssh_bruteforce_ip_banned}',
      description: 'Analisis file /var/log/auth.log dan identifikasi IP attacker yang melakukan SSH brute-force attack bertubi-tubi.',
      hint: 'Gunakan grep "Failed password" auth.log | awk...',
      hint_cost: 30,
    },
    {
      title: 'Crontab Persistence Detection [Mhs]',
      category: 'INCIDENT_RESPONSE',
      points: 250,
      unlock_order: 2,
      flag: 'FLAG{mhs_cron_backdoor_neutralized}',
      description: 'Attacker berhasil memasang reverse shell terjadwal di /etc/cron.d. Temukan file cron backdoor dan IP C2 attacker.',
      hint: 'Periksa syntax crontab di /etc/crontab atau /var/spool/cron/crontabs.',
      hint_cost: 50,
    },
    {
      title: 'Hidden Metadata in Exif [Mhs]',
      category: 'DIGITAL_FORENSICS',
      points: 150,
      unlock_order: 1,
      flag: 'FLAG{mhs_exiftool_geotag_extracted}',
      description: 'Ekstrak metadata tersembunyi pada barang bukti gambar evidence.jpg menggunakan exiftool.',
      hint: 'Periksa field Artist, Comment, atau GPS coordinates.',
      hint_cost: 30,
    },
    {
      title: 'Steganography LSB Extraction [Mhs]',
      category: 'DIGITAL_FORENSICS',
      points: 250,
      unlock_order: 2,
      flag: 'FLAG{mhs_lsb_secret_image_extracted}',
      description: 'Ekstrak payload tersembunyi pada Least Significant Bit (LSB) kanal warna gambar PNG.',
      hint: 'Gunakan zsteg atau stegsolve untuk memeriksa bit plane 0.',
      hint_cost: 50,
    },
  ];

  for (const c of mhsChallengesData) {
    await prisma.challenge.create({
      data: {
        title: c.title,
        description: c.description,
        category: c.category,
        points: c.points,
        unlock_order: c.unlock_order,
        flag: c.flag,
        flag_hash: hashFlag(c.flag),
        hint: c.hint,
        hint_cost: c.hint_cost,
        is_active: true,
        is_hidden: false,
        event_id: mhsEvent.id,
        created_by: admin.id,
      },
    });
  }

  console.log('\n===============================================================');
  console.log('✨ DATABASE RE-SEEDED SUCCESSFULLY! ✨');
  console.log('===============================================================');
  console.log('⚡ Submission Status: 0 Submissions (CLEAN SLATE)');
  console.log('⚡ First Blood Status: 0 First Bloods');
  console.log('⚡ Writeup Status: 0 Writeups');
  console.log('⚡ Chaining Mode: ENABLED (All categories configured with sequence steps)');
  console.log('---------------------------------------------------------------');
  console.log('🔐 STAFF ACCOUNTS (HQ ACCESS):');
  console.log('  1. Super Administrator:');
  console.log('     Username: admin       | Email: admin@ctf.local     | Pass: !ctfriseranger#017');
  console.log('  2. Wakil Administrator (Wadmin):');
  console.log('     Username: wadmin      | Email: wadmin@ctf.local    | Pass: wadmin123');
  console.log('  3. Juri Penilai (Jury):');
  console.log('     Username: jury        | Email: jury@ctf.local      | Pass: jury123');
  console.log('  4. Moderator (Pengawas):');
  console.log('     Username: moderator   | Email: moderator@ctf.local | Pass: moderator123');
  console.log('  5. Tim Wadmin: resi, ken, yusuf, subhi, rey (Pass: <Name>Secret2026!)');
  console.log('---------------------------------------------------------------');
  console.log('🎮 PARTICIPANT TEAMS (Password: user123, Scores: 0):');
  console.log('  • Aegis Cyber Squad (Leader: shadow_hunter | Members: cipher_ghost, byte_ninja)');
  console.log('  • Shadow Legion     (Leader: neon_spectre  | Member: zero_day)');
  console.log('  • Red Team Syndicate(Leader: red_sentinel)');
  console.log('  • Binary Apex       (Leader: apex_predator)');
  console.log('  • Ghost Operative   (Leader: solo_operative)');
  console.log('---------------------------------------------------------------');
  console.log('🚩 ARENA TOKENS:');
  console.log('  • Main Arena:      RISERANGER2026 (Chaining: YES)');
  console.log('  • Mahasiswa Arena: MAHA2026       (Chaining: YES)');
  console.log('  • Umum Arena:      UMUM2026       (Chaining: YES)');
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