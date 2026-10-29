import 'dotenv/config'
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import { handleMenu } from './messages/menu.js'
import { isAllowedGroup, manageGroups } from './groups.js'
import { handleSticker } from './messages/stickers.js'

const logger = pino({ level: process.env.LOG_LEVEL || 'warn' })
const AUTH_DIR = process.env.AUTH_DIR || './data/auth'
const PREFIX = '.'

const OWNER_NUMBER = (process.env.OWNER_NUMBER || '').replace(/\D/g, '')

function isOwnerMessage(msg) {
  if (!OWNER_NUMBER) return false
  const candidates = [
    msg.key.remoteJidAlt,
    msg.key.participantAlt,
    msg.key.participant,
    msg.key.remoteJid,
  ]

  return candidates.some((jid) => {
    if (!jid || !jid.endsWith('@s.whatsapp.net')) {
      return false
    }

    const number = jid.split('@')[0].replace(/\D/g, '')
    return number === OWNER_NUMBER
  })
}

let stopping = false
let retryDelay = 2000
let activeSocket

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function startBot() {
  while (!stopping) {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)

      const sock = makeWASocket({
        auth: state,
        logger,
        printQRInTerminal: false,
        markOnlineOnConnect: false,
        syncFullHistory: false,
      })

      activeSocket = sock
      sock.ev.on('creds.update', saveCreds)

      sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
          console.log('\nScan QR ini melalui WhatsApp > Perangkat tertaut:\n')
          qrcode.generate(qr, { small: true })
        }

        if (connection === 'open') {
          retryDelay = 2000
          console.log('Bot WhatsApp terhubung.')
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode

          if (statusCode === DisconnectReason.loggedOut) {
            console.error(
              'Sesi logout. Perlu autentikasi ulang; hentikan bot dan periksa sesi.',
            )
            stopping = true
          } else {
            console.log('Koneksi terputus; mencoba menyambung ulang.')
          }
        }
      })

      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return

        for (const msg of messages) {
          if (!msg.message || msg.key.fromMe) continue

          const jid = msg.key.remoteJid

          if (!jid || jid === 'status@broadcast') continue

          const isGroup = jid.endsWith('@g.us')

          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            ''

          const input = text.trim()
          if (!input.startsWith(PREFIX)) continue

          const [command, ...args] = input
            .slice(PREFIX.length)
            .trim()
            .toLowerCase()
            .split(/\s+/)

          try {
            const owner = isOwnerMessage(msg)

            const managed = await manageGroups(sock, msg, command, args, owner)

            if (managed) continue

            if (isGroup && !(await isAllowedGroup(jid))) continue

            const handled = await handleSticker(sock, msg, command)
            if (handled) continue

            if (command === 'ping') {
              await sock.sendMessage(jid, {
                text: 'Pong! Bot aktif. ✅',
              })
              continue
            }

            await handleMenu(sock, jid, command)
          } catch (error) {
            console.error('Gagal memproses pesan:', error.message)
          }
        }
      })

      // Tunggu sampai koneksi ditutup sebelum membuat socket baru.
      await new Promise((resolve) => {
        sock.ev.on('connection.update', ({ connection }) => {
          if (connection === 'close') resolve()
        })
      })

      if (stopping) break

      await sleep(retryDelay)
      retryDelay = Math.min(retryDelay * 2, 30000)
    } catch (error) {
      console.error('Kesalahan bot:', error.message)
      if (!stopping) {
        await sleep(retryDelay)
        retryDelay = Math.min(retryDelay * 2, 30000)
      }
    }
  }
}

async function shutdown(signal) {
  if (stopping) return
  console.log(`\nMenerima ${signal}; menghentikan bot...`)
  stopping = true
  activeSocket?.end(undefined)
}

process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))

startBot().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
