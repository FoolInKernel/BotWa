import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker } from 'wa-sticker-formatter'
import { getImageData } from '../utils/media.js'

const PACK_NAME = 'bot'
const AUTHOR_NAME = 'napoleon'
const MAX_FILE_SIZE = 30 * 1024 * 1024
const MAX_CONCURRENT = 2

let activeJobs = 0
const queue = []

// ponytail: simple in-memory queue for STB resource limits; upgrade to p-limit if queue priorities needed.
function processQueue() {
  while (activeJobs < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift()
    activeJobs++
    job().finally(() => {
      activeJobs--
      processQueue()
    })
  }
}

function enqueueJob(task) {
  return new Promise((resolve, reject) => {
    queue.push(async () => {
      try {
        resolve(await task())
      } catch (err) {
        reject(err)
      }
    })
    processQueue()
  })
}

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
