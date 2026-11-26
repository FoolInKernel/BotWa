import { downloadMediaMessage } from '@whiskeysockets/baileys'
import sharp from 'sharp'
import { getImageData } from '../utils/media.js'

const MAX_FILE_SIZE = 30 * 1024 * 1024

export default {
  name: 'hd',
  aliases: [],

  async execute({ sock, msg, jid }) {
    const imageData = getImageData(msg)

    if (!imageData) {
      await sock.sendMessage(
        jid,
        { text: 'Kirim atau reply foto dengan .hd' },
        { quoted: msg },
      )
      return
    }

    const { imageMessage, downloadMsg } = imageData
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
      await sock.sendMessage(
        jid,
        { text: '⏳ Sedang memproses foto HD (144p), mohon tunggu...' },
        { quoted: msg },
      )

      const buffer = await downloadMediaMessage(downloadMsg, 'buffer', {})

      const lowResBuffer = await sharp(buffer)
        .resize({ width: 144, withoutEnlargement: true })
        .jpeg({ quality: 30 })
        .toBuffer()

      const senderJid = msg.key.participant || msg.key.remoteJid
      const senderNumber = senderJid ? senderJid.split('@')[0].split(':')[0] : ''

      await sock.sendMessage(
        jid,
        {
          image: lowResBuffer,
          caption: `✨ HD Ultra 4K (144p)\nRequest by: @${senderNumber}`,
          mentions: senderJid ? [senderJid] : [],
        },
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
