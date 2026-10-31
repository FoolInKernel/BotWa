import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker } from 'wa-sticker-formatter'

const PACK_NAME = 'bot'
const AUTHOR_NAME = 'napoleon'

export default {
  name: 's',
  aliases: ['sticker'],

  async execute({ sock, msg, jid }) {
    const imageMessage = msg.message?.imageMessage

    if (!imageMessage) {
      await sock.sendMessage(
        jid,
        { text: 'Kirim foto dengan caption .s atau .sticker' },
        { quoted: msg },
      )
      return
    }

    try {
      const buffer = await downloadMediaMessage(msg, 'buffer', {})

      const sticker = new Sticker(buffer, {
        pack: PACK_NAME,
        author: AUTHOR_NAME,
        type: 'full',
        quality: 70,
        categories: ['🤖'],
      })

      const stickerBuffer = await sticker.toBuffer()

      console.log('Ukuran stiker:', stickerBuffer.length, 'bytes')

      await sock.sendMessage(
        jid,
        { sticker: stickerBuffer },
        { quoted: msg },
      )
    } catch (error) {
      console.error('Gagal membuat stiker:', error)

      await sock.sendMessage(
        jid,
        { text: 'Gagal membuat stiker. Periksa log terminal.' },
        { quoted: msg },
      )
    }
  },
}
