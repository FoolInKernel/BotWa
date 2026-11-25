import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
} from '@whiskeysockets/baileys'

/**
 * Dukungan "sound sticker" (stiker bersuara) untuk Baileys 7.0.0-rc14.
 *
 * Proto Baileys versi ini belum punya field `StickerMessage.audioMessage`
 * (26) maupun wrapper `Message.audioStickerMessage` (134). WhatsApp beta
 * membaca stiker bersuara dari wrapper FutureProofMessage field 134 yang
 * isinya `Message { stickerMessage { ... audioMessage } }`.
 *
 * Modul ini menambal `proto.Message.encode` secara global, tetapi hanya
 * aktif untuk pesan yang punya `stickerMessage.audioMessage`, sehingga
 * pesan lain tetap memakai encoder asli.
 */

const AUDIO_FIELD_TAG = (26 << 3) | 2
const CONTEXT_INFO_FIELD_TAG = (17 << 3) | 2
const AUDIO_STICKER_FIELD_TAG = (134 << 3) | 2
const MESSAGE_CONTEXT_INFO_FIELD_TAG = (35 << 3) | 2
const FUTURE_PROOF_MESSAGE_FIELD_TAG = (1 << 3) | 2

let patched = false
let WriterClass

function rawAppend(writer, bytes) {
  writer._push(
    (value, buffer, position) => buffer.set(value, position),
    bytes.length,
    bytes,
  )
}

// Meniru "paired context" yang dipakai klien WhatsApp: hash media
// ditempel ke contextInfo agar server bisa memasangkan stiker + audio.
function buildPairedContext(fileSha256) {
  const sha = fileSha256 || new Uint8Array(0)
  const inner = new WriterClass()
  inner.uint32((1 << 3) | 0).uint32(1)
  inner.uint32((2 << 3) | 2).bytes(sha)

  const context = new WriterClass()
  context.uint32((74 << 3) | 2).bytes(inner.finish())
  return context.finish()
}

function encodeSoundStickerMessage(message) {
  const sticker = proto.Message.StickerMessage.fromObject(message.stickerMessage)
  const audio = proto.Message.AudioMessage.fromObject(
    message.stickerMessage.audioMessage,
  )

  const stickerWriter = new WriterClass()
  proto.Message.StickerMessage.encode(sticker, stickerWriter)
  stickerWriter
    .uint32(CONTEXT_INFO_FIELD_TAG)
    .bytes(buildPairedContext(sticker.fileSha256))

  const audioWriter = new WriterClass()
  proto.Message.AudioMessage.encode(audio, audioWriter)
  audioWriter
    .uint32(CONTEXT_INFO_FIELD_TAG)
    .bytes(buildPairedContext(audio.fileSha256))

  stickerWriter.uint32(AUDIO_FIELD_TAG).bytes(audioWriter.finish())

  // Message { stickerMessage }
  const innerMessage = new WriterClass()
  innerMessage.uint32((26 << 3) | 2).bytes(stickerWriter.finish())

  // FutureProofMessage { message }
  const wrapper = new WriterClass()
  wrapper.uint32(FUTURE_PROOF_MESSAGE_FIELD_TAG).bytes(innerMessage.finish())

  // Message { audioStickerMessage, messageContextInfo? }
  const output = new WriterClass()
  output.uint32(AUDIO_STICKER_FIELD_TAG).bytes(wrapper.finish())

  if (message.messageContextInfo) {
    output
      .uint32(MESSAGE_CONTEXT_INFO_FIELD_TAG)
      .bytes(proto.MessageContextInfo.encode(message.messageContextInfo).finish())
  }

  return output.finish()
}

function ensurePatched() {
  if (patched) return
  patched = true

  // Ambil class Writer dari encoder asli sebelum ditambal.
  WriterClass = proto.Message.encode(proto.Message.create()).constructor

  const originalEncode = proto.Message.encode

  proto.Message.encode = function encode(message, writer) {
    if (!message?.stickerMessage?.audioMessage) {
      return originalEncode.call(this, message, writer)
    }

    const bytes = encodeSoundStickerMessage(message)

    if (writer) {
      rawAppend(writer, bytes)
      return writer
    }

    const result = new WriterClass()
    rawAppend(result, bytes)
    return result
  }

  console.log(
    'Sound sticker: protobuf patch aktif (fitur eksperimental WhatsApp beta).',
  )
}

export function buildSoundStickerBytes(message) {
  ensurePatched()
  return encodeSoundStickerMessage(message)
}

export async function sendSoundSticker(
  sock,
  jid,
  {
    stickerBuffer,
    audioBuffer,
    audioMimetype = 'audio/ogg; codecs=opus',
    audioSeconds,
    isAnimated = false,
  },
) {
  ensurePatched()

  const uploadOptions = { upload: sock.waUploadToServer }

  const stickerMedia = await prepareWAMessageMedia(
    { sticker: stickerBuffer, isAnimated },
    uploadOptions,
  )

  const audioMedia = await prepareWAMessageMedia(
    {
      audio: audioBuffer,
      mimetype: audioMimetype,
      ptt: false,
      ...(Number.isFinite(audioSeconds) ? { seconds: audioSeconds } : {}),
    },
    uploadOptions,
  )

  const stickerMessage = stickerMedia.stickerMessage
  stickerMessage.width = 512
  stickerMessage.height = 512
  stickerMessage.isAnimated = isAnimated
  stickerMessage.stickerSentTs = Date.now()
  stickerMessage.isAvatar = false
  stickerMessage.isAiSticker = false
  stickerMessage.isLottie = false
  stickerMessage.accessibilityLabel = '🔊'

  const audioMessage = audioMedia.audioMessage
  audioMessage.mimetype = audioMimetype
  audioMessage.ptt = false
  if (Number.isFinite(audioSeconds)) {
    audioMessage.seconds = Math.max(1, Math.round(audioSeconds))
  }

  const waMessage = generateWAMessageFromContent(
    jid,
    { stickerMessage },
    { userJid: sock.user?.id },
  )

  // Tempel audio SETELAH generateWAMessageFromContent, karena proses itu
  // membuat ulang objek proto dan akan membuang field yang tidak dikenal.
  waMessage.message.stickerMessage.audioMessage = audioMessage

  await sock.relayMessage(jid, waMessage.message, {
    messageId: waMessage.key.id,
  })

  return waMessage
}
