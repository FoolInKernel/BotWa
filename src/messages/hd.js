import { downloadMediaMessage } from '@whiskeysockets/baileys'
import sharp from 'sharp'

const MAX_FILE_SIZE = 30 * 1024 * 1024

export default {
  name: 'hd',
  aliases: [],

  async execute({ sock, msg, jid }) {
    const imageMessage = msg.message?.imageMessage

    if (!imageMessage) {
      await sock.sendMessage(
        jid,
        { text: 'Kirim foto dengan caption .hd' },
        { quoted: msg },
      )
      return
    }

    const fileSize = Number(imageMessage.fileLength || 0)
    if (fileSize > MAX_FILE_SIZE) {
      await sock.sendMessage(
        jid,
        { text: 'Ukuran foto terlalu besar (maksimal 30 MB).' },
        { quoted: msg },
      )
      return
    }

    try {
      const buffer = await downloadMediaMessage(msg, 'buffer', {})

      const lowResBuffer = await sharp(buffer)
        .resize({ width: 144, withoutEnlargement: true })
        .jpeg({ quality: 30 })
        .toBuffer()

      await sock.sendMessage(
        jid,
        { image: lowResBuffer, caption: '✨ HD Ultra 4K (144p)' },
        { quoted: msg },
      )
    } catch (error) {
      console.error('Gagal memproses gambar HD:', error)

      await sock.sendMessage(
        jid,
        { text: 'Gagal mengubah resolusi foto.' },
        { quoted: msg },
      )
    }
  },
}
