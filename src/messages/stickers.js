import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker } from 'wa-sticker-formatter'
import { getImageData } from '../utils/media.js'
import { enqueueStickerJob } from '../utils/sticker-queue.js'

const PACK_NAME = 'bot'
const AUTHOR_NAME = 'napoleon'
const MAX_FILE_SIZE = 30 * 1024 * 1024

const enqueueJob = enqueueStickerJob

export default {
  name: 's',
  aliases: ['sticker'],

  async execute({ sock, msg, jid }) {
    const imageData = getImageData(msg)

    if (!imageData) {
      await sock.sendMessage(
        jid,
        { text: 'Kirim atau reply foto dengan .s atau .sticker' },
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

    await sock.sendMessage(
      jid,
      { text: '⏳ Sedang membuat stiker, mohon tunggu...' },
      { quoted: msg },
    )

    await enqueueJob(async () => {
      try {
        const buffer = await downloadMediaMessage(downloadMsg, 'buffer', {})

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
    })
  },
}
