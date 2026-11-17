import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { isAiEnabled, chatWithAI } from '../utils/ai.js'
import { getImageData } from '../utils/media.js'

export default {
  name: 'ai',
  aliases: ['ask', 'tanya'],

  async execute({ sock, msg, jid, args }) {
    if (!isAiEnabled()) {
      await sock.sendMessage(
        jid,
        { text: 'Fitur AI belum dikonfigurasi pada server bot.' },
        { quoted: msg },
      )
      return
    }

    const question = args.join(' ').trim()
    const imageData = getImageData(msg)

    if (!question && !imageData) {
      await sock.sendMessage(
        jid,
        {
          text: 'Ketik pertanyaan atau sertakan foto. Contoh:\n• .ai apa itu docker\n• Kirim/reply foto dengan .ai foto apa ini?',
        },
        { quoted: msg },
      )
      return
    }

    let imageBuffer = null
    if (imageData) {
      try {
        imageBuffer = await downloadMediaMessage(imageData.downloadMsg, 'buffer', {})
      } catch (e) {
        console.error('Gagal download gambar untuk AI:', e?.message || e)
      }
    }

    try {
      const waitMsg = await sock.sendMessage(
        jid,
        { text: '⏳ Sedang menganalisis...' },
        { quoted: msg },
      )

      const reply = await chatWithAI(question, imageBuffer)

      if (waitMsg?.key) {
        await sock.sendMessage(jid, {
          text: reply,
          edit: waitMsg.key,
        })
      } else {
        await sock.sendMessage(
          jid,
          { text: reply },
          { quoted: msg },
        )
      }
    } catch (error) {
      console.error('Gagal memproses AI Chat/Vision:', error?.message || error)
      await sock.sendMessage(
        jid,
        { text: `Gagal mendapatkan respon AI: ${error?.message || 'Error tidak diketahui'}` },
        { quoted: msg },
      )
    }
  },
}
