/**
 * Test loader + authorization tanpa koneksi WhatsApp.
 * Jalankan: node test/test-loader-auth.js
 */
import assert from 'node:assert/strict'
import { loadCommands } from '../src/core/command-loader.js'
import { createMessageHandler } from '../src/core/message-handler.js'

// ── 1. Loader ────────────────────────────────────────────────

const commands = await loadCommands()

// Semua command terdaftar
assert.ok(commands.has('ping'), 'ping registered')
assert.ok(commands.has('menu'), 'menu registered')
assert.ok(commands.has('help'), 'help alias registered')
assert.ok(commands.has('s'), 's registered')
assert.ok(commands.has('sticker'), 'sticker alias registered')
assert.ok(commands.has('sa'), 'sa registered')
assert.ok(commands.has('audiosticker'), 'audiosticker alias registered')
assert.ok(commands.has('hd'), 'hd registered')
assert.ok(commands.has('remini'), 'remini registered')
assert.ok(commands.has('upscale'), 'upscale alias registered')
assert.ok(commands.has('group'), 'group registered')

// Alias mengarah ke command yang sama
assert.strictEqual(commands.get('help'), commands.get('menu'))
assert.strictEqual(commands.get('sticker'), commands.get('s'))
assert.strictEqual(commands.get('audiosticker'), commands.get('sa'))
assert.strictEqual(commands.get('upscale'), commands.get('remini'))
assert.strictEqual(commands.get('rehd'), commands.get('remini'))

// Metadata group
const groupCmd = commands.get('group')
assert.strictEqual(groupCmd.ownerOnly, true)
assert.strictEqual(groupCmd.allowUnlistedGroup, true)

// Metadata biasa default falsy
const pingCmd = commands.get('ping')
assert.ok(!pingCmd.ownerOnly)
assert.ok(!pingCmd.allowUnlistedGroup)

console.log('✅ Loader: semua command terdaftar, alias benar, metadata benar')

// ── 2. Authorization ────────────────────────────────────────

const sent = []
const fakeSock = {
  sendMessage: async (jid, content, opts) => {
    sent.push({ jid, content, opts })
  },
}

function makeMsg({ text = '', remoteJid = '628xxx@s.whatsapp.net', fromMe = false, participant = null, imageMessage = null } = {}) {
  const msg = {
    key: { remoteJid, fromMe },
    message: {},
  }
  if (participant) msg.key.participant = participant
  if (text) msg.message.conversation = text
  if (imageMessage) msg.message.imageMessage = imageMessage
  return msg
}

const handler = createMessageHandler(commands)

// 2a. Pesan tanpa prefix → diabaikan
sent.length = 0
await handler(fakeSock, makeMsg({ text: 'hello' }))
assert.strictEqual(sent.length, 0, 'no-prefix ignored')

// 2b. Command tidak dikenal → diabaikan
sent.length = 0
await handler(fakeSock, makeMsg({ text: '.unknown' }))
assert.strictEqual(sent.length, 0, 'unknown command ignored')

// 2c. .ping di private chat → respon
sent.length = 0
await handler(fakeSock, makeMsg({ text: '.ping' }))
assert.strictEqual(sent.length, 1, 'ping responded')
assert.ok(sent[0].content.text.includes('Pong'), 'ping text correct')

// 2d. .group oleh non-owner → diabaikan (ownerOnly)
sent.length = 0
await handler(fakeSock, makeMsg({ text: '.group list', remoteJid: '628999@s.whatsapp.net' }))
assert.strictEqual(sent.length, 0, 'group by non-owner ignored')

// 2e. fromMe → diabaikan
sent.length = 0
await handler(fakeSock, makeMsg({ text: '.ping', fromMe: true }))
assert.strictEqual(sent.length, 0, 'fromMe ignored')

// 2f. status@broadcast → diabaikan
sent.length = 0
await handler(fakeSock, makeMsg({ text: '.ping', remoteJid: 'status@broadcast' }))
assert.strictEqual(sent.length, 0, 'status broadcast ignored')

// 2g. .ping di grup yang TIDAK di-whitelist → diabaikan
sent.length = 0
await handler(fakeSock, makeMsg({ text: '.ping', remoteJid: '123@g.us', participant: '628999@s.whatsapp.net' }))
assert.strictEqual(sent.length, 0, 'ping in unlisted group ignored')

// 2h. .group di grup yang TIDAK di-whitelist oleh owner → dijalankan (allowUnlistedGroup + ownerOnly)
// OWNER_NUMBER dari .env = 6283873411772
sent.length = 0
await handler(fakeSock, makeMsg({
  text: '.group list',
  remoteJid: '123@g.us',
  participant: '6283873411772:12@s.whatsapp.net',
}))
assert.ok(sent.length > 0, 'group cmd by owner with multi-device JID executed')

console.log('✅ Authorization: semua skenario akses benar')

