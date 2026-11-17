# BotWA — WhatsApp Bot

Bot WhatsApp ringan berbasis **Node.js ESM** + **Baileys**, dirancang untuk dijalankan di laptop dev dan diproduksi pada STB **HG680P** (Armbian Linux ARM64, RAM 2 GB).

## Fitur & Perintah

| Command | Alias | Akses | Deskripsi |
|---|---|---|---|
| `.ping` | — | Umum | Cek status keaktifan bot |
| `.menu` | `.help` | Umum | Menampilkan daftar perintah bot |
| `.s` | `.sticker` | Umum | Buat stiker dari foto langsung / reply foto (max 30MB, queue 2 job) |
| `.hd` | — | Umum | Downscale foto langsung / reply foto ke resolusi 144p |
| `.rehd` | `.upscale`, `.enhance` | Umum | HD-kan foto sungguhan via AI (9Router) |
| `.group` | — | Owner | Kelola whitelist grup (`add`, `remove`, `list`) |
| `.sistem` | — | Owner | Informasi CPU, RAM, Disk, dan Uptime server |

> **Catatan:** Perintah umum di dalam grup hanya dapat digunakan jika grup tersebut sudah didaftarkan ke whitelist via `.group add`.

## Persyaratan Sistem

- Node.js v18+ (ES Modules)
- npm

## Cara Instalasinya & Memulai

1. **Clone repository & install dependensi:**
   ```bash
   git clone <repository-url>
   cd wa-bot
   npm ci --only=production
   ```

2. **Konfigurasi Environment (`.env`):**
   Salin `.env.example` ke `.env` lalu sesuaikan isi variabelnya:
   ```env
   OWNER_NUMBER=628xxx
   LOG_LEVEL=warn
   AUTH_DIR=./data/auth
   GROUPS_FILE=./data/allowed-groups.json
   # AI (opsional) — 9router untuk fitur .hd
   AI_API_URL=http://127.0.0.1:20128/v1
   AI_API_KEY=
   AI_MODEL=gemini-2.5-flash-image
   ```

3. **Jalankan Bot:**
   ```bash
   npm start
   ```
   Scan QR Code yang muncul di terminal melalui menu *Perangkat Tertaut* di WhatsApp.

4. **Pengujian:**
   ```bash
   node test/test-loader-auth.js
   ```

## Catatan Deploy ARM64 (STB HG680P)

Jika `sharp` mengalami kendala build saat `npm ci`, pastikan dependensi build terinstall:
```bash
sudo apt update && sudo apt install -y build-essential python3
```
