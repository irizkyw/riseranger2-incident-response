# 🛡️ RISERANGER 2 — CYBERSECURITY INCIDENT RESPONSE & CTF PLATFORM
### *Panduan Lengkap Arsitektur Sistem, Alur Kompetisi, Tata Kelola HQ Command, dan Diagram Alir (Tournament Workflow)*

[![Runtime](https://img.shields.io/badge/Runtime-Bun%20v1.3+-000000?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20•%20Vite%20•%20TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Styling](https://img.shields.io/badge/Styling-Tailwind%20CSS%20•%20Radix%20UI-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Backend](https://img.shields.io/badge/Backend-Express.js%20•%20Prisma%20ORM%20v5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2016-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Cache](https://img.shields.io/badge/Cache-Redis%207%20In--Memory-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![Sockets](https://img.shields.io/badge/Realtime-Socket.io%20WebSocket-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io)
[![Deployment](https://img.shields.io/badge/Deploy-Docker%20Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com)

---

## 📑 Daftar Isi
1. [Gambaran Umum Sistem](#1-gambaran-umum-sistem)
2. [Arsitektur & Komponen Teknologi](#2-arsitektur--komponen-teknologi)
3. [Fitur Keamanan, Anti-Cheat & Confinement](#3-fitur-keamanan-anti-cheat--confinement)
4. [Diagram Alur Kompetisi & Sistem (Tournament Flow)](#4-diagram-alur-kompetisi--sistem-tournament-flow)
   - [Diagram 1: Alur Lengkap Peserta (End-to-End Participant Flow)](#diagram-1-alur-lengkap-peserta-end-to-end-participant-flow)
   - [Diagram 2: Isolasi Multi-Event Arena & Token Kategorisasi](#diagram-2-isolasi-multi-event-arena--token-kategorisasi)
   - [Diagram 3: Siklus Validasi Flag, Chained Mode, Hint Unlock & First Blood](#diagram-3-siklus-validasi-flag-chained-mode-hint-unlock--first-blood)
   - [Diagram 4: Alur Manajemen Panitia HQ Command](#diagram-4-alur-manajemen-panitia-hq-command)
   - [Diagram 5: Alur Pengumpulan, In-App Viewer & Penilaian Writeup](#diagram-5-alur-pengumpulan-in-app-viewer--penilaian-writeup)
   - [Diagram 6: Arsitektur Master Roles & Dynamic Permissions (RBAC)](#diagram-6-arsitektur-master-roles--dynamic-permissions-rbac)
   - [Diagram 7: Entity Relationship Diagram (ERD Database Schema)](#diagram-7-entity-relationship-diagram-erd-database-schema)
5. [Panduan Operasional Panitia & Admin HQ (`/hq`)](#5-panduan-operasional-panitia--admin-hq-hq)
   - [5.1 Dashboard & Live Activity Radar (`/hq` & `/hq/live-activity`)](#51-dashboard--live-activity-radar-hq--hqlive-activity)
   - [5.2 Manajemen Event Arena (`/hq/events`)](#52-manajemen-event-arena-hqevents)
   - [5.3 Manajemen Token Akses (`/hq/tokens`)](#53-manajemen-token-akses-hqtokens)
   - [5.4 Manajemen Soal & Studio Tantangan (`/hq/challenges`)](#54-manajemen-soal--studio-tantangan-hqchallenges)
   - [5.5 Manajemen Squad & Tim (`/hq/teams`)](#55-manajemen-squad--tim-hqteams)
   - [5.6 Manajemen Operatives & Pengguna (`/hq/users`)](#56-manajemen-operatives--pengguna-hqusers)
   - [5.7 Master Roles & Dynamic RBAC (`/hq/roles`)](#57-master-roles--dynamic-rbac-hqroles)
   - [5.8 Evaluasi Laporan Writeup & Inline Split-Screen Viewer (`/hq/writeups`)](#58-evaluasi-laporan-writeup--inline-split-screen-viewer-hqwriteups)
   - [5.9 Manajemen Kategori Soal (`/hq/categories`)](#59-manajemen-kategori-soal-hqcategories)
   - [5.10 Audit Log Submission (`/hq/submissions`)](#510-audit-log-submission-hqsubmissions)
   - [5.11 Manajemen Strike First Blood (`/hq/first-bloods`)](#511-manajemen-strike-first-blood-hqfirst-bloods)
   - [5.12 Anti-Cheat Logs & IP Telemetry (`/hq/anti-cheat`)](#512-anti-cheat-logs--ip-telemetry-hqanti-cheat)
6. [Panduan Hak Akses & Matriks Pengguna](#6-panduan-hak-akses--matriks-pengguna)
7. [Panduan Peserta (Participant Guide)](#7-panduan-peserta-participant-guide)
8. [Struktur Data & Skema Database (Prisma Models)](#8-struktur-data--skema-database-prisma-models)
9. [Konfigurasi Environment (`.env`) & Port Mapping](#9-konfigurasi-environment-env--port-mapping)
10. [Panduan Instalasi & Deployment](#10-panduan-instalasi--deployment)
    - [Opsi A: Full Docker Compose Production](#opsi-a-full-docker-compose-production)
    - [Opsi B: Full Docker Compose Development](#opsi-b-full-docker-compose-development)
    - [Opsi C: Local Monorepo Development (Bun)](#opsi-c-local-monorepo-development-bun)
    - [Migrasi & Database Seeding](#migrasi--database-seeding)
    - [Cloudflare Tunnel Deployment](#cloudflare-tunnel-deployment)
11. [Daftar Perintah & Monorepo Scripts](#11-daftar-perintah--monorepo-scripts)

---

## 1. Gambaran Umum Sistem

**RISERANGER 2** adalah platform simulasi respons insiden siber (*Cybersecurity Incident Response*) dan kompetisi *Capture The Flag* (CTF) berstandar industri modern dengan kinerja tinggi. Platform ini dirancang secara tangguh untuk mengelola kompetisi skala besar (*live tournament*) dengan isolasi multi-tenant, telemetri real-time, anti-cheat berlapis, dan alur evaluasi writeup terpadu.

### 🌟 Fitur Utama Platform:
* **Multi-Event Arena Isolation**: Penyelenggaraan multi-kategori arena secara terisolasi (contoh: Mahasiswa, Umum, Professional, Grand Final) dengan set soal, scoreboard, timer, dan aturan mandiri.
* **Single-Use Access Token Engine**: Tiket akses unik berbatas kuota per batch dengan penandaan institusi/kategori, serta kemampuan *reset* dan *unlink* instan bila terjadi kekeliruan pendaftaran.
* **Dynamic & Custom Role Management (RBAC)**: Pembuatan dan konfigurasi role kustom baru tanpa batas (Admin, Wadmin, Juri, Moderator, Participant, VIP Observer, Sponsor Judge, dll.) lengkap dengan matriks perizinan modular (*granular permissions*).
* **Interactive Writeup Document Viewer**: Penampil dokumen bawaan in-app (PDF, Markdown, plaintext, gambar) dengan panel evaluasi inline split-screen untuk penilaian cepat oleh Dewan Juri.
* **Spreadsheet Bulk Import/Export**: Impor dan ekspor paket Soal CTF, Pengguna, dan Tim secara massal melalui format spreadsheet Microsoft Excel (`.xlsx`) dan `.csv`.
* **Chained Challenge Progression**: Pembukaan soal bertingkat (*prerequisite sequence*) berdasarkan penyelesaian tahapan soal sebelumnya untuk simulasi skenario *incident response attack chain*.
* **Tiered First Blood Bonus (1st, 2nd, 3rd Blood)**: Bonus poin dinamis untuk peraih solve pertama, kedua, dan ketiga di arena, dengan dukungan override poin kustom per tantangan.
* **Dynamic Hint Unlock System**: Pembelian petunjuk (*hints*) dengan pemotongan skor tim/peserta secara otomatis dan transparansi riwayat klaim.
* **Realtime WebSocket Scoreboard & Live Telemetry Radar**: Visualisasi skor 2D/3D interaktif (*Three.js / React Three Fiber*), grafik timeline poin dinamis, dan pemantauan siaran langsung aksi peserta.
* **Zero-Trust Anti-Cheat & Security Confinement**: Dynamic SVG Captcha, session collision prevention, IP telemetry, anti-sniffing payload, path traversal isolation, dan freeze time lock.

---

## 2. Arsitektur & Komponen Teknologi

```mermaid
flowchart TD
    subgraph CLIENT_LAYER["🖥️ FRONTEND CLIENT (SPA / PWA)"]
        UI["React 18 • TypeScript • Vite • Tailwind CSS • Radix UI<br/>Three.js / React Three Fiber (3D Radar) • Framer Motion • GSAP<br/>Recharts • Lucide Icons • Sonner • SheetJS (XLSX) • Socket.io-client"]
    end

    subgraph PROTOCOL_LAYER["⚡ PROTOKOL KOMUNIKASI & GATEWAY"]
        HTTP["HTTPS / REST API (JSON Body, Multipart Form Data & Stream Pipe)"]
        WS["WSS / WebSocket (Realtime Radar, First Blood Broadcast & Live Scoreboard)"]
    end

    subgraph BACKEND_LAYER["⚙️ BACKEND CORE ENGINE"]
        SRV["Bun Runtime (v1.3+) • Express.js • TypeScript<br/>Prisma ORM v5 • Socket.io Server • Zod Validation<br/>Helmet • Gzip/Deflate Compression • Express Rate Limit • Bcrypt • JWT"]
    end

    subgraph STORAGE_LAYER["💾 STORAGE & PERSISTENCE INFRASTRUCTURE"]
        DB[("🗄️ PostgreSQL 16 (Alpine)<br/>(Relational Integrity, JSONB Roles & Cascades)")]
        REDIS[("⚡ Redis 7 (Alpine)<br/>(Rate Limits, Sessions, Captcha & Score Cache)")]
        FS[("📁 Storage Disk Confinement<br/>(Secure Uploads & Writeups Inline Stream)")]
    end

    CLIENT_LAYER --> HTTP --> BACKEND_LAYER
    CLIENT_LAYER <--> WS <--> BACKEND_LAYER
    BACKEND_LAYER --> DB
    BACKEND_LAYER --> REDIS
    BACKEND_LAYER --> FS
```

### Rincian Stack Teknologi

| Lapisan (Layer) | Komponen & Library | Fungsi & Kegunaan |
| :--- | :--- | :--- |
| **Frontend Client** | `React 18.3`, `Vite 5.4`, `TypeScript 5.5` | Arsitektur Single Page Application (SPA) reaktif dan berperforma tinggi. |
| **User Interface** | `Tailwind CSS 3.4`, `Radix UI`, `Lucide React` | Desain tema cyberpunk modern, modular, aksesibel, dan responsif. |
| **Visualisasi & Animasi** | `Three.js`, `@react-three/fiber`, `Framer Motion`, `GSAP`, `Recharts` | Radar aktivitas 3D, efek partikel pixel, chart skor, dan transisi fluid. |
| **Runtime & Backend** | `Bun 1.3+`, `Express 4.19`, `TypeScript 5.5` | Runtime JavaScript ultra-cepat dengan arsitektur server Express yang stabil. |
| **Database ORM** | `Prisma ORM v5.18` + `PostgreSQL 16-Alpine` | Manajemen skema database relasional, migrasi otomatis, dan *type-safe queries*. |
| **Cache & Realtime** | `Redis 7-Alpine` + `Socket.io v4.7` | WebSocket event broadcaster dan in-memory cache untuk rate limiting. |
| **Keamanan & Validasi** | `Helmet`, `Bcrypt.js`, `JsonWebToken`, `Zod`, `express-rate-limit` | Proteksi header HTTP, hashing sandi, otentikasi stateless, validasi payload. |
| **Spreadsheet & Stream** | `SheetJS (xlsx)`, `multer`, `compression (gzip/deflate)` | Impor/ekspor massal XLSX/CSV, upload file writeup, dan kompresi API traffic. |

---

## 3. Fitur Keamanan, Anti-Cheat & Confinement

1. **Anti-Bruteforce & Dynamic Rate Limiting**:
   - `authLimiter`: Maksimal 6 percobaan autentikasi (login/register) per menit per alamat IP.
   - `submissionLimiter`: Proteksi anti-spam pengiriman flag dan pencegahan bruteforce otomatis.
   - `globalLimiter`: Perlindungan menyeluruh dari serangan Denial of Service (DoS) pada seluruh endpoint API.
2. **SVG Dynamic Anti-Bot Captcha**:
   - Dihasilkan secara dinamis di backend tanpa ketergantungan library eksternal (*zero-dependency*).
   - Menggunakan 4 karakter bergaris kontras tinggi, noise dinamis, dan eliminasi karakter ambigu (`0/O`, `1/I/L`).
   - Token Captcha bersifat sekali pakai (*single-use*) dan kedaluwarsa dalam 5 menit.
3. **Isolasi Soal & Proteksi Sniffing Jaringan**:
   - Endpoint umum `GET /challenges` hanya mengirim ringkasan berupa judul, poin, kategori, dan status solves.
   - Kolom `description`, `file_url`, dan `hint` disembunyikan dan hanya dapat diakses melalui `GET /challenges/:id` jika akun peserta telah terdaftar pada event yang aktif dan memenuhi urutan *chained sequence*.
   - Flag asli disimpan dalam bentuk hash kriptografi **SHA-256** dan tidak pernah diekspos ke client.
4. **Path Traversal Confinement (Writeup & Attachments)**:
   - Pengambilan dan pembacaan berkas writeup divalidasi menggunakan `path.resolve` untuk memastikan berkas terkunci di dalam direktori penyimpanan yang aman (`uploads/writeups/`), mencegah eksploitasi direktori `../` (*Directory Traversal*).
5. **Single Active Session & IP Telemetry**:
   - Setiap pengguna memiliki `active_session_id`, `last_ip`, dan `last_login_at` untuk melacak sesi aktif tunggal dan mendeteksi anomali multi-login.
6. **Event In-Progress Lock (Integritas Tim & Profil)**:
   - Ketika kompetisi sedang berlangsung (`is_active = true`), peserta dilarang mengganti email/username, keluar dari squad (`leaveTeam`), atau mendepak anggota squad (`kickMember`).
7. **High-Consequence Action Confirmation**:
   - Tombol operasional krusial (seperti *Force Pause*, *Force Stop*, *Disband Team*, dan *Delete Role*) dilengkapi dengan modal konfirmasi ganda untuk mencegah kekeliruan operator.
8. **Strict Anti-DoS Payload Limits**:
   - Body request dibatasi maksimal **1 MB** untuk payload JSON / URL-encoded, dan **50 MB** untuk pengunggahan laporan writeup melalui multipart stream.

---

## 4. Diagram Alur Kompetisi & Sistem (Tournament Flow)

### Diagram 1: Alur Lengkap Peserta (End-to-End Participant Flow)

```mermaid
flowchart TD
    A(["Mulai: Calon Peserta"]) --> B["Akses Portal /login"]
    B --> C{"Punya Akun?"}
    C -- Belum --> D["Daftarkan Akun (Username, Email, Password, Captcha)"]
    D --> E["Login & Dapatkan JWT Access + Refresh Token"]
    C -- Sudah --> E
    
    E --> F["Masuk Dashboard: Status Unverified / No Event"]
    F --> G["Buka Halaman /join: Masukkan Access Token (Contoh: MAHA-2026-X89)"]
    G --> H{"Validasi Access Token di Database"}
    H -- Tidak Valid / Expired --> I["Error: Token Tidak Ditemukan / Sudah Digunakan"] --> G
    H -- Berhasil --> J["Akun Terikat ke Event Arena Tertentu<br/>(Role: PARTICIPANT)"]
    
    J --> K{"Mode Partisipasi Event?"}
    K -- INDIVIDUAL / Solo --> L["Langsung Buka Arena Soal CTF"]
    K -- TEAM / SQUAD --> M["Buka Menu /team (Squad Management)"]
    
    M --> N{"Status Squad"}
    N -- Buat Squad Baru --> O["Input Nama Tim & Dapatkan Kode Invite (Leader)"]
    N -- Gabung Squad Teman --> P["Input Kode Invite Squad"]
    
    O --> Q["Masuk Arena CTF (Dashboard)"]
    P --> Q
    L --> Q
    
    Q --> R["Pilih Tantangan (Filter Kategori & Urutan Chained)"]
    R --> S{"Butuh Petunjuk (Hint)?"}
    S -- Ya --> T["Beli Hint: Skor Tim/Akun Dikurangi Otomatis"] --> U["Hint Terbuka"]
    S -- Tidak --> U["Analisis Soal & Unduh File Attachment"]
    
    U --> V["Eksploitasi & Dapatkan Flag (Format: RR26{...})"]
    V --> W["Submit Flag ke Backend API"]
    
    W --> X{"Validasi SHA256(Flag)"}
    X -- Flag Salah --> Y["Catat Log Submission Gagal & Anti-Spam Cooldown"] --> R
    X -- Flag Benar --> Z["Akumulasi Skor Tim / Akun"]
    
    Z --> AA{"Apakah Solves Pertama di Arena?"}
    AA -- First Blood (1st) --> AB["🩸 FIRST BLOOD STRIKE: +Bonus Poin Utama & Notifikasi Banner Live!"]
    AA -- Second/Third Blood --> AC["🥈/🥉 2nd / 3rd Blood Bonus"]
    AA -- Solves Reguler --> AD["Poin Standar (Solve Decay Terhitung)"]
    
    AB --> AE["Broadcast WebSocket ke Seluruh Peserta & Update Live Scoreboard"]
    AC --> AE
    AD --> AE
    
    AE --> AF["Buka Menu /writeup: Unggah Laporan Investigasi (.pdf/.docx/.zip/.md)"]
    AF --> AG["Dewan Juri Menilai Writeup via In-App Viewer (/hq/writeups)"]
    AG --> AH["Skor Writeup Ditambahkan ke Total Scoreboard Final"]
    AH --> AI(["Kompetisi Selesai: Pengumuman Juara 🏆"])
```

---

### Diagram 2: Isolasi Multi-Event Arena & Token Kategorisasi

```mermaid
graph TB
    subgraph TOKEN_DISPATCH["1. Distribusi Access Token Berlabel"]
        T1["🏷️ Token MAHA-XXXX<br/>(Kategori Mahasiswa / Pelajar)"]
        T2["🏷️ Token UMUM-XXXX<br/>(Kategori Umum & Komunitas)"]
        T3["🏷️ Token PRO-XXXX<br/>(Kategori Profesional / TNI / POLRI)"]
        T4["🏷️ Token FINAL-XXXX<br/>(Main Event Grand Final)"]
    end

    subgraph ARENA_ISOLATION["2. Isolasi Arena Event Mandiri"]
        E1["🏆 Arena 1: CTF Mahasiswa 2026<br/>(Soal: Web, Crypto, Forensics Easy-Med)"]
        E2["🏆 Arena 2: CTF Umum 2026<br/>(Soal: Reverse, Pwn, Cloud, Incident Response)"]
        E3["🏆 Arena 3: CTF Professional 2026<br/>(Soal: Cyber Defense, Malware, Threat Hunting)"]
        E4["🏆 Arena 4: Grand Final Arena<br/>(Soal: Hardcore Incident Chain)"]
    end

    subgraph TEAMS_SCOREBOARDS["3. Tim, Sesi & Scoreboard Terisolasi"]
        S1["📊 Scoreboard & Tim Mahasiswa"]
        S2["📊 Scoreboard & Tim Umum"]
        S3["📊 Scoreboard & Tim Professional"]
        S4["📊 Scoreboard & Tim Grand Final"]
    end

    T1 -->|Redeem di /join| E1
    T2 -->|Redeem di /join| E2
    T3 -->|Redeem di /join| E3
    T4 -->|Redeem di /join| E4

    E1 --> S1
    E2 --> S2
    E3 --> S3
    E4 --> S4
```

---

### Diagram 3: Siklus Validasi Flag, Chained Mode, Hint Unlock & First Blood

```mermaid
sequenceDiagram
    autonumber
    actor P as Peserta (Operative)
    participant FE as Frontend Dashboard
    participant API as Backend (Challenge Controller)
    participant DB as PostgreSQL 16 (Prisma)
    participant WS as WebSocket Scoreboard Hub
    actor ALL as Seluruh Peserta Lain

    P->>FE: Buka Detail Tantangan #4 (Chained Level 2)
    FE->>API: GET /api/challenges/:id
    API->>DB: Periksa Event, Status Banned, & Status Chained Prerequisite
    
    alt Tantangan Terkunci (Prerequisite Belum Terpecahkan)
        API-->>FE: 403 Forbidden: Tantangan Sebelumnya Belum Diselesaikan
        FE-->>P: Tampilkan Tanda Gembok 🔒 & Info Syarat Buka
    else Tantangan Terbuka
        API-->>FE: 200 OK (Data Soal, File Attachment, Poin, Status Hint)
        FE-->>P: Render UI Soal, Box Input Flag, dan Tombol Hint
    end

    opt Peserta Membuka Hint
        P->>FE: Klik Buka Hint (Biaya: 50 Poin)
        FE->>API: POST /api/challenges/:id/hint
        API->>DB: Transaksi: Buat UnlockedHint & Kurangi Poin Tim (-50)
        API-->>FE: 200 OK (Hint Content Terbuka)
        FE-->>P: Tampilkan Teks Petunjuk Investigasi
    end

    P->>FE: Submit Flag "RR26{sUp3r_s3cur3_1nc1d3nt_fl4g}"
    FE->>API: POST /api/challenges/submit
    API->>DB: Verifikasi Status Freeze Event, Status Banned, & Hash SHA256(Flag)
    
    alt Flag Benar
        API->>DB: Catat Submission (is_correct = true)
        API->>DB: Hitung Poin (Base Points + Solve Decay - Hint Penalty)
        API->>DB: Periksa Rekor First Blood di Event Ini
        
        alt Solves Pertama (1st Blood)
            API->>DB: Catat FirstBlood Record (+50 Poin Bonus)
            API->>WS: emit("first_blood", { team, challenge, rank: 1 })
            WS-->>ALL: 🩸 BANNER FIRST BLOOD: Tim X Memecahkan Challenge Y Pertama Kali!
        else Solves Kedua (2nd Blood)
            API->>DB: Tambah Bonus 2nd Blood (+25 Poin Bonus)
            API->>WS: emit("first_blood", { team, challenge, rank: 2 })
            WS-->>ALL: 🥈 Notifikasi 2nd Blood Strike!
        else Solves Ketiga (3rd Blood)
            API->>DB: Tambah Bonus 3rd Blood (+10 Poin Bonus)
            API->>WS: emit("first_blood", { team, challenge, rank: 3 })
            WS-->>ALL: 🥉 Notifikasi 3rd Blood Strike!
        end

        API->>WS: emit("scoreboard_update", { event_id })
        WS-->>ALL: 📈 Live Scoreboard & Chart Tim Terupdate Seketika!
        API-->>FE: 200 OK (Poin Berhasil Ditambahkan!)
        FE-->>P: Efek Suara Sukses & Animasi Confetti 🎆
    else Flag Salah
        API->>DB: Catat Log Percobaan Salah (is_correct = false)
        API-->>FE: 400 Bad Request (Flag Salah / Format Tidak Sesuai)
        FE-->>P: Notifikasi Merah: Invalid Flag Attempt
    end
```

---

### Diagram 4: Alur Manajemen Panitia HQ Command

```mermaid
flowchart TD
    subgraph HQ_COMMAND_FLOW["Alur Kerja Terpadu Panitia HQ Command (/hq)"]
        ADM(["Panitia / Administrator"]) --> H1["1. Buat Event Arena & Parameter Lomba (/hq/events)<br/>• Format: Solo / Squad / Hybrid<br/>• Chained Mode & Freeze Time<br/>• Konfigurasi Bonus First Blood & Solve Decay"]
        ADM --> H2["2. Manajemen Kategori & Soal (/hq/categories & /hq/challenges)<br/>• Input Manual / Bulk Import Excel (.xlsx)<br/>• Urutan Chaining, Hint Cost & SHA256 Hashing"]
        ADM --> H3["3. Generate Access Token Massal (/hq/tokens)<br/>• Buat Token Batch dengan Label Institusi<br/>• Fitur Reset & Unlink Token jika salah klaim"]
        ADM --> H4["4. Konfigurasi Role & Hak Akses (/hq/roles & /hq/users)<br/>• Buat Custom Role (Jury, Proctor, VIP, Sponsor)<br/>• Matriks Hak Akses Granular & Assign User"]
        ADM --> H5["5. Live Radar & Monitoring (/hq/live-activity & /hq/anti-cheat)<br/>• Telemetry 3D Realtime, Log IP & Anomali<br/>• Tombol Darurat: Force Pause & Force Stop Arena"]
        ADM --> H6["6. Evaluasi Laporan Writeup (/hq/writeups)<br/>• Buka Laporan via In-App Split-Screen Viewer<br/>• Input Skor (0-1000) & Feedback Juri"]
    end

    H1 --> DB[("PostgreSQL 16 Engine")]
    H2 --> DB
    H3 --> DB
    H4 --> DB
    H5 --> DB
    H6 --> DB
```

---

### Diagram 5: Alur Pengumpulan, In-App Viewer & Penilaian Writeup

```mermaid
sequenceDiagram
    autonumber
    actor P as Tim Peserta (Squad)
    participant FE_P as Portal Peserta (/writeup)
    participant API as Backend Engine (/api/writeup)
    participant FS as Storage Disk Sandboxed
    participant DB as PostgreSQL Database
    actor J as Dewan Juri / Panitia
    participant FE_A as Portal Evaluasi (/hq/writeups)
    participant WS as WebSocket Hub
    actor ALL as Papan Skor Publik (/scoreboard)

    Note over P,FE_P: Sesi Kompetisi Berlangsung / Writeup Window Dibuka
    P->>FE_P: Upload Dokumen Writeup (.pdf / .zip / .docx / .md) + Catatan Ringkas
    FE_P->>API: POST /api/writeup/upload (Multipart Stream)
    API->>FS: Simpan File Fisik Aman di uploads/writeups/ (Confinement Validated)
    API->>DB: Upsert Record Writeup (team_id, file_url, size, notes, event_id)
    API-->>FE_P: 201 Created: Dokumen Berhasil Dikirim
    FE_P-->>P: Tampilkan Status "✓ SUBMITTED" & Tombol Pratinjau Dokumen

    Note over J,FE_A: Proses Penilaian & Evaluasi oleh Dewan Juri
    J->>FE_A: Akses Menu Evaluasi Writeup (/hq/writeups)
    FE_A->>API: GET /api/writeup/admin/all
    API-->>FE_A: List Seluruh Laporan Tim per Event Arena
    J->>FE_A: Klik Tombol "Buka Viewer & Nilai"
    FE_A->>API: GET /api/writeup/view/:id (Inline Stream Pipe)
    API-->>FE_A: Stream Dokumen (PDF, Markdown, Gambar, Teks)
    
    J->>FE_A: Baca Dokumen di Split-Screen Viewer -> Input Skor (0-1000) & Feedback Juri
    FE_A->>API: POST /api/writeup/admin/evaluate/:id
    API->>DB: Transaksi DB: Update Writeup.score, feedback, & Akumulasi Team.writeup_score
    API->>WS: emit("scoreboard_update", { event_id })
    WS-->>ALL: 📈 Scoreboard Terupdate: Kolom Writeup Score Bertambah!
    API-->>FE_A: 200 OK: Nilai & Feedback Berhasil Dipublikasikan
    
    P->>FE_P: Buka Portal Writeup Peserta
    FE_P-->>P: Tampilkan Badge "Hasil Evaluasi Juri: +PTS" beserta Feedback Resmi Juri
```

---

### Diagram 6: Arsitektur Master Roles & Dynamic Permissions (RBAC)

```mermaid
graph TB
    subgraph SYSTEM_ROLES["Master Roles Database (custom_roles)"]
        R1["⚡ ADMIN (Super Administrator)<br/>• Permissions: ['*']<br/>• Kontrol Penuh: Event, Challenges, Users, System Config"]
        R2["🛡️ WADMIN (Wakil Administrator)<br/>• Permissions: ['*']<br/>• Kontrol Penuh Operasional HQ & Moderasi Peserta"]
        R3["📝 JURY (Dewan Juri)<br/>• Permissions: ['writeups.view', 'writeups.evaluate', 'scoreboard.view']<br/>• Penilaian In-App Writeup & Publikasi Nilai"]
        R4["👁️ MODERATOR (Pengawas Ujian)<br/>• Permissions: ['live.radar', 'roster.view', 'logs.view']<br/>• Monitoring Live Radar & Audit Log Submission"]
        R5["🎯 PARTICIPANT (Operative Peserta)<br/>• Permissions: ['arena.solve', 'team.manage', 'writeup.submit']<br/>• Akses Pengerjaan Tantangan & Pengumpulan Laporan"]
        R6["✨ CUSTOM ROLE (VIP, Sponsor, Mentor, dll.)<br/>• Permissions: Matriks Izin Dinamis (JSON)"]
    end

    subgraph USERS_ASSIGNMENT["Penugasan Pengguna (users.role)"]
        U1["@admin_hq -> Role: ADMIN"]
        U2["@resi, @ken, @yusuf -> Role: WADMIN"]
        U3["@juri_cyber -> Role: JURY"]
        U4["@pengawas_01 -> Role: MODERATOR"]
        U5["@peserta_team_a -> Role: PARTICIPANT"]
        U6["@tamu_vip -> Role: VIP_OBSERVER"]
    end

    R1 --> U1
    R2 --> U2
    R3 --> U3
    R4 --> U4
    R5 --> U5
    R6 --> U6
```

---

### Diagram 7: Entity Relationship Diagram (ERD Database Schema)

```mermaid
erDiagram
    Event ||--o{ User : "contains"
    Event ||--o{ Team : "hosts"
    Event ||--o{ Challenge : "organizes"
    Event ||--o{ EventToken : "issues"
    Event ||--o{ Writeup : "collects"
    
    User ||--o| TeamMember : "belongs_to"
    User ||--o{ Submission : "submits"
    User ||--o{ Challenge : "creates"
    User ||--o{ EventToken : "redeems"
    User ||--o{ Writeup : "uploads"
    User ||--o{ UserTeamHistory : "records"
    User ||--o{ ChallengeAttempt : "tracks"
    User ||--o{ UnlockedHint : "purchases"
    
    Team ||--o{ TeamMember : "has"
    Team ||--o{ Submission : "scores"
    Team ||--o{ FirstBlood : "strikes"
    Team ||--o{ Writeup : "owns"
    Team ||--o{ UnlockedHint : "shares"
    
    Challenge ||--o{ Submission : "receives"
    Challenge ||--o| FirstBlood : "awards"
    Challenge ||--o{ ChallengeAttempt : "logs"
    Challenge ||--o{ UnlockedHint : "provides"
    
    CustomRole {
        string id PK
        string name UK
        string display_name
        string description
        string badge_color
        json permissions
        boolean is_system
    }

    Event {
        string id PK
        string name UK
        string join_token UK
        string participation_mode
        int min_team_size
        int max_team_size
        datetime start_time
        datetime end_time
        datetime freeze_time
        boolean is_chained
        boolean enable_fb_bonus
        int fb_bonus_1st
        int fb_bonus_2nd
        int fb_bonus_3rd
        int solve_decay_pts
    }

    User {
        string id PK
        string username UK
        string email UK
        string password_hash
        string role
        string event_id FK
        string active_session_id
        string last_ip
        datetime last_login_at
    }

    Team {
        string id PK
        string name UK
        string invite_code UK
        string leader_id
        int score
        int writeup_score
        string color
        boolean is_banned
        boolean is_paused
        boolean is_force_stopped
        string event_id FK
    }

    Challenge {
        string id PK
        string title
        string description
        string category
        int points
        string flag_hash
        string hint
        int hint_cost
        string file_url
        boolean is_active
        boolean is_hidden
        int unlock_order
        boolean fb_bonus_override
        int fb_bonus_override_1st
        int fb_bonus_override_2nd
        int fb_bonus_override_3rd
        string event_id FK
    }

    Writeup {
        string id PK
        string team_id FK
        string user_id FK
        string event_id FK
        string file_url
        string file_name
        int score
        string feedback
        string evaluated_by
        datetime evaluated_at
    }
```

---

## 5. Panduan Operasional Panitia & Admin HQ (`/hq`)

Akses panel pusat komando panitia dilakukan melalui URL `/hq`. Hanya akun dengan hak akses staf (`ADMIN`, `SUPERADMIN`, `WADMIN`, `JURY`, `MODERATOR`, atau Role Kustom yang memiliki izin terkait) yang diizinkan mengakses panel ini.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🛡️ RISERANGER 2 — HQ COMMAND CENTER NAVIGATION (/hq)                        │
├─────────────────┬─────────────────────────┬─────────────────────────────────┤
│ Modul Operasi   │ Endpoint Rute Frontend  │ Fungsi & Kegunaan Utama         │
├─────────────────┼─────────────────────────┼─────────────────────────────────┤
│ Live Radar      │ /hq/live-activity       │ Telemetri 3D & siaran aktivitas │
│ Events Studio   │ /hq/events              │ Pengaturan arena & jadwal lomba │
│ Token Generator │ /hq/tokens              │ Batch access token & klaim user │
│ Challenge Hub   │ /hq/challenges          │ Studio pembuatan soal & import  │
│ Squad Manager   │ /hq/teams               │ Kontrol tim, ban & force-stop   │
│ Operatives Hub  │ /hq/users               │ Manajemen akun pengguna & reset │
│ Dynamic Roles   │ /hq/roles               │ RBAC matrix & palette styling   │
│ Writeup Viewer  │ /hq/writeups            │ Split-screen evaluasi juri      │
│ Categories      │ /hq/categories          │ Pengelompokan kategori CTF      │
│ Submissions Log │ /hq/submissions         │ Audit trail flag & pelacakan IP │
│ First Bloods    │ /hq/first-bloods        │ Manajemen strike 1st/2nd/3rd    │
│ Anti-Cheat Hub  │ /hq/anti-cheat          │ Log anomali & keamanan sistem   │
└─────────────────┴─────────────────────────┴─────────────────────────────────┘
```

---

### 5.1 Dashboard & Live Activity Radar (`/hq` & `/hq/live-activity`)
* **Visualisasi Telemetri 3D**: Menggunakan *Three.js / React Three Fiber* untuk merender bola dunia siber (*cyber globe*) dan visualisasi radar real-time yang memetakan aktivitas pengiriman flag.
* **Aktivitas Siaran Langsung (Live Activity Stream)**: Memantau percobaan flag yang berhasil (*solves*), percobaan yang gagal, First Blood strike, serta pembelian petunjuk secara seketika melalui koneksi WebSocket.
* **Ringkasan Metrik**: Statistik cepat jumlah pengguna aktif, total tim terdaftar, total solve rate, dan waktu tersisa kompetisi.

### 5.2 Manajemen Event Arena (`/hq/events`)
* **Pembuatan Event Baru**:
  - Penentuan format partisipasi: **TEAM** (Squad Only), **INDIVIDUAL** (Solo Only), atau **HYBRID**.
  - Batasan ukuran anggota tim (`min_team_size` dan `max_team_size`).
  - Penjadwalan waktu mulai (`start_time`), waktu selesai (`end_time`), dan waktu pembekuan scoreboard (`freeze_time`).
  - Konfigurasi **Chained Mode**: Menentukan apakah soal harus dikerjakan secara berurutan sesuai level (`unlock_order`).
  - Pengaturan bonus First Blood bertingkat (1st: 50 pts, 2nd: 25 pts, 3rd: 10 pts) dan nilai pengurangan dinamis (*Solve Decay Points*).
* **Kontrol Arena Darurat**:
  - **Force Pause**: Membekukan sementara seluruh aktivitas pengiriman flag pada event terpilih dengan dialog konfirmasi darurat.
  - **Force Stop**: Menghentikan event secara permanen jika sesi kompetisi telah berakhir atau terjadi insiden kritis.

### 5.3 Manajemen Token Akses (`/hq/tokens`)
* **Generate Token Massal (Batch Generation)**:
  - Membuat puluhan hingga ratusan token akses sekali pakai (*single-use*) dengan format kode kustom.
  - Penambahan label per batch (contoh: `Batch-Mahasiswa-ITB`, `Batch-Umum-Jakarta`, `Undangan-Khusus-Sponsor`).
* **Inspeksi & Ekspor Token**:
  - Filter token berdasarkan status (`AVAILABLE` vs `USED`).
  - Ekspor seluruh daftar token ke spreadsheet Excel (`.xlsx`) atau format CSV untuk didistribusikan kepada peserta.
* **Fitur Reset & Unlink Token**:
  - Jika peserta salah memasukkan token atau perlu dipindahkan arena, admin dapat mengklik **Unlink / Reset** untuk melepaskan ikatan token dari pengguna dan mengembalikan status token menjadi `AVAILABLE`.

### 5.4 Manajemen Soal & Studio Tantangan (`/hq/challenges`)
* **Pembuatan Soal Baru**:
  - Form input lengkap: Judul, Kategori, Poin Dasar, Flag Rahasia (otomatis di-hash menggunakan SHA-256), Petunjuk (*Hint*), Biaya Petunjuk (*Hint Cost*), dan Pengunggahan Berkas Lampiran (*File Attachment*).
  - Penentuan nomor urut pembukaan (*Unlock Order*) untuk mode Chained Challenge.
  - Sakelar *Override First Blood*: Memberikan bonus khusus untuk tantangan tertentu di luar standar event.
  - Sakelar *Visibility Toggle* (`is_hidden` / `is_active`): Menyembunyikan atau menampilkan soal dari pandangan peserta secara instan.
* **Bulk Import / Export Spreadsheet**:
  - Impor paket soal massal dari file Microsoft Excel (`.xlsx`) atau format CSV dengan pemetaan kolom otomatis.
  - Ekspor seluruh bank soal ke file Excel untuk dokumentasi arsip panitia.

### 5.5 Manajemen Squad & Tim (`/hq/teams`)
* **Inspeksi Roster Tim**: Melihat detail seluruh squad, daftar anggota tim, skor flag, skor writeup, dan akumulasi total skor.
* **Tindakan Moderasi Tim**:
  - **Ban / Unban Team**: Memblokir tim dari seluruh submission flag dan menyembunyikannya dari scoreboard publik jika terindikasi kecurangan.
  - **Pause / Resume Team**: Membekukan aktivitas tim tertentu secara individual.
  - **Recalculate Score**: Menghitung ulang total poin tim berdasarkan submission valid dan potongan hint untuk rekonsiliasi data.
  - **Hapus / Disband Tim**: Membubarkan tim dengan pengalihan riwayat anggota ke tabel `user_team_histories`.

### 5.6 Manajemen Operatives & Pengguna (`/hq/users`)
* **Registrasi Akun Manual**: Menambahkan akun pengguna baru secara langsung dengan penugasan Role dan Event tujuan.
* **Dossier & Riwayat Pengguna**: Memeriksa riwayat klaim token, riwayat perpindahan tim, log pengiriman flag, dan waktu login terakhir.
* **Reset Password & Role Update**: Mengganti password akun atau menaikkan/menurunkan role akses pengguna secara instan.

### 5.7 Master Roles & Dynamic RBAC (`/hq/roles`)
* **Kustomisasi Role Tanpa Batas**: Membuat peran baru dengan nama kode unik (misal: `SPONSOR_JUDGE`, `VIP_OBSERVER`, `MENTOR`).
* **Matriks Hak Akses Granular**: Menentukan checklist perizinan modul (Events, Challenges, Teams, Users, Roles, Writeups, Live Activity, Submissions, Anti-Cheat).
* **Styling Badge & Palette Warna**: Memilih warna badge identitas (Cyan, Emerald, Amber, Rose, Violet, Indigo) yang akan tampil di seluruh aplikasi.

### 5.8 Evaluasi Laporan Writeup & Inline Split-Screen Viewer (`/hq/writeups`)
* **In-App Interactive Document Viewer**:
  - Dewan Juri dapat langsung membaca berkas laporan tim dalam format PDF, Markdown, gambar, atau plaintext langsung di dalam browser tanpa harus mengunduh file secara manual.
* **Panel Penilaian Split-Screen**:
  - Dokumen ditampilkan di sisi kiri, dan panel penilaian di sisi kanan.
  - Input skor (0 s/d 1000 poin) dan kolom catatan evaluasi (*Jury Feedback*).
* **Publikasi Real-Time**:
  - Menyimpan nilai akan langsung mengeksekusi transaksi database dan memicu event WebSocket untuk memperbarui kolom skor writeup pada live scoreboard secara instan.

### 5.9 Manajemen Kategori Soal (`/hq/categories`)
* Pengelolaan kategori tantangan (Web Exploitation, Cryptography, Digital Forensics, Reverse Engineering, Binary Exploitation / Pwn, Cloud Security, Incident Response, OSINT).

### 5.10 Audit Log Submission (`/hq/submissions`)
* Catatan forensik lengkap setiap kali ada pengiriman flag: Alamat IP submitter, timestamp milidetik, tim terkait, string flag yang dikirimkan, dan status kebenaran (`CORRECT` vs `INCORRECT`).

### 5.11 Manajemen Strike First Blood (`/hq/first-bloods`)
* Registry pencapaian First Blood (Solves ke-1, ke-2, dan ke-3) per soal dan per event arena lengkap dengan timeline pencapaian.

### 5.12 Anti-Cheat Logs & IP Telemetry (`/hq/anti-cheat`)
* Pemantauan collision sesi aktif, anomali multi-IP, spamming request rate limit, dan percobaan payload berbahaya.

---

## 6. Panduan Hak Akses & Matriks Pengguna

```
┌─────────────────┬───────────────────────────────────────────────────────────┐
│ Role Pengguna   │ Hak Akses & Tanggung Jawab Operasional                    │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ ADMIN           │ Super Administrator: Akses absolut ke seluruh sistem,     │
│                 │ pembuatan event, import soal, role manager, dan database. │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ WADMIN          │ Wakil Administrator: Pengawasan penuh seluruh jalannya    │
│                 │ turnamen, manajemen peserta, live radar, dan moderasi.    │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ JURY            │ Dewan Juri: Akses evaluasi laporan writeup in-app viewer, │
│                 │ pemberian skor rubrik penilaian, dan feedback evaluasi.   │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ MODERATOR       │ Pengawas Kompetisi: Monitoring live radar 3D, audit trail │
│                 │ submission flag, dan pemantauan anti-cheat log peserta.   │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ PARTICIPANT     │ Peserta Kompetisi: Akses arena soal CTF, manajemen squad, │
│                 │ pengiriman flag, pembelian hint, dan pengunggahan writeup.│
├─────────────────┼───────────────────────────────────────────────────────────┤
│ CUSTOM ROLE     │ Role Kustom: Hak akses dinamis sesuai konfigurasi admin   │
│ (VIP / Sponsor) │ (contoh: hanya melihat Live Radar dan Scoreboard Publik). │
└─────────────────┴───────────────────────────────────────────────────────────┘
```

---

## 7. Panduan Peserta (Participant Guide)

1. **Pendaftaran & Otentikasi**:
   - Buka portal pendaftaran di `/login` atau tautan registrasi resmi.
   - Masukkan Username, Email, Password, serta 4 karakter verifikasi SVG Captcha anti-bot.
2. **Klaim Token Akses Arena (`/join`)**:
   - Setelah login, masuk ke halaman `/join`.
   - Masukkan **Access Token** yang telah dibagikan oleh panitia (contoh: `MAHA-2026-X89`).
   - Akun Anda akan otomatis terikat ke event arena yang sesuai.
3. **Pembentukan Squad / Tim (`/team`)**:
   - Jika event mewajibkan format tim, buka menu `/team`.
   - **Buat Tim Baru**: Masukkan nama squad Anda, pilih warna aksen tim, dan bagikan **Invite Code** kepada rekan tim Anda.
   - **Gabung Tim**: Masukkan Kode Invite dari ketua squad Anda untuk bergabung.
4. **Pengerjaan Soal Tantangan (Dashboard)**:
   - Buka menu **Dashboard** untuk melihat daftar tantangan.
   - Pada mode *Chained Progression*, kerjakan tantangan tingkat dasar terlebih dahulu untuk membuka tantangan berikutnya.
   - Unduh file lampiran jika tersedia dan lakukan investigasi siber.
   - Jika mengalami kebuntuan, Anda dapat membuka petunjuk (*Hint*) dengan konsekuensi pemotongan poin.
   - Temukan flag rahasia dengan format: `RR26{flag_rahasia_anda_disini}` dan kirimkan pada kolom input flag.
5. **Pengunggahan Laporan Writeup (`/writeup`)**:
   - Sebelum sesi kompetisi berakhir, buka menu `/writeup`.
   - Unggah berkas laporan investigasi (*writeup*) dalam format `.pdf`, `.docx`, `.zip`, atau `.md` (maksimal 50 MB) beserta ringkasan metodologi tim.
6. **Pemantauan Papan Skor & Statistik (`/scoreboard` & `/profile`)**:
   - Pantau posisi peringkat squad Anda, riwayat solves, dan First Blood strike di papan skor publik.
   - Buka menu `/profile` untuk melihat dossier individu dan persentase kontribusi di tim.

---

## 8. Struktur Data & Skema Database (Prisma Models)

Berikut adalah ringkasan seluruh entitas model database PostgreSQL yang dikelola oleh Prisma ORM:

| Entitas Model | Tabel Database | Penjelasan & Atribut Kunci |
| :--- | :--- | :--- |
| **`Event`** | `events` | Wadah arena kompetisi (`id`, `name`, `join_token`, `participation_mode`, `min_team_size`, `max_team_size`, `start_time`, `end_time`, `freeze_time`, `is_chained`, `is_paused`, `is_finished`, `enable_fb_bonus`, `fb_bonus_1st`, `fb_bonus_2nd`, `fb_bonus_3rd`, `solve_decay_pts`). |
| **`EventToken`** | `event_tokens` | Tiket akses unik berlabel per event (`id`, `token`, `event_id`, `label`, `is_used`, `used_by_user_id`, `used_at`). |
| **`User`** | `users` | Akun pengguna (`id`, `username`, `email`, `password_hash`, `role`, `event_id`, `active_session_id`, `last_ip`, `last_login_at`). |
| **`CustomRole`** | `custom_roles` | Master konfigurasi role RBAC (`id`, `name`, `display_name`, `description`, `badge_color`, `permissions`, `is_system`). |
| **`Team`** | `teams` | Squad kompetisi (`id`, `name`, `invite_code`, `leader_id`, `score`, `writeup_score`, `color`, `event_id`, `is_banned`, `is_paused`, `is_force_stopped`). |
| **`TeamMember`** | `team_members` | Relasi keanggotaan tim (`id`, `team_id`, `user_id`, `joined_at`). |
| **`Category`** | `categories` | Kategori soal CTF (`id`, `name`). |
| **`Challenge`** | `challenges` | Soal tantangan CTF (`id`, `title`, `description`, `category`, `points`, `flag_hash`, `hint`, `hint_cost`, `file_url`, `is_active`, `is_hidden`, `unlock_order`, `fb_bonus_override`, `fb_bonus_override_1st..3rd`, `event_id`). |
| **`UnlockedHint`** | `unlocked_hints` | Riwayat pembelian petunjuk (`id`, `team_id`, `user_id`, `challenge_id`, `cost_deducted`, `unlocked_at`). |
| **`Submission`** | `submissions` | Log pengiriman flag (`id`, `team_id`, `user_id`, `challenge_id`, `flag`, `ip`, `is_correct`, `submitted_at`). |
| **`FirstBlood`** | `first_bloods` | Rekor pemecah soal tercepat (`id`, `challenge_id`, `team_id`, `achieved_at`). |
| **`Writeup`** | `writeups` | Dokumen laporan investigasi & penilaian juri (`id`, `team_id`, `user_id`, `event_id`, `file_url`, `file_name`, `file_size`, `score`, `feedback`, `evaluated_by`, `evaluated_at`). |
| **`UserTeamHistory`** | `user_team_histories` | Audit log aktivitas tim pengguna (`id`, `user_id`, `team_name`, `role`, `action`, `color`, `score`, `created_at`). |
| **`ChallengeAttempt`** | `challenge_attempts` | Telemetri durasi pengerjaan soal (`id`, `user_id`, `team_id`, `challenge_id`, `status`, `is_paused`, `paused_duration_seconds`, `started_at`, `solved_at`). |

---

## 9. Konfigurasi Environment (`.env`) & Port Mapping

Konfigurasi terpusat pada file `.env` di root direktori proyek. Salin dari `.env.example`:

```bash
cp .env.example .env
```

### Parameter Konfigurasi Master (`.env`)

| Variabel | Deskripsi | Nilai Default / Rekomendasi |
| :--- | :--- | :--- |
| `NODE_ENV` | Lingkungan runtime | `development` / `production` |
| `PORT` | Port server Backend API | `5000` |
| `DATABASE_URL` | Koneksi PostgreSQL | `postgresql://user:password@localhost:5432/ctf_db?schema=public` |
| `JWT_ACCESS_SECRET` | Kunci enkripsi Access Token | *String acak minimal 64 karakter hex* |
| `JWT_REFRESH_SECRET` | Kunci enkripsi Refresh Token | *String acak minimal 64 karakter hex* |
| `CLIENT_URL` | Domain frontend yang diizinkan CORS | `http://localhost:5173,http://localhost:8080` |
| `CORS_ORIGIN` | Pola whitelist domain tambahan | `http://localhost:5173, *.satsiber-tni.mil.id, *.trycloudflare.com` |
| `REDIS_URL` | Koneksi server Redis Cache | `redis://localhost:6379` (atau `redis://redis:6379` di Docker) |
| `MAX_UPLOAD_SIZE_MB` | Batas maksimum upload berkas writeup | `50` |
| `VITE_API_URL` | Endpoint API untuk Frontend | `/api` |
| `VITE_SOCKET_URL` | Endpoint WebSocket untuk Frontend | `http://localhost:5000` |

### Pemetaan Port Default (Network Port Mapping)

| Layanan | Port Host (Production) | Port Host (Development) | Keterangan |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | `8080` (via Nginx) | `5173` (via Vite Dev Server) | Portal Peserta, Scoreboard & HQ Command |
| **Backend API Engine** | `5001` (Docker) / `5000` (Direct) | `5000` | REST API Server & Socket.IO Hub |
| **PostgreSQL 16** | `5433` (Docker Compose) | `5432` | Relational Persistence Database |
| **Redis 7** | `6380` (Docker Compose) | `6379` | In-Memory Cache & Rate Limiting Engine |

---

## 10. Panduan Instalasi & Deployment

### Prasyarat Sistem:
* **Bun**: v1.3.0 atau versi lebih baru ([Install Bun](https://bun.sh))
* **Docker & Docker Compose**: v24.0+ (Opsional untuk deployment kontainer)
* **PostgreSQL**: v16+ (Jika menjalankan tanpa Docker)
* **Redis**: v7+ (Jika menjalankan tanpa Docker)

---

### Opsi A: Full Docker Compose Production

Deployment produksi mandiri menggunakan satu perintah Docker Compose:

```bash
# 1. Build seluruh image kontainer dan jalankan di background
bun run docker:up
# atau: docker compose build && docker compose up -d --remove-orphans

# 2. Periksa status dan log seluruh layanan
bun run docker:logs
# atau: docker compose logs -f

# 3. Seed akun administrator awal ke dalam database kontainer
bun run docker:seed
# atau: docker compose exec -e FORCE_SEED=true backend bun run prisma/seed.ts

# 4. Seed akun Wakil Administrator (WADMIN)
bun run docker:seed:mod
# atau: docker compose exec backend bun run prisma/seedmod.ts
```
Aplikasi siap diakses di: **`http://localhost:8080`** (Frontend) dan **`http://localhost:5001/api`** (Backend).

---

### Opsi B: Full Docker Compose Development

Untuk lingkungan pengembangan interaktif dengan *hot-reload*:

```bash
# Jalankan container dev (Postgres, Redis, & Backend Watch Mode)
docker compose -f docker-compose.dev.yml up --build -d

# Jalankan frontend dev di mesin host
cd packages/frontend && bun run dev
```

---

### Opsi C: Local Monorepo Development (Bun)

Jika Anda menjalankan PostgreSQL dan Redis lokal pada mesin Anda:

```bash
# 1. Install seluruh dependensi monorepo
bun install

# 2. Sinkronkan skema database PostgreSQL
bun run db:generate
bun run db:push

# 3. Inisialisasi data master (Seed Admin & Wadmin)
bun run db:seed
bun run db:seed:mod

# 4. Jalankan Frontend dan Backend secara bersamaan (Concurrently)
bun run dev
```
* Frontend aktif di: `http://localhost:5173`
* Backend API aktif di: `http://localhost:5000`

---

### Akun Awal Hasil Seeding:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔑 KREDENSIAL AKUN ADMINISTRATOR AWAL (HASIL SEED)                          │
├───────────────┬─────────────────────────┬───────────────────┬───────────────┤
│ Username      │ Email                   │ Password Default  │ Role          │
├───────────────┼─────────────────────────┼───────────────────┼───────────────┤
│ admin         │ admin@ctf.local         │ !ctfriseranger#017│ ADMIN         │
│ resi          │ resi@riseranger.ctf     │ ResiSecret2026!   │ WADMIN        │
│ ken           │ ken@riseranger.ctf      │ KenSecret2026!    │ WADMIN        │
│ yusuf         │ yusuf@riseranger.ctf    │ YusufSecret2026!  │ WADMIN        │
│ subhi         │ subhi@riseranger.ctf    │ SubhiSecret2026!  │ WADMIN        │
│ rey           │ rey@riseranger.ctf      │ ReySecret2026!    │ WADMIN        │
└───────────────┴─────────────────────────┴───────────────────┴───────────────┘
```
> [!IMPORTANT]
> **PENTING**: Segera ganti password akun administrator di menu `/hq/users` setelah instalasi awal di lingkungan produksi.

---

### Cloudflare Tunnel Deployment

Untuk menghubungkan server lokal ke domain publik ber-HTTPS secara aman tanpa port forwarding publik:

```bash
# Hubungkan portal frontend dev ke tunnel publik
bun run tunnel:dev

# Hubungkan kontainer production ke tunnel publik
bun run tunnel:docker
```

---

## 11. Daftar Perintah & Monorepo Scripts

Berikut adalah referensi seluruh perintah script yang tersedia pada `package.json` root:

| Perintah (`bun run <script>`) | Deskripsi Tindakan |
| :--- | :--- |
| **`bun run dev`** | Menjalankan Backend (`:5000`) dan Frontend (`:5173`) secara paralel dengan *hot-reload*. |
| **`bun run dev:backend`** | Menjalankan hanya server Backend dalam mode watch (`bun --watch src/index.ts`). |
| **`bun run dev:frontend`** | Menjalankan hanya server Frontend Vite dev. |
| **`bun run build`** | Men-generate Prisma client dan mem-build bundle produksi frontend Vite (`dist/`). |
| **`bun run prod`** | Menjalankan Backend dan preview Frontend dalam mode produksi secara simultan. |
| **`bun run db:generate`** | Menghasilkan type definitions Prisma Client terbaru dari `schema.prisma`. |
| **`bun run db:push`** | Menerapkan perubahan skema Prisma langsung ke database PostgreSQL tanpa membuat file migrasi dev. |
| **`bun run db:migrate`** | Membuat dan menjalankan migrasi database formal (`prisma migrate dev`). |
| **`bun run db:seed`** | Menjalankan seed akun Super Administrator awal (`prisma/seed.ts`). |
| **`bun run db:seed:mod`** | Menjalankan seed 5 akun Wakil Administrator / Wadmin (`prisma/seedmod.ts`). |
| **`bun run docker:up`** | Mem-build dan menyalakan seluruh stack Docker Compose di background. |
| **`bun run docker:down`** | Menghentikan dan membersihkan seluruh kontainer Docker Compose. |
| **`bun run docker:logs`** | Memantau log gabungan seluruh kontainer Docker secara real-time. |
| **`bun run docker:restart`** | Me-restart seluruh kontainer Docker yang sedang berjalan. |
| **`bun run docker:seed`** | Menjalankan force-seeding database di dalam kontainer backend Docker. |
| **`bun run docker:seed:mod`** | Menjalankan seeding akun Wadmin di dalam kontainer backend Docker. |
| **`bun run tunnel`** | Menjalankan Cloudflare Tunnel ke `http://localhost:8080`. |
| **`bun run tunnel:dev`** | Menjalankan Cloudflare Tunnel ke `http://localhost:5173`. |

---

## 🛡️ Lisensi & Hak Cipta

Platform **RISERANGER 2** dikembangkan untuk penyelenggaraan simulasi keamanan siber dan latihan kesiapsiagaan respons insiden (*Cyber Incident Response Exercise*).

*Hak Cipta & Desain Arsitektur Sistem © 2026 RISERANGER 2 Team.*
