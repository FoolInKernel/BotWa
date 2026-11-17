import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { getImageData } from '../utils/media.js'
import { isAiEnabled, upscaleImageWithAI } from '../utils/ai.js'

const MAX_FILE_SIZE = 30 * 1024 * 1024

export default {
  name: 'rehd',
  aliases: ['upscale', 'enhance'],

  async execute({ sock, msg, jid }) {
    if (!isAiEnabled()) {
      await sock.sendMessage(
        jid,
        { text: 'Fitur AI belum dikonfigurasi pada server bot.' },
        { quoted: msg },
      )
      return
    }

    const imageData = getImageData(msg)

    if (!imageData) {
      await sock.sendMessage(
        jid,
        { text: 'Kirim atau reply foto dengan .rehd' },
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
        { text: '⏳ Sedang memproses peningkatan kualitas foto via AI...' },
        { quoted: msg },
      )

      const buffer = await downloadMediaMessage(downloadMsg, 'buffer', {})
      const aiBuffer = await upscaleImageWithAI(buffer)

      const senderJid = msg.key.participant || msg.key.remoteJid
      const senderNumber = senderJid ? senderJid.split('@')[0].split(':')[0] : ''

      await sock.sendMessage(
        jid,
        {
          image: aiBuffer,
          caption: `✨ Foto berhasil di-HD-kan oleh AI (9Router)\nRequest by: @${senderNumber}`,
          mentions: senderJid ? [senderJid] : [],
        },
        { quoted: msg },
      )
    } catch (error) {
      console.error('Gagal memproses AI HD:', error?.message || error)

      await sock.sendMessage(
        jid,
        { text: `Gagal memproses gambar AI: ${error?.message || 'Error tidak diketahui'}` },
        { quoted: msg },
      )
    }
  },
}
