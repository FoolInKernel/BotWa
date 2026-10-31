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
assert.ok(commands.has('group'), 'group registered')

// Alias mengarah ke command yang sama
assert.strictEqual(commands.get('help'), commands.get('menu'))
assert.strictEqual(commands.get('sticker'), commands.get('s'))

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
  participant: '6283873411772@s.whatsapp.net',
}))
assert.ok(sent.length > 0, 'group cmd by owner in unlisted group executed')

console.log('✅ Authorization: semua skenario akses benar')

// 2i. .menu alias .help
sent.length = 0
await handler(fakeSock, makeMsg({ text: '.help' }))
assert.strictEqual(sent.length, 1, 'help alias responded')
assert.ok(sent[0].content.text.includes('Daftar perintah'), 'menu text correct')

console.log('✅ Alias: .help → menu benar')

console.log('\n🎉 Semua test lulus.')
