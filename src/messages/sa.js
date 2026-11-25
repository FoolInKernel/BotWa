import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker } from 'wa-sticker-formatter'
import { getSoundSources } from '../utils/media.js'
import {
  isFfmpegAvailable,
  probeDuration,
  toOpusOgg,
  videoToAnimatedSticker,
} from '../utils/ffmpeg.js'
import { sendSoundSticker } from '../utils/sound-sticker.js'
import { enqueueStickerJob } from '../utils/sticker-queue.js'

const PACK_NAME = 'bot'
const AUTHOR_NAME = 'napoleon'
const MAX_FILE_SIZE = 30 * 1024 * 1024
const MAX_ANIMATED_STICKER_BYTES = 500 * 1024
const MAX_STATIC_STICKER_BYTES = 100 * 1024
const DEFAULT_SECONDS = 6
const MAX_SECONDS = 10

const USAGE = [
  '🔊 *Stiker Bersuara (.sa)*',
  '',
  '1. Reply video dengan .sa → stiker animasi + suara dari video',
  '2. Kirim foto dengan caption .sa sambil reply voice note/audio → stiker + suara itu',
  '3. Tambahkan angka untuk durasi audio, mis. .sa 8',
  '',
  `Default ${DEFAULT_SECONDS} detik, maksimal ${MAX_SECONDS} detik.`,
  'Catatan: fitur eksperimental (WhatsApp beta) dan butuh ffmpeg untuk video.',
].join('\n')

class UserError extends Error {}

function parseSeconds(args) {
  const value = Number.parseInt(args[0], 10)
  if (!Number.isFinite(value)) return DEFAULT_SECONDS
  return Math.min(Math.max(value, 1), MAX_SECONDS)
}

function fileTooLarge(media) {
  return Number(media?.fileLength || 0) > MAX_FILE_SIZE
}

function createSticker(buffer, quality) {
  return new Sticker(buffer, {
    pack: PACK_NAME,
    author: AUTHOR_NAME,
    type: 'full',
    quality,
    categories: ['🔊'],
  })
}

async function buildImageSticker(buffer) {
  let stickerBuffer = await createSticker(buffer, 70).toBuffer()

  if (stickerBuffer.length > MAX_STATIC_STICKER_BYTES) {
    stickerBuffer = await createSticker(buffer, 40).toBuffer()
  }

  if (stickerBuffer.length > MAX_STATIC_STICKER_BYTES) {
    throw new UserError(
      'Hasil stiker masih lebih dari 100 KB. Coba foto yang lebih sederhana.',
    )
  }

  return stickerBuffer
}

async function resolveAudio(audioSource, buffer, maxSeconds) {
  const media = audioSource.media
  const mimetype = media.mimetype || 'audio/ogg; codecs=opus'
  let seconds = Number(media.seconds) || null
  const isOggOpus = /^audio\/ogg/i.test(mimetype)

  const needsTrim = seconds != null && seconds > maxSeconds

  // Voice note / audio Ogg Opus yang sudah pendek bisa dipakai langsung.
  if (audioSource.kind === 'audio' && isOggOpus && !needsTrim) {
    return { buffer, mimetype, seconds }
  }

  if (!(await isFfmpegAvailable())) {
    throw new UserError(
      'Audio ini perlu dikonversi ke Opus, tapi ffmpeg belum terpasang di server.',
    )
  }

  const oggBuffer = await toOpusOgg(buffer, { maxSeconds })
  let oggSeconds = null
  try {
    oggSeconds = await probeDuration(oggBuffer)
  } catch {
    oggSeconds = null
  }

  return {
    buffer: oggBuffer,
    mimetype: 'audio/ogg; codecs=opus',
    seconds: oggSeconds ?? Math.min(seconds ?? maxSeconds, maxSeconds),
  }
}

export default {
  name: 'sa',
  aliases: ['audiosticker', 'stickeraudio'],

  async execute({ sock, msg, jid, args }) {
    const maxSeconds = parseSeconds(args)
    const { visual, audio } = getSoundSources(msg)

    if (!visual || !audio) {
      await sock.sendMessage(jid, { text: USAGE }, { quoted: msg })
      return
    }

    if (fileTooLarge(visual.media) || fileTooLarge(audio.media)) {
      await sock.sendMessage(
        jid,
        { text: 'Ukuran media terlalu besar (maksimal 30 MB).' },
        { quoted: msg },
      )
      return
    }

    await enqueueStickerJob(async () => {
      try {
        const visualIsVideo = visual.kind === 'video'
        const sameSource = visual === audio

        const visualBuffer = await downloadMediaMessage(
          visual.downloadMsg,
          'buffer',
          {},
        )

        const audioBuffer = sameSource
          ? visualBuffer
          : await downloadMediaMessage(audio.downloadMsg, 'buffer', {})

        if (visualIsVideo && !(await isFfmpegAvailable())) {
          throw new UserError(
            'Stiker dari video butuh ffmpeg di server. Install dulu: sudo apt install ffmpeg',
          )
        }

        let stickerBuffer

        if (visualIsVideo) {
          stickerBuffer = await videoToAnimatedSticker(visualBuffer, {
            maxSeconds,
          })

          if (stickerBuffer.length > MAX_ANIMATED_STICKER_BYTES) {
            throw new UserError(
              'Hasil stiker lebih dari 500 KB. Coba durasi lebih pendek atau video yang lebih sederhana.',
            )
          }
        } else {
          stickerBuffer = await buildImageSticker(visualBuffer)
        }

        const resolvedAudio = sameSource
          ? await resolveAudio(
              { kind: 'video', media: visual.media },
              audioBuffer,
              maxSeconds,
            )
          : await resolveAudio(audio, audioBuffer, maxSeconds)

        await sendSoundSticker(sock, jid, {
          stickerBuffer,
          audioBuffer: resolvedAudio.buffer,
          audioMimetype: resolvedAudio.mimetype,
          audioSeconds: resolvedAudio.seconds,
          isAnimated: visualIsVideo,
        })
      } catch (error) {
        console.error('Gagal membuat stiker bersuara:', error)

        const message =
          error instanceof UserError
            ? error.message
            : 'Gagal membuat stiker bersuara. Periksa log terminal.'

        await sock.sendMessage(jid, { text: message }, { quoted: msg })
      }
    })
  },
}
