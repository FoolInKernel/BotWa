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
        '• .s / .sticker — Membuat stiker dari foto',
        '• .hd — Ubah foto jadi resolusi 144p',
        '• .brat — Buat stiker teks gaya Brat',
        '• .brat2 — Buat stiker animasi teks Brat',
      ].join('\n'),
    })
  },
}
