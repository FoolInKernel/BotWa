# BotWA — WhatsApp Bot

Bot WhatsApp ringan berbasis **Node.js ESM** + **Baileys**, dirancang untuk dijalankan di laptop dev dan diproduksi pada STB **HG680P** (Armbian Linux ARM64, RAM 2 GB).

## Fitur & Perintah

| Command | Alias | Akses | Deskripsi |
|---|---|---|---|
| `.ping` | — | Umum | Cek status keaktifan bot |
| `.menu` | `.help` | Umum | Menampilkan daftar perintah bot |
| `.s` | `.sticker` | Umum | Buat stiker dari foto langsung / reply foto (max 30MB, queue 2 job) |
| `.sa` | `.audiosticker`, `.stickeraudio` | Umum | Buat stiker bersuara dari video / foto + voice note (eksperimental) |
| `.hd` | — | Umum | Downscale foto langsung / reply foto ke resolusi 144p |
| `.rehd` | `.upscale`, `.enhance` | Umum | HD-kan foto sungguhan via AI (9Router) |
| `.group` | — | Owner | Kelola whitelist grup (`add`, `remove`, `list`) |
| `.sistem` | — | Owner | Informasi CPU, RAM, Disk, dan Uptime server |

> **Catatan:** Perintah umum di dalam grup hanya dapat digunakan jika grup tersebut sudah didaftarkan ke whitelist via `.group add`.

### Stiker bersuara (`.sa`) — eksperimental

Fitur ini mengikuti format *sound sticker* WhatsApp beta: WebP + trek audio
Ogg Opus yang ditempel di `StickerMessage.audioMessage` dan dibungkus
`audioStickerMessage`. Penerima perlu WhatsApp versi beta yang mendukung fitur
ini untuk bisa memutar suaranya; di versi lain stiker tetap tampil (tanpa audio).

Cara pakai:

1. **Reply video** dengan `.sa` → stiker animasi + suara dari video tersebut.
2. **Kirim foto dengan caption `.sa`** sambil **reply voice note/audio** →
   foto jadi stiker, suara diambil dari pesan yang di-reply.
3. Tambahkan angka untuk durasi audio: `.sa 8` (default 6, maks 10 detik).

Konversi video/audio memakai `ffmpeg` sistem (bukan paket npm baru). Jika
`ffmpeg` belum ada, fitur video dan audio non-Opus akan menolak dengan pesan
yang jelas. Voice note Ogg Opus yang pendek dipakai langsung tanpa ffmpeg.

```bash
sudo apt install -y ffmpeg   # Armbian/Debian
```

## Persyaratan Sistem

- Node.js v18+ (ES Modules)
- npm
- `ffmpeg` (opsional, untuk `.sa` dari video / audio non-Opus)

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
