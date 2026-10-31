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
        '• .s - membuat stiker',
        '• .sticker - membuat stiker',
      ].join('\n'),
    })
  },
}
