export async function handleMenu(sock, jid, command) {
  if (command !== 'menu' && command !== 'help') return false

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

  return true
}
