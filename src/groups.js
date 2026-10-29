import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const GROUPS_FILE = path.resolve(
  process.env.GROUPS_FILE || './data/allowed-groups.json',
)

async function readGroups() {
  try {
    const data = await readFile(GROUPS_FILE, 'utf8')
    const groups = JSON.parse(data)

    if (
      !Array.isArray(groups) ||
      !groups.every(
        (group) => typeof group === 'string' && group.endsWith('@g.us'),
      )
    ) {
      throw new Error('Format whitelist grup tidak valid.')
    }

    return [...new Set(groups)]
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

async function saveGroups(groups) {
  await mkdir(path.dirname(GROUPS_FILE), { recursive: true })
  await writeFile(
    GROUPS_FILE,
    JSON.stringify([...new Set(groups)], null, 2) + '\n',
    'utf8',
  )
}

export async function isAllowedGroup(jid) {
  if (!jid?.endsWith('@g.us')) return false

  const groups = await readGroups()
  return groups.includes(jid)
}

export async function manageGroups(sock, msg, command, args, isOwner) {
  if (command !== 'group' || !isOwner) return false

  const jid = msg.key.remoteJid
  const isGroup = jid?.endsWith('@g.us')
  const action = args[0]?.toLowerCase()

  if (!jid) return true

  if (action === 'add' || action === 'remove') {
    if (!isGroup) {
      await sock.sendMessage(jid, {
        text: `Gunakan .group ${action} langsung di grup yang ingin ${action === 'add' ? 'ditambahkan' : 'dihapus'}.`,
      })
      return true
    }

    const groups = await readGroups()

    if (action === 'add') {
      if (groups.includes(jid)) {
        await sock.sendMessage(jid, {
          text: 'Grup ini sudah ada di whitelist.',
        })
        return true
      }

      groups.push(jid)
      await saveGroups(groups)

      await sock.sendMessage(jid, {
        text: '✅ Grup berhasil ditambahkan ke whitelist.',
      })
      return true
    }

    if (!groups.includes(jid)) {
      await sock.sendMessage(jid, {
        text: 'Grup ini tidak ada di whitelist.',
      })
      return true
    }

    await saveGroups(groups.filter((group) => group !== jid))

    await sock.sendMessage(jid, {
      text: '✅ Grup berhasil dihapus dari whitelist.',
    })
    return true
  }

  if (action === 'list') {
    const groups = await readGroups()

    const destination = isGroup
      ? msg.key.participantAlt || msg.key.participant
      : jid

    if (!destination || !destination.endsWith('@s.whatsapp.net')) {
      await sock.sendMessage(jid, {
        text: 'Tidak dapat memastikan chat pribadi owner. Coba .group list melalui chat pribadi bot.',
      })
      return true
    }

    await sock.sendMessage(destination, {
      text: groups.length
        ? `📋 Whitelist grup:\n${groups.map((group, i) => `${i + 1}. ${group}`).join('\n')}`
        : 'Whitelist grup masih kosong.',
    })

    if (isGroup) {
      await sock.sendMessage(jid, {
        text: 'Daftar whitelist dikirim ke chat pribadi owner jika identitasnya tersedia.',
      })
    }

    return true
  }

  await sock.sendMessage(jid, {
    text: [
      '📋 Perintah pengelolaan grup:',
      '• .group add — Izinkan grup ini',
      '• .group remove — Hapus izin grup ini',
      '• .group list — Lihat whitelist',
    ].join('\n'),
  })

  return true
}
