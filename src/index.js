import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import { AUTH_DIR, LOG_LEVEL } from './config.js'
import { loadCommands } from './core/command-loader.js'
import { createMessageHandler } from './core/message-handler.js'

const logger = pino({ level: LOG_LEVEL })

let stopping = false
let retryDelay = 2000
let activeSocket
let connectedOnce = false
let startupTimer

const STARTUP_TIMEOUT_MS = 60_000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function startBot() {
  const commands = await loadCommands()
  const handleMessage = createMessageHandler(commands)

  while (!stopping) {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)

      if (stopping) break

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
          connectedOnce = true
          clearTimeout(startupTimer)
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
          try {
            await handleMessage(sock, msg)
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
  clearTimeout(startupTimer)
  stopping = true
  activeSocket?.end(undefined)
}

process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))

startupTimer = setTimeout(() => {
  if (connectedOnce || stopping) return

  console.error(
    'Gagal terhubung ke WhatsApp dalam 60 detik; menghentikan bot.',
  )
  stopping = true
  activeSocket?.end(undefined)
  process.exitCode = 1
}, STARTUP_TIMEOUT_MS)

startBot().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