// 2i. .menu alias .help
sent.length = 0
await handler(fakeSock, makeMsg({ text: '.help' }))
assert.strictEqual(sent.length, 1, 'help alias responded')
assert.ok(sent[0].content.text.includes('Daftar perintah'), 'menu text correct')

console.log('✅ Alias: .help → menu benar')

// 2j. Media extractor test (direct & quoted image)
import { getImageData } from '../src/utils/media.js'

const directImgMsg = makeMsg({ imageMessage: { url: 'https://example.com/img.jpg' } })
const directData = getImageData(directImgMsg)
assert.ok(directData?.imageMessage, 'direct image detected')

const quotedImgMsg = {
  key: { remoteJid: '628123@s.whatsapp.net' },
  message: {
    extendedTextMessage: {
      text: '.s',
      contextInfo: {
        stanzaId: 'ABC',
        participant: '628999@s.whatsapp.net',
        quotedMessage: { imageMessage: { url: 'https://example.com/quoted.jpg' } },
      },
    },
  },
}
const quotedData = getImageData(quotedImgMsg)
assert.ok(quotedData?.imageMessage, 'quoted image detected')
assert.strictEqual(quotedData.downloadMsg.key.id, 'ABC', 'quoted stanzaId preserved')

console.log('✅ Media Utility: penanganan foto langsung & reply teruji')

// ── 3. Sumber media untuk stiker bersuara (.sa) ─────────────
import { getSoundSources } from '../src/utils/media.js'

const videoMsg = {
  key: { remoteJid: '628123@s.whatsapp.net' },
  message: { videoMessage: { url: 'https://example.com/v.mp4', seconds: 5 } },
}
const videoSources = getSoundSources(videoMsg)
assert.strictEqual(videoSources.visual.kind, 'video', 'visual video terdeteksi')
assert.strictEqual(videoSources.audio.kind, 'video', 'audio dari video terdeteksi')
assert.strictEqual(videoSources.visual, videoSources.audio, 'visual & audio satu sumber')

const imageWithQuotedAudio = {
  key: { remoteJid: '628123@s.whatsapp.net' },
  message: {
    imageMessage: {
      caption: '.sa',
      contextInfo: {
        stanzaId: 'AUD1',
        participant: '628999@s.whatsapp.net',
        quotedMessage: {
          audioMessage: { url: 'https://example.com/a.ogg', mimetype: 'audio/ogg; codecs=opus' },
        },
      },
    },
  },
}
const mixedSources = getSoundSources(imageWithQuotedAudio)
assert.strictEqual(mixedSources.visual.kind, 'image', 'visual foto dari pesan sekarang')
assert.strictEqual(mixedSources.audio.kind, 'audio', 'audio dari voice note yang di-reply')
assert.strictEqual(mixedSources.audio.downloadMsg.key.id, 'AUD1', 'stanzaId audio dipertahankan')

const textReplyToVideo = {
  key: { remoteJid: '628123@s.whatsapp.net' },
  message: {
    extendedTextMessage: {
      text: '.sa',
      contextInfo: {
        stanzaId: 'VID1',
        participant: '628999@s.whatsapp.net',
        quotedMessage: { videoMessage: { url: 'https://example.com/q.mp4' } },
      },
    },
  },
}
const replySources = getSoundSources(textReplyToVideo)
assert.strictEqual(replySources.visual.kind, 'video', 'visual video dari reply')
assert.strictEqual(replySources.audio, replySources.visual, 'audio memakai video yang sama')

const textReplyToImage = {
  key: { remoteJid: '628123@s.whatsapp.net' },
  message: {
    extendedTextMessage: {
      text: '.sa',
      contextInfo: {
        stanzaId: 'IMG1',
        participant: '628999@s.whatsapp.net',
        quotedMessage: { imageMessage: { url: 'https://example.com/q.jpg' } },
      },
    },
  },
}
assert.strictEqual(getSoundSources(textReplyToImage).audio, null, 'foto tanpa audio ditolak')

console.log('✅ .sa: deteksi sumber visual + audio teruji')

// ── 4. Metadata stiker .sa teruji ──────────────────────────
import waStickerFormatter from 'wa-sticker-formatter'
import sharp from 'sharp'

const { Exif, extractMetadata } = waStickerFormatter

const dummyWebp = await sharp({
  create: { width: 32, height: 32, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
}).webp().toBuffer()

const testExif = new Exif({ pack: 'bot', author: 'napoleon', categories: ['🔊'] })
const testWithExif = await testExif.add(dummyWebp)
const extracted = await extractMetadata(testWithExif)
assert.strictEqual(extracted['sticker-pack-name'], 'bot')
assert.strictEqual(extracted['sticker-pack-publisher'], 'napoleon')
console.log('✅ .sa: metadata pack dan publisher (author) teruji')

console.log('\n🎉 Semua test lulus.')
