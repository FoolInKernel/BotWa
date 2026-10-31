import { readGroups, saveGroups } from '../groups.js'

export default {
  name: 'group',
  aliases: [],
  ownerOnly: true,
  allowUnlistedGroup: true,

  async execute({ sock, msg, jid, args, isGroup }) {
    const action = args[0]?.toLowerCase()

    if (!jid) return

    if (action === 'add' || action === 'remove') {
      if (!isGroup) {
        await sock.sendMessage(jid, {
          text: `Gunakan .group ${action} langsung di grup yang ingin ${action === 'add' ? 'ditambahkan' : 'dihapus'}.`,
        })
        return
      }

      const groups = await readGroups()

      if (action === 'add') {
        if (groups.includes(jid)) {
          await sock.sendMessage(jid, {
            text: 'Grup ini sudah ada di whitelist.',
          })
          return
        }

        groups.push(jid)
        await saveGroups(groups)

        await sock.sendMessage(jid, {
          text: '✅ Grup berhasil ditambahkan ke whitelist.',
        })
        return
      }

      if (!groups.includes(jid)) {
        await sock.sendMessage(jid, {
          text: 'Grup ini tidak ada di whitelist.',
        })
        return
      }

      await saveGroups(groups.filter((group) => group !== jid))

      await sock.sendMessage(jid, {
        text: '✅ Grup berhasil dihapus dari whitelist.',
      })
      return
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
        return
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

      return
    }

    await sock.sendMessage(jid, {
      text: [
        '📋 Perintah pengelolaan grup:',
        '• .group add — Izinkan grup ini',
        '• .group remove — Hapus izin grup ini',
        '• .group list — Lihat whitelist',
      ].join('\n'),
    })
  },
}
