export default {
  name: 'ping',
  aliases: [],

  async execute({ sock, jid }) {
    await sock.sendMessage(jid, {
      text: 'Pong! Bot aktif. ✅',
    })
  },
}
