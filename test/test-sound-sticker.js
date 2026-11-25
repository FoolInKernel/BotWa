/**
 * Test wire-format stiker bersuara tanpa koneksi WhatsApp.
 * Jalankan: node test/test-sound-sticker.js
 */
import assert from 'node:assert/strict'
import { proto } from '@whiskeysockets/baileys'
import ReaderModule from 'protobufjs/minimal.js'
import {
  buildSoundStickerBytes,
  sendSoundSticker,
} from '../src/utils/sound-sticker.js'

const Reader = ReaderModule.Reader

function readFields(bytes) {
  const reader = Reader.create(bytes)
  const fields = []

  while (reader.pos < reader.len) {
    const tag = reader.uint32()
    const field = tag >>> 3
    const wire = tag & 7
    let value = null

    if (wire === 0) {
      value = reader.uint32()
    } else if (wire === 2) {
      const length = reader.uint32()
      value = reader.buf.slice(reader.pos, reader.pos + length)
      reader.pos += length
    } else {
      reader.skipType(wire)
    }

    fields.push({ field, wire, value })
  }

  return fields
}

const stickerSha = new Uint8Array([1, 2, 3, 4])
const audioSha = new Uint8Array([5, 6, 7, 8])

const message = proto.Message.create({
  stickerMessage: proto.Message.StickerMessage.create({
    url: 'https://media.example/sticker.webp',
    mimetype: 'image/webp',
    fileSha256: stickerSha,
    fileLength: 1234,
    width: 512,
    height: 512,
    isAnimated: true,
  }),
})

message.stickerMessage.audioMessage = proto.Message.AudioMessage.create({
  url: 'https://media.example/sound.ogg',
  mimetype: 'audio/ogg; codecs=opus',
  fileSha256: audioSha,
  fileLength: 4321,
  seconds: 4,
  ptt: false,
})

const bytes = buildSoundStickerBytes(message)

// Struktur: Message { audioStickerMessage(134) = FutureProofMessage { message(1) = Message { stickerMessage(26) } } }
const outer = readFields(bytes)
const audioStickerField = outer.find((item) => item.field === 134)
assert.ok(audioStickerField, 'field 134 audioStickerMessage ada')

const wrapper = readFields(audioStickerField.value)
const innerMessageField = wrapper.find((item) => item.field === 1)
assert.ok(innerMessageField, 'FutureProofMessage.message ada')

const inner = readFields(innerMessageField.value)
const stickerField = inner.find((item) => item.field === 26)
assert.ok(stickerField, 'Message.stickerMessage ada')

const sticker = readFields(stickerField.value)
const stickerUrl = sticker.find((item) => item.field === 1)
assert.ok(
  Buffer.from(stickerUrl.value).toString().includes('sticker.webp'),
  'URL stiker ikut ter-encode',
)

const embeddedAudioField = sticker.find((item) => item.field === 26)
assert.ok(embeddedAudioField, 'StickerMessage.audioMessage (26) ada')

const audio = readFields(embeddedAudioField.value)
const audioUrl = audio.find((item) => item.field === 1)
const audioSeconds = audio.find((item) => item.field === 5)
assert.ok(
  Buffer.from(audioUrl.value).toString().includes('sound.ogg'),
  'URL audio ikut ter-encode',
)
assert.strictEqual(audioSeconds.value, 4, 'durasi audio ikut ter-encode')

// Pastikan pesan biasa tidak ikut berubah.
const normal = proto.Message.create({ conversation: 'halo' })
const decodedNormal = proto.Message.decode(proto.Message.encode(normal).finish())
assert.strictEqual(decodedNormal.conversation, 'halo', 'pesan biasa tetap normal')

// Pastikan patch juga bekerja saat pesan dibungkus deviceSentMessage
// (dipakai relayMessage untuk sinkronisasi ke perangkat sendiri).
const deviceSent = proto.Message.create({
  deviceSentMessage: proto.Message.DeviceSentMessage.create({
    destinationJid: '628123@s.whatsapp.net',
    message,
  }),
})
const nestedBytes = proto.Message.encode(deviceSent).finish()
assert.ok(
  Buffer.from(nestedBytes).includes(Buffer.from('https://media.example/sound.ogg')),
  'audio tetap ter-encode di dalam deviceSentMessage',
)

// ── Integrasi pengiriman dengan socket tiruan (tanpa jaringan) ──
let captured = null
const fakeSock = {
  user: { id: '628123:1@s.whatsapp.net' },
  waUploadToServer: async (_filePath, { mediaType }) => ({
    mediaUrl: `https://mmg.example/${mediaType}`,
    directPath: `/v/t62/${mediaType}`,
  }),
  relayMessage: async (jid, message, options) => {
    captured = { jid, message, options }
  },
}

await sendSoundSticker(fakeSock, '628123@s.whatsapp.net', {
  stickerBuffer: Buffer.from('sticker-bytes'),
  audioBuffer: Buffer.from('audio-bytes'),
  audioSeconds: 3,
  isAnimated: true,
})

assert.ok(captured, 'relayMessage dipanggil')
assert.strictEqual(captured.jid, '628123@s.whatsapp.net', 'JID tujuan benar')
assert.ok(
  captured.message.stickerMessage?.audioMessage,
  'audioMessage menempel pada stickerMessage',
)

const sentBytes = proto.Message.encode(captured.message).finish()
const sentFields = readFields(sentBytes)
assert.ok(
  sentFields.some((item) => item.field === 134),
  'pesan yang dikirim memakai wrapper audioStickerMessage',
)

console.log('✅ Stiker bersuara: struktur wire format audioStickerMessage benar')
console.log('✅ Encoder pesan biasa tidak terganggu')
console.log('✅ Integrasi sendSoundSticker (socket tiruan) teruji')
console.log('\n🎉 Test stiker bersuara lulus.')
