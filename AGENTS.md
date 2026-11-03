# AGENTS.md — wa-bot

Ringkasan project. Sebelum mengubah kode, baca `.clinerules` di root project
sebagai acuan aturan pengembangan lengkap.

## Apa ini

Bot WhatsApp berbasis **Node.js ESM** + **Baileys**, prefix perintah `.`.
Dikembangkan di laptop, target produksi STB **HG680P** (Armbian ARM64,
user `pang`, RAM 2 GB) sehingga harus tetap ringan.

## Stack

- Runtime: Node.js, ES Modules (`"type": "module"`)
- WhatsApp: `@whiskeysockets/baileys` 7.0.0-rc14
- Pendukung: `pino`, `qrcode-terminal`, `dotenv`, `sharp`,
  `wa-sticker-formatter`
- Dev: `eslint`
- Format: Prettier — no semicolon, single quote, trailing comma `all`

## Struktur

```text
wa-bot/
├── src/
│   ├── index.js                 # entry point (npm start)
│   ├── config.js                # baca env
│   ├── groups.js                # whitelist grup (JSON)
│   ├── core/
│   │   ├── command-loader.js    # auto-discovery command
│   │   └── message-handler.js   # parsing + access control terpusat
│   └── messages/                # satu file per command, auto-loaded
│       ├── ping.js
│       ├── menu.js
│       ├── stickers.js
│       ├── group.js
│       └── sistem.js
├── test/test-loader-auth.js     # test loader + otorisasi tanpa koneksi WA
├── data/
│   ├── allowed-groups.json      # whitelist grup
│   └── auth/                    # sesi WhatsApp (git-ignored)
├── .env / .env.example
└── package.json
```

### Peran modul

- `src/index.js` — socket Baileys, QR, reconnect dengan backoff, shutdown
  SIGINT/SIGTERM, timeout koneksi awal 60 detik. Tidak berisi command.
- `src/core/command-loader.js` — memuat semua `src/messages/*.js` urut
  deterministik, validasi kontrak, tolak nama/alias duplikat.
- `src/core/message-handler.js` — parse pesan, cek owner & whitelist grup,
  dispatch command. **Semua access control di sini.**
- `src/messages/` — implementasi command. Tambah fitur = tambah satu file,
  tanpa edit `index.js`.
- `src/groups.js` — baca/tulis `data/allowed-groups.json`.
- `src/config.js` — `OWNER_NUMBER`, `AUTH_DIR`, `GROUPS_FILE`, `LOG_LEVEL`,
  `PREFIX` (`.`).

## Command

| Command | Alias | Akses | Fungsi |
|---|---|---|---|
| `.ping` | — | umum | Cek bot aktif |
| `.menu` | `.help` | umum | Daftar perintah |
| `.s` | `.sticker` | umum | Buat stiker dari foto (caption) |
| `.group add\|remove\|list` | — | owner-only, `allowUnlistedGroup` | Kelola whitelist grup |
| `.sistem` | — | owner-only, `allowUnlistedGroup` | Info CPU, RAM, disk, uptime |

Command umum di grup hanya jalan di grup yang ada di whitelist.

## Environment

Salin `.env.example` → `.env`:

- `OWNER_NUMBER` — nomor owner, format internasional tanpa `+`
- `LOG_LEVEL` — `silent|error|warn|info|debug`
- `AUTH_DIR` — default `./data/auth`
- `GROUPS_FILE` — default `./data/allowed-groups.json`

## Menjalankan & verifikasi

```bash
npm start                          # jalankan bot
node test/test-loader-auth.js      # test loader + otorisasi
node --check <file.js>             # cek sintaks file yang diubah
```

Catatan: `npm test` masih stub yang selalu gagal; gunakan perintah `node test/...`
di atas.

## Konvensi command

Setiap file di `src/messages/` wajib punya default export:

```js
export default {
  name: 'nama',
  aliases: [],
  ownerOnly: false,          // opsional
  allowUnlistedGroup: false, // opsional
  async execute({ sock, msg, jid, command, args, isGroup, isOwner }) {},
}
```

- `name` unik, semua alias unik.
- `execute` async.
- Jangan implementasi cek owner/whitelist di dalam command — sudah terpusat.

## Aturan penting

- Jangan commit `.env`, `data/`, `data/auth/`, atau file sesi WhatsApp.
- Jangan melemahkan verifikasi owner atau whitelist grup.
- Jangan commit/push otomatis.
- Jaga penggunaan memori/disk tetap kecil (target 2 GB RAM, eMMC).
- Perbarui `.menu` saat menambah command yang perlu terlihat user.


