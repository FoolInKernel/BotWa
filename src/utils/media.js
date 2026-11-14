export function getImageData(msg) {
  if (msg.message?.imageMessage) {
    return {
      imageMessage: msg.message.imageMessage,
      downloadMsg: msg,
    }
  }

  const contextInfo =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo

  const quoted = contextInfo?.quotedMessage
  if (quoted?.imageMessage) {
    return {
      imageMessage: quoted.imageMessage,
      downloadMsg: {
        key: {
          remoteJid: msg.key.remoteJid,
          id: contextInfo.stanzaId,
          participant: contextInfo.participant,
        },
        message: quoted,
      },
    }
  }

  return null
}
