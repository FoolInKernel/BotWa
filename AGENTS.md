# AGENTS.md — wa-bot

Ringkasan aturan & panduan pengembangan project **wa-bot**.

## Overview & Arsitektur

Bot WhatsApp berbasis **Node.js ESM** + **Baileys** (`@whiskeysockets/baileys`).
Target produksi: STB **HG680P** (Armbian ARM64, RAM 2 GB, eMMC) — wajib hemat resource.

```text
wa-bot/
├── src/
│   ├── index.js                 # Entry point (socket Baileys, reconnect, shutdown, error guards)
│   ├── config.js                # Environment config (.env)
│   ├── groups.js                # Whitelist grup persistence (data/allowed-groups.json)
│   ├── core/
│   │   ├── command-loader.js    # Auto-discovery command di src/messages/*.js
│   │   └── message-handler.js   # Parsing + Access Control terpusat (multi-device JID)
│   ├── utils/
│   │   └── media.js             # Helper ekstraksi gambar (langsung / reply)
│   └── messages/                # Satu file per command (auto-loaded)
│       ├── ping.js
│       ├── menu.js
│       ├── stickers.js          # Batas 30MB & queue max 2 concurrent jobs
│       ├── hd.js                # Downscale 144p (langsung / reply)
│       ├── group.js
│       └── sistem.js
├── test/test-loader-auth.js     # Test loader & otorisasi tanpa koneksi WA
├── data/
│   ├── allowed-groups.json      # Whitelist grup
│   └── auth/                    # Sesi WhatsApp (git-ignored)
├── .env / .env.example
├── README.md
└── package.json
```

## Peran Modul & Aturan Pengembangan

1. **`src/index.js`**: Socket Baileys dengan `getMessage`, QR, reconnect backoff, shutdown SIGINT/SIGTERM, timeout 60 detik, serta global error handler (`uncaughtException` & `unhandledRejection`) untuk mencegah crash app-state sync. DILARANG import/register command manual di sini.
2. **`src/core/command-loader.js`**: Auto-load semua file `.js` di `src/messages/` secara deterministik. Validasi nama/alias unik & kontrak modul.
3. **`src/core/message-handler.js`**: Pusat otorisasi (owner check termasuk multi-device JID `jid.split('@')[0].split(':')[0]`, whitelist grup). Command tidak boleh mengimplementasikan check otorisasi sendiri.
4. **`src/utils/media.js`**: Utility `getImageData` untuk mengekstrak media gambar baik dari pesan langsung maupun reply (quoted message).
5. **`src/messages/`**: Setiap command adalah 1 file JS tersendiri dengan kontrak:
   ```js
   export default {
     name: 'nama',
     aliases: [],
     ownerOnly: false,          // opsional
     allowUnlistedGroup: false, // opsional
     async execute({ sock, msg, jid, command, args, isGroup, isOwner }) {},
   }
   ```

## Fitur & Command

| Command | Alias | Akses | Fungsi |
|---|---|---|---|
| `.ping` | — | umum | Cek status keaktifan bot |
| `.menu` | `.help` | umum | Daftar perintah bot |
| `.s` | `.sticker` | umum | Buat stiker dari foto langsung / reply foto (max 30MB, queue 2 job) |
| `.hd` | — | umum | Downscale foto langsung / reply foto ke 144p (JPEG q30) |
| `.group add\|remove\|list` | — | owner-only, `allowUnlistedGroup` | Kelola whitelist grup |
| `.sistem` | — | owner-only, `allowUnlistedGroup` | Info CPU, RAM, disk, uptime |

## Manajemen Resource & Keamanan (STB HG680P)

- **Resource STB 2GB RAM & eMMC terbatas**: 
  - Utamakan pemrosesan media ringan via In-Memory Buffer (`Buffer`).
  - **DILARANG** menggunakan library berbasis video/renderer berat (seperti `brat-canvas` atau `ffmpeg` full) karena memerlukan instalasi 151+ dependensi (>393 MB) dan boros CPU/RAM.
  - Batasi pekerjaan berat secara konsisten (queue max 2 job untuk stiker).
- **Keamanan**:
  - DILARANG commit `.env`, `data/auth/`, file sesi WA, atau secret ke git.
  - Jangan pernah melembutkan otorisasi owner atau whitelist grup.
  - Selalu validasi ukuran file input (maks 30MB).

## Menjalankan & Verifikasi

```bash
npm start                          # Jalankan bot
npm ci --only=production           # Install dependensi di server
node test/test-loader-auth.js      # Test loader + otorisasi
node --check <file.js>             # Cek sintaks file yang diubah
```
