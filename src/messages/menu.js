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
        '• .hd — Ubah foto jadi resolusi rendah 144p (langsung / reply)',
      ].join('\n'),
    })
  },
}
