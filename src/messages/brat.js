import { Sticker } from 'wa-sticker-formatter'
import sharp from 'sharp'
import { generateBratSvg } from '../utils/brat.js'

export default {
  name: 'brat',
  aliases: [],

  async execute({ sock, msg, jid, args }) {
    const text = args.join(' ').trim()

    if (!text) {
      await sock.sendMessage(
        jid,
        { text: 'Gunakan: .brat <teks>' },
        { quoted: msg },
      )
      return
    }

    try {
      const svg = generateBratSvg(text)
      const pngBuf = await sharp(Buffer.from(svg))
        .resize(512, 512)
        .png()
        .toBuffer()

      const sticker = new Sticker(pngBuf, {
        pack: 'bot',
        author: 'napoleon',
        type: 'full',
        quality: 70,
        categories: ['🤖'],
      })

      const stickerBuffer = await sticker.toBuffer()

      await sock.sendMessage(
        jid,
        { sticker: stickerBuffer },
        { quoted: msg },
      )
    } catch (error) {
      console.error('Gagal membuat brat:', error)
      await sock.sendMessage(
        jid,
        { text: 'Gagal membuat stiker brat.' },
        { quoted: msg },
      )
    }
  },
}
