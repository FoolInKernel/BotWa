export function getQuotedData(msg) {
  const contextInfo =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo

  const quotedMessage = contextInfo?.quotedMessage
  if (!contextInfo || !quotedMessage) return null

  return {
    contextInfo,
    quotedMessage,
    downloadMsg: {
      key: {
        remoteJid: msg.key.remoteJid,
        id: contextInfo.stanzaId,
        participant: contextInfo.participant,
      },
      message: quotedMessage,
    },
  }
}

export function detectMedia(message) {
  if (!message) return null

  if (message.imageMessage) {
    return { kind: 'image', media: message.imageMessage }
  }
  if (message.videoMessage) {
    return { kind: 'video', media: message.videoMessage }
  }
  if (message.audioMessage) {
    return { kind: 'audio', media: message.audioMessage }
  }
  if (message.stickerMessage) {
    return { kind: 'sticker', media: message.stickerMessage }
  }
  if (
    message.documentMessage &&
    /^audio\//i.test(message.documentMessage.mimetype || '')
  ) {
    return { kind: 'audio', media: message.documentMessage, isDocument: true }
  }

  return null
}

export function getImageData(msg) {
  if (msg.message?.imageMessage) {
    return {
      imageMessage: msg.message.imageMessage,
      downloadMsg: msg,
    }
  }

  const quoted = getQuotedData(msg)
  if (quoted?.quotedMessage?.imageMessage) {
    return {
      imageMessage: quoted.quotedMessage.imageMessage,
      downloadMsg: quoted.downloadMsg,
    }
  }

  return null
}

/**
 * Tentukan sumber visual + audio untuk fitur stiker bersuara.
 * - Visual: gambar/video dari pesan sekarang, fallback ke pesan yang di-reply.
 * - Audio: voice note/audio/video dari pesan yang di-reply (prioritas), fallback
 *   ke video pada pesan sekarang.
 */
export function getSoundSources(msg) {
  const current = detectMedia(msg.message)
  const currentSource = current ? { ...current, downloadMsg: msg } : null

  const quoted = getQuotedData(msg)
  const quotedMedia = quoted ? detectMedia(quoted.quotedMessage) : null
  const quotedSource = quotedMedia
    ? { ...quotedMedia, downloadMsg: quoted.downloadMsg }
    : null

  const visual =
    [currentSource, quotedSource].find(
      (source) => source && (source.kind === 'image' || source.kind === 'video'),
    ) ?? null

  const audio =
    [quotedSource, currentSource].find(
      (source) =>
        source && (source.kind === 'audio' || source.kind === 'video'),
    ) ?? null

  return { visual, audio }
}
