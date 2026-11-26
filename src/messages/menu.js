export default {
  name: 'menu',
  aliases: ['help'],

  async execute({ sock, jid }) {
    await sock.sendMessage(jid, {
      text: [
        '👋 Halo, ini bot WA!',
        '',
        '📌 Daftar perintah:',
        '• .ping — Cek status bot',
        '• .menu — Menampilkan menu',
        '• .s / .sticker — Membuat stiker dari foto (langsung / reply)',
        '• .sa — Stiker bersuara: reply video/audio atau foto + voice note',
        '• .hd — Ubah foto jadi resolusi rendah 144p (candaan)',
        '• .remini / .upscale / .rehd — Remini AI tingkatkan resolusi & detail foto',
        '• .ai / .ask <teks/foto> — Tanya jawab atau analisis foto dengan AI',
      ].join('\n'),
    })
  },
}
