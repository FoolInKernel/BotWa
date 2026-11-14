import { Sticker } from 'wa-sticker-formatter'
import sharp from 'sharp'
import { generateBratSvg } from '../utils/brat.js'

export default {
  name: 'brat2',
  aliases: [],

  async execute({ sock, msg, jid, args }) {
    const text = args.join(' ').trim()

    if (!text) {
      await sock.sendMessage(
        jid,
        { text: 'Gunakan: .brat2 <teks>' },
        { quoted: msg },
      )
      return
    }

    try {
      const words = text.split(/\s+/)
      const frameBuffers = []

      for (let i = 1; i <= words.length; i++) {
        const partialText = words.slice(0, i).join(' ')
        const svg = generateBratSvg(partialText)
        const frameBuf = await sharp(Buffer.from(svg))
          .resize(512, 512)
          .png()
          .toBuffer()
        frameBuffers.push(frameBuf)
      }

      if (words.length > 1) {
        frameBuffers.push(frameBuffers[frameBuffers.length - 1])
      }

      const animatedWebp = await sharp(frameBuffers, { animated: true })
        .webp({ delay: 500, loop: 0 })
        .toBuffer()

      const sticker = new Sticker(animatedWebp, {
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
      console.error('Gagal membuat brat2:', error)
      await sock.sendMessage(
        jid,
        { text: 'Gagal membuat stiker animasi brat2.' },
        { quoted: msg },
      )
    }
  },
}
