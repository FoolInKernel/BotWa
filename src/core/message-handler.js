import { OWNER_NUMBER, PREFIX } from '../config.js'
import { isAllowedGroup } from '../groups.js'

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

export function createMessageHandler(commands) {
  return async function handleMessage(sock, msg) {
    if (!msg.message || msg.key.fromMe) return

    const jid = msg.key.remoteJid
    if (!jid || jid === 'status@broadcast') return

    const isGroup = jid.endsWith('@g.us')

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      ''

    const input = text.trim()
    if (!input.startsWith(PREFIX)) return

    const [command, ...args] = input
      .slice(PREFIX.length)
      .trim()
      .toLowerCase()
      .split(/\s+/)

    const cmd = commands.get(command)
    if (!cmd) return

    const isOwner = isOwnerMessage(msg)

    if (cmd.ownerOnly && !isOwner) return

    if (isGroup && !cmd.allowUnlistedGroup && !(await isAllowedGroup(jid))) {
      return
    }

    await cmd.execute({ sock, msg, jid, command, args, isGroup, isOwner })
  }
}
