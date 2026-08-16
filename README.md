# 🛡️ RISERANGER 2 — CYBERSECURITY INCIDENT RESPONSE & CTF PLATFORM
### *Panduan Lengkap Arsitektur Sistem, Alur Kompetisi, dan Diagram Alir (Tournament Workflow)*

---

## 📑 Daftar Isi
1. [Gambaran Umum Sistem](#1-gambaran-umum-sistem)
2. [Arsitektur & Komponen Teknologi](#2-arsitektur--komponen-teknologi)
3. [Fitur Keamanan, Anti-Cheat & Confinement](#3-fitur-keamanan-anti-cheat--confinement)
4. [Diagram Alur Kompetisi (Tournament Flow)](#4-diagram-alur-kompetisi-tournament-flow)
   - [Diagram 1: Alur Lengkap Peserta (End-to-End Participant Flow)](#diagram-1-alur-lengkap-peserta-end-to-end-participant-flow)
   - [Diagram 2: Isolasi Multi-Event Arena & Token Kategorisasi](#diagram-2-isolasi-multi-event-arena--token-kategorisasi)
   - [Diagram 3: Siklus Validasi Flag, Chained Mode, & First Blood](#diagram-3-siklus-validasi-flag-chained-mode--first-blood)
   - [Diagram 4: Alur Manajemen Panitia HQ Command](#diagram-4-alur-manajemen-panitia-hq-command)
   - [Diagram 5: Alur Pengumpulan, In-App Viewer & Penilaian Writeup](#diagram-5-alur-pengumpulan-in-app-viewer--penilaian-writeup)
   - [Diagram 6: Arsitektur Master Roles & Dynamic Permissions](#diagram-6-arsitektur-master-roles--dynamic-permissions)
5. [Panduan Operasional Panitia & Admin HQ (`/hq`)](#5-panduan-operasional-panitia--admin-hq-hq)
6. [Panduan Dewan Juri & Moderator Pengawas](#6-panduan-dewan-juri--moderator-pengawas)
7. [Panduan Peserta (Participant Guide)](#7-panduan-peserta-participant-guide)
8. [Struktur Data & Skema Database](#8-struktur-data--skema-database)

---

## 1. Gambaran Umum Sistem

**RISERANGER 2** adalah platform simulasi respons insiden siber (*Cybersecurity Incident Response & Capture The Flag*) modern berbasis web berkinerja tinggi. Platform ini dirancang untuk menyelenggarakan kompetisi berstandar industri dengan dukungan:
- **Multi-Event Arena**: Isolasi arena lomba (contoh: Mahasiswa, Umum, Professional, Grand Final).
- **Single-Use Access Token**: Tiket akses berbatas kuota per batch dengan kemampuan reset & unlinking instan.
- **Dynamic & Custom Role Management**: Kemampuan membuat dan mengonfigurasi role kustom baru (Admin, Juri, Moderator, Participant, VIP Observer, Sponsor Judge, dll.) lengkap dengan matriks perizinan (*granular permissions*).
- **Interactive Writeup Document Viewer**: Penampil dokumen in-app (PDF, Markdown, plaintext, gambar) dengan panel penilaian inline split-screen.
- **Spreadsheet Bulk Import/Export**: Impor dan ekspor massal data Tantangan, Pengguna, dan Tim via format Excel `.xlsx` dan `.csv`.
- **Chained Challenge Progression**: Pembukaan soal bertingkat berdasarkan penyelesaian soal sebelumnya.
- **Realtime WebSocket Scoreboard & Live Radar**: Visualisasi skor 2D/3D interaktif dan pemantauan aktivitas peserta secara live.

---

## 2. Arsitektur & Komponen Teknologi

```mermaid
flowchart TD
    subgraph CLIENT_LAYER["🖥️ FRONTEND CLIENT (SPA)"]
        UI["React 18 • TypeScript • Vite • Tailwind CSS • Radix UI • Lucide Icons • Socket.io-client"]
    end

    subgraph PROTOCOL_LAYER["⚡ PROTOKOL KOMUNIKASI"]
        HTTP["HTTPS / REST API (JSON Payload & Stream Piping)"]
        WS["WSS / WebSocket (Realtime Event, Radar & Scoreboard)"]
    end

    subgraph BACKEND_LAYER["⚙️ BACKEND ENGINE"]
        SRV["Bun Runtime (v1.3+) • Express.js • Prisma ORM v5 • Socket.io Server"]
    end

    subgraph STORAGE_LAYER["💾 STORAGE & PERSISTENCE INFRASTRUCTURE"]
        DB[("🗄️ MySQL 8 / MariaDB<br/>(Relational Persistence & JSON Columns)")]
        REDIS[("⚡ Redis In-Memory<br/>(Rate Limits, Sessions & Score Cache)")]
        FS[("📁 Storage Disk Confinement<br/>(Uploads & Writeups Inline Stream)")]
    end

    CLIENT_LAYER --> HTTP --> BACKEND_LAYER
    CLIENT_LAYER <--> WS <--> BACKEND_LAYER
    BACKEND_LAYER --> DB
    BACKEND_LAYER --> REDIS
    BACKEND_LAYER --> FS
```

* **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Radix UI Dialogs/Dropdowns/Select, Sonner Toaster, SheetJS (XLSX).
* **Backend**: Bun v1.3+, Express.js, TypeScript, Prisma ORM v5, Socket.io Server, Bcrypt, JsonWebToken.
* **Database**: MySQL 8 / MariaDB (relational persistence).
* **In-Memory Cache**: Redis (Scoreboard caching, rate-limiting, captcha fallback).

---

## 3. Fitur Keamanan, Anti-Cheat & Confinement

1. **Anti-Bruteforce & Dynamic Rate Limiting**:
   - `authLimiter`: Maksimal 6 percobaan login/registrasi per menit per IP.
   - `submissionLimiter`: Proteksi anti-spam pengiriman flag dan pencegahan bruteforce flag otomatis.
2. **SVG Dynamic Captcha (Anti-Bot)**:
   - 4 karakter kontras tinggi yang jelas dan tidak ambigu (bebas karakter ambigu 0/O dan 1/I/L).
   - Single-use token dengan masa berlaku 5 menit.
3. **Isolasi Soal & Proteksi Sniffing Jaringan**:
   - Overview `GET /challenges` hanya mengirim judul, poin, dan kategori.
   - Kolom `description`, `file_url`, dan `hint` disembunyikan dan hanya dapat diakses melalui `GET /challenges/:id` jika peserta terdaftar pada event yang telah dimulai.
4. **Path Traversal Confinement**:
   - Akses dokumen writeup divalidasi dengan `path.resolve` untuk memastikan file berada tepat di dalam folder direktori penyimpanan yang aman dan mencegah eksploitasi `../`.
5. **Event In-Progress Lock (Integritas Tim & Profil)**:
   - Ketika kompetisi telah dimulai, peserta dilarang mengganti email/username, keluar dari tim (`leaveTeam`), atau mengeluarkan anggota tim (`kickMember`).
6. **Force Pause / Force Stop Confirmation Dialogs**:
   - Mencegah klik tidak sengaja pada tombol darurat arena panitia melalui dialog konfirmasi berkonsekuensi tinggi.

---

## 4. Diagram Alur Kompetisi (Tournament Flow)

### Diagram 1: Alur Lengkap Peserta (End-to-End Participant Flow)

```mermaid
flowchart TD
    A(["Mulai: Calon Peserta"]) --> B["Buka Halaman Register"]
    B --> C["Isi Username, Email, Password & Captcha 4 Karakter"]
    C --> D{"Verifikasi Captcha Benar?"}
    D -- Tidak --> E["Pesan Error & Refresh Captcha"] --> B
    D -- Ya --> F["Akun Terdaftar: Login ke Platform"]
    
    F --> G["Masuk Dashboard: Status Unverified"]
    G --> H["Buka Halaman /join: Masukkan Access Token"]
    H --> I{"Validasi Access Token"}
    I -- Salah/Kadaluarsa --> J["Error: Token Tidak Valid"] --> H
    I -- Berhasil --> K["Akun Terikat ke Event Arena Tertentu<br/>(Contoh: Kategori Mahasiswa 2026)"]
    
    K --> L{"Mode Partisipasi Event?"}
    L -- Solo / Individual --> M["Langsung Akses Soal CTF"]
    L -- Squad / Team Only --> N["Buka Menu Team / Squad"]
    
    N --> O{"Pilihan Squad"}
    O -- Buat Tim Baru --> P["Input Nama Tim (Leader Squad)"]
    O -- Gabung Tim Teman --> Q["Input Kode Invite Tim"]
    
    P --> R["Masuk Arena CTF"]
    Q --> R
    M --> R
    
    R --> S["Pilih Soal Tantangan Berdasarkan Kategori"]
    S --> T["Analisis Soal / Unduh File Attachment"]
    T --> U["Dapatkan Flag (Format: RR26{...})"]
    U --> V["Kirim Flag ke Server"]
    
    V --> W{"Flag Valid & Tepat?"}
    W -- Salah --> X["Catat Submission Salah & Notifikasi Gagal"] --> S
    W -- Benar --> Y["Poin Ditambahkan ke Tim/Akun"]
    Y --> Z{"Apakah Solves Pertama di Arena?"}
    Z -- Ya --> FB["Dapatkan Gelar FIRST BLOOD 🩸"]
    Z -- Tidak --> SC["Update Live Scoreboard & Graf Poin"]
    FB --> SC
    SC --> END(["Selesai / Lanjut ke Soal Berikutnya"])
```

---

### Diagram 2: Isolasi Multi-Event Arena & Token Kategorisasi

```mermaid
graph TB
    subgraph TOKEN_DISPATCH["1. Distribusi Access Token"]
        T1["Token MAHA-XXX (Kategori Mahasiswa)"]
        T2["Token UMUM-XXX (Kategori Umum)"]
        T3["Token FINAL-XXX (Main Event Final)"]
    end

    subgraph ARENA_ISOLATION["2. Isolasi Arena Event"]
        E1["🏆 Arena 1: CTF Mahasiswa 2026<br/>(Paket Soal: Web, Crypto, Forensics Easy-Med)"]
        E2["🏆 Arena 2: CTF Umum / Professional 2026<br/>(Paket Soal: Reverse, Pwn, Cloud Hard)"]
        E3["🏆 Arena 3: RISERANGER 2 Grand Final<br/>(Paket Soal: Hardcore)"]
    end

    subgraph TEAMS_SCOREBOARDS["3. Tim & Scoreboard Terpisah"]
        S1["📊 Scoreboard Mahasiswa<br/>(Hanya Tim Mahasiswa)"]
        S2["📊 Scoreboard Umum<br/>(Hanya Tim Umum)"]
        S3["📊 Scoreboard Final<br/>(Hanya Finalis)"]
    end

    T1 -->|Redeem Token| E1
    T2 -->|Redeem Token| E2
    T3 -->|Redeem Token| E3

    E1 --> S1
    E2 --> S2
    E3 --> S3
```

---

### Diagram 3: Siklus Validasi Flag, Chained Mode, & First Blood

```mermaid
sequenceDiagram
    autonumber
    actor P as Peserta (Operative)
    participant FE as Frontend Dashboard
    participant API as Backend (Challenge Controller)
    participant DB as Database (MySQL / Prisma)
    participant WS as WebSocket Scoreboard Hub
    actor ALL as Seluruh Peserta Lain

    P->>FE: Buka Detail Tantangan #3
    FE->>API: GET /challenges/:id
    API->>DB: Cek Event, Mode Tim, & Chained Level
    alt Tantangan Terkunci (Chained Level Belum Selesai)
        API-->>FE: 403 Forbidden: Tantangan Masih Terkunci
        FE-->>P: Tampilkan Dialog Gembok 🔒
    else Tantangan Terbuka
        API-->>FE: 200 OK (Deskripsi & File URL)
        FE-->>P: Tampilkan Soal & Box Input Flag
    end

    P->>FE: Submit Flag "RR26{cYbEr_1nc1d3nt_r3sp0ns3}"
    FE->>API: POST /challenges/submit
    API->>DB: Cek Tim, Status Banned, & Freeze Time
    API->>API: Verifikasi Hash SHA256(Flag)
    
    alt Flag Benar
        API->>DB: Catat Submission (is_correct = true)
        API->>DB: Tambah Poin Skor Tim
        API->>DB: Cek Apakah First Blood
        opt Jika First Blood
            API->>DB: Catat FirstBlood Record
            API->>WS: broadcastFirstBlood (Tim, Challenge, Time)
            WS-->>ALL: 🩸 Notifikasi Banner First Blood Muncul Realtime!
        end
        API->>WS: broadcastScoreboardUpdate (Event ID)
        WS-->>ALL: 📈 Scoreboard & Chart Terupdate Otomatis
        API-->>FE: 200 OK (Jawaban Benar, +Points)
        FE-->>P: Efek Sukses & Suara Alert
    else Flag Salah
        API->>DB: Catat Log Percobaan Salah
        API-->>FE: 400 Bad Request (Flag Salah)
        FE-->>P: Notifikasi Merah: Invalid Flag
    end
```

---

### Diagram 4: Alur Manajemen Panitia HQ Command

```mermaid
flowchart LR
    subgraph ADMIN_FLOW["Admin HQ Command Flow"]
        ADM(["Admin Super Command"]) --> A1["1. Buat Event Arena & Jadwal"]
        ADM --> A2["2. Import / Input Soal CTF (XLSX)"]
        ADM --> A3["3. Generate Access Token Batch"]
        ADM --> A4["4. Kelola Roles & Hak Akses Pengguna"]
        ADM --> A5["5. Monitor Live Radar & Kontrol Timer (Pause/Stop)"]
        ADM --> A6["6. Evaluasi Writeup dengan In-App Viewer"]
    end

    A1 --> DB[("Database MySQL")]
    A2 --> DB
    A3 --> DB
    A4 --> DB
    A5 --> DB
    A6 --> DB
```

---

### Diagram 5: Alur Pengumpulan, In-App Viewer & Penilaian Writeup

```mermaid
sequenceDiagram
    autonumber
    actor P as Tim Peserta (Squad)
    participant FE_P as Portal Peserta (/writeup)
    participant API as Backend Engine (/api/writeup)
    participant FS as Storage Disk Server
    participant DB as MySQL Database
    actor J as Dewan Juri / Panitia
    participant FE_A as Portal Evaluasi (/hq/writeups)
    participant WS as WebSocket Hub
    actor ALL as Papan Skor Publik (/scoreboard)

    Note over P,FE_P: Sesi Kompetisi Berakhir / Window Writeup Dibuka
    P->>FE_P: Upload File Laporan (.pdf / .zip / .docx / .md) + Catatan
    FE_P->>API: POST /api/writeup/upload (Multipart Form Data)
    API->>FS: Simpan File Fisik Aman (uploads/writeups/)
    API->>DB: Upsert Record Writeup (team_id, file_url, size, notes)
    API-->>FE_P: 201 Created: Dokumen Terkirim
    FE_P-->>P: Tampilkan Status "✓ SUBMITTED" & Tombol In-App Viewer

    Note over J,FE_A: Proses Penilaian & Evaluasi Dokumen
    J->>FE_A: Buka Menu Writeup Evaluation (/hq/writeups)
    FE_A->>API: GET /api/writeup/admin/all
    API-->>FE_A: List Seluruh Writeup Tim per Event
    J->>FE_A: Klik Tombol "Buka Viewer & Nilai"
    FE_A->>API: GET /api/writeup/view/:id (Inline Stream Pipe)
    API-->>FE_A: Stream Dokumen (PDF, Markdown, Gambar, Teks)
    
    J->>FE_A: Baca Dokumen di Viewer Split-Screen -> Input Skor & Feedback
    FE_A->>API: POST /api/writeup/admin/evaluate/:id
    API->>DB: Transaksi DB: Update Writeup.score & Akumulasi Team.score
    API->>WS: broadcastScoreboardUpdate(eventId)
    WS-->>ALL: 📈 Scoreboard Terupdate: Kolom Writeup Score Bertambah!
    API-->>FE_A: 200 OK: Nilai & Feedback Berhasil Dipublikasikan
    
    P->>FE_P: Buka Portal Writeup
    FE_P-->>P: Tampilkan Badge "Hasil Evaluasi Juri: +PTS" & Feedback Juri
```

---

### Diagram 6: Arsitektur Master Roles & Dynamic Permissions

```mermaid
graph TB
    subgraph ROLES_SCHEMA["Master Roles Database (custom_roles)"]
        R1["⚡ ADMIN (Super Command)<br/>Hak: Full Control, Timer, CRUD, Scoring"]
        R2["📝 JURY (Dewan Juri)<br/>Hak: In-App Viewer, Scoring, Feedback"]
        R3["👁️ MODERATOR (Pengawas)<br/>Hak: Live Radar, Roster, Log Stream"]
        R4["🎯 PARTICIPANT (Operative)<br/>Hak: Arena, Solve, Team, Submit, Writeup"]
        R5["✨ CUSTOM ROLE (VIP, Sponsor, Mentor, dll.)<br/>Hak: Konfigurasi Dinamis"]
    end

    subgraph USERS_ASSIGNMENT["Matriks Penugasan Pengguna (users)"]
        U1["@admin_hq -> Role: ADMIN"]
        U2["@juri_01 -> Role: JURY"]
        U3["@proctor_a -> Role: MODERATOR"]
        U4["@peserta_1 -> Role: PARTICIPANT"]
        U5["@guest_vip -> Role: VIP_OBSERVER"]
    end

    R1 --> U1
    R2 --> U2
    R3 --> U3
    R4 --> U4
    R5 --> U5
```

---

## 5. Panduan Operasional Panitia & Admin HQ (`/hq`)

### 1. Manajemen Event Arena (`/hq/events`)
- **Buat Event**: Atur nama event, format partisipasi (Solo, Squad, Hybrid), minimal/maksimal anggota tim, jadwal waktu, chained mode, dan freeze time.
- **Kontrol Arena**: Tombol Force Pause dan Force Stop dengan dialog konfirmasi darurat.

### 2. Manajemen Token Akses (`/hq/tokens`)
- **Generate Batch**: Buat token akses berlabel per institusi/kategori (misal 50 token untuk Kampus A).
- **Reset / Unlink Token**: Mengembalikan token ke status `AVAILABLE` dan melepaskan akses event user terkait jika terjadi kesalahan penugasan.

### 3. Manajemen Soal & Tantangan (`/hq/challenges`)
- **Pembuatan Soal**: Input judul, kategori, poin, flag (otomatis di-hash SHA256), hint, dan file attachment.
- **Import / Export Spreadsheet**: Impor massal paket tantangan dari file `.xlsx` / `.csv`.

### 4. Manajemen Pengguna & Operatives (`/hq/users`)
- **Tambah User**: Pendaftaran akun manual lengkap dengan role dan target arena.
- **Edit User**: Pembaruan identitas, role akses, target event, dan reset password.
- **Hapus User**: Penghapusan akun dengan konfirmasi keamanan.
- **Inspeksi Riwayat**: Melihat ringkasan dossier, riwayat klaim token, submission flag, dan laporan writeup.

### 5. Manajemen Roles & Permissions (`/hq/roles`)
- **Buat Role Kustom**: Menentukan kode role (misal: `SPONSOR_JUDGE`), nama tampilan, deskripsi multiline textarea, palette warna badge, dan checklist hak akses.
- **Edit & Hapus Role**: Memperbarui hak akses atau menghapus role kustom (user otomatis dialihkan ke `PARTICIPANT`).
- **Carousel & View Switcher**: Filter cepat via carousel geser atau beralih antara tampilan Tabel Master dan Grid Cards.

### 6. Evaluasi Laporan Writeup (`/hq/writeups`)
- **Interactive Document Viewer**: Baca dokumen PDF, Markdown, gambar, dan teks langsung di browser.
- **Inline Grading**: Masukkan skor penilaian dan catatan feedback evaluasi dengan sinkronisasi langsung ke live scoreboard.

---

## 6. Panduan Dewan Juri & Moderator Pengawas

### 📝 Dewan Juri (`JURY`)
1. Login dengan akun bertipe role `JURY`.
2. Akses menu **Writeup Evaluation** (`/hq/writeups`).
3. Buka laporan tim menggunakan **Document Viewer**.
4. Masukkan skor penilaian (0 - 1000 poin) dan catatan evaluasi juri.
5. Klik **Simpan & Publikasikan** untuk memperbarui skor tim di scoreboard secara realtime.

### 👁️ Moderator Pengawas (`MODERATOR`)
1. Akses menu **Live Radar** (`/hq/live-activity`).
2. Pantau timeline pengiriman flag peserta secara realtime.
3. Awasi statistik solves, tingkat keberhasilan, dan notifikasi First Blood.

---

## 7. Panduan Peserta (Participant Guide)

1. **Pendaftaran**: Registrasi di `/register` dengan verifikasi Captcha.
2. **Klaim Token**: Masuk ke `/join` dan masukkan Access Token dari panitia.
3. **Squad / Tim**: Buka menu `/team` untuk membuat tim baru atau bergabung menggunakan invite code.
4. **Mengerjakan Tantangan**: Buka menu tantangan di Dashboard, unduh file soal, dan submit flag (`RR26{...}`).
5. **Unggah Writeup**: Unggah file laporan investigasi (.pdf/.zip/.docx/.md) di menu `/writeup` sebelum batas waktu berakhir.
6. **Scoreboard**: Pantau peringkat tim dan First Blood di menu `/scoreboard`.

---

## 8. Struktur Data & Skema Database

| Entitas Model | Tabel MySQL | Penjelasan & Atribut Utama |
| :--- | :--- | :--- |
| **`Event`** | `events` | Wadah arena kompetisi (`id`, `name`, `join_token`, `participation_mode`, `min_team_size`, `max_team_size`, `start_time`, `end_time`, `is_chained`, `is_frozen`). |
| **`EventToken`** | `event_tokens` | Tiket akses unik per event (`id`, `token`, `event_id`, `label`, `is_used`, `used_by_user_id`). |
| **`User`** | `users` | Akun pengguna (`id`, `username`, `email`, `password_hash`, `role`, `event_id`). |
| **`CustomRole`** | `custom_roles` | Master konfigurasi role & hak akses (`id`, `name`, `display_name`, `description`, `badge_color`, `permissions`, `is_system`). |
| **`Team`** | `teams` | Squad kompetisi (`id`, `name`, `invite_code`, `leader_id`, `score`, `writeup_score`, `color`, `event_id`, `is_banned`). |
| **`TeamMember`**| `team_members` | Relasi anggota tim (`id`, `team_id`, `user_id`, `joined_at`). |
| **`Category`** | `categories` | Kategori soal CTF (`id`, `name`). |
| **`Challenge`** | `challenges` | Soal CTF (`id`, `title`, `description`, `category`, `points`, `flag_hash`, `hint`, `hint_cost`, `file_url`, `event_id`). |
| **`Submission`** | `submissions` | Log pengiriman flag (`id`, `team_id`, `user_id`, `challenge_id`, `is_correct`, `submitted_at`). |
| **`FirstBlood`** | `first_bloods`| Rekor pemecah soal pertama (`id`, `challenge_id`, `team_id`, `achieved_at`). |
| **`Writeup`** | `writeups` | Dokumen laporan investigasi & penilaian juri (`id`, `team_id`, `user_id`, `event_id`, `file_url`, `file_name`, `file_size`, `score`, `feedback`, `evaluated_by`, `evaluated_at`, `submitted_at`). |

---

> 💡 **Instalasi Cepat**:
> ```bash
> # 1. Install dependencies
> bun install
> 
> # 2. Sinkronisasi database
> cd packages/backend && bun x prisma db push
> 
> # 3. Jalankan aplikasi
> bun run dev
> ```
