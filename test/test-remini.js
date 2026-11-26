import assert from 'node:assert/strict'
import sharp from 'sharp'
import reminiCmd from '../src/messages/rehd.js'

console.log('Testing Remini command execution...')

// 1. Validasi kontrak command
assert.strictEqual(reminiCmd.name, 'remini')
assert.ok(reminiCmd.aliases.includes('upscale'))
assert.ok(reminiCmd.aliases.includes('rehd'))
assert.ok(reminiCmd.aliases.includes('hdr'))

// 2. Test ketika pesan tidak ada foto
const sentMessages = []
const fakeSock = {
  sendMessage: async (jid, content, opts) => {
    sentMessages.push({ jid, content, opts })
  },
}

await reminiCmd.execute({
  sock: fakeSock,
  msg: { key: { remoteJid: 'user@s.whatsapp.net' }, message: {} },
  jid: 'user@s.whatsapp.net',
})

assert.strictEqual(sentMessages.length, 1)
assert.ok(sentMessages[0].content.text.includes('Kirim atau reply foto dengan .remini'))
console.log('✅ Remini: validasi input tanpa foto berhasil')

// 3. Test upscale buffer gambar nyata
const dummyJpg = await sharp({
  create: {
    width: 64,
    height: 64,
    channels: 3,
    background: { r: 120, g: 180, b: 240 },
  },
}).jpeg().toBuffer()

const fakeMsgWithImage = {
  key: { remoteJid: 'user@s.whatsapp.net', id: 'msg123' },
  message: {
    imageMessage: {
      mimetype: 'image/jpeg',
      fileLength: dummyJpg.length,
    },
  },
}

// Mock downloadMediaMessage Baileys untuk test isolasi
globalThis.__MOCK_DOWNLOAD__ = dummyJpg

// Test fungsi upscaleImageWithAI langsung
import { upscaleImageWithAI } from '../src/utils/ai.js'

console.log('Testing upscaleImageWithAI...')
const resultBuffer = await upscaleImageWithAI(dummyJpg)
assert.ok(Buffer.isBuffer(resultBuffer), 'Output harus berupa Buffer')
assert.ok(resultBuffer.length > 0, 'Buffer output tidak boleh kosong')

const meta = await sharp(resultBuffer).metadata()
console.log(`✅ Upscale berhasil: resolusi ${meta.width}x${meta.height}, format ${meta.format}, size ${resultBuffer.length} bytes`)

console.log('🎉 Semua test Remini AI lulus!')
