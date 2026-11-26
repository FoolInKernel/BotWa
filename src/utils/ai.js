import { AI_API_URL, AI_API_KEY, AI_MODEL, AI_CHAT_MODEL } from '../config.js'

const AI_TIMEOUT_MS = 60_000

export function isAiEnabled() {
  return Boolean(AI_API_KEY && AI_API_URL)
}

/**
 * Chat completion via 9Router combo models (e.g. coding / son)
 * Supports multimodal input (text + optional image buffer)
 */
export async function chatWithAI(
  prompt,
  imageBuffer = null,
  systemPrompt = 'Jawab dalam bahasa Indonesia, ramah, ringkas, dan jelas.',
) {
  const userContent = []

  if (prompt) {
    userContent.push({ type: 'text', text: prompt })
  } else if (imageBuffer) {
    userContent.push({
      type: 'text',
      text: 'Jelaskan atau deskripsikan gambar ini.',
    })
  }

  if (imageBuffer) {
    const dataUrl = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
    userContent.push({
      type: 'image_url',
      image_url: { url: dataUrl },
    })
  }

  const response = await fetch(`${AI_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_CHAT_MODEL,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`9Router error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const reply = data?.choices?.[0]?.message?.content?.trim()

  if (!reply) {
    throw new Error('Jawaban dari AI kosong')
  }

  return reply
}

/**
 * Upscale/enhance image via Real-ESRGAN (Gradio API fallback)
 */
async function upscaleWithRealEsrgan(buffer) {
  const form = new FormData()
  form.append('files', new Blob([buffer], { type: 'image/jpeg' }), 'image.jpg')

  const uploadRes = await fetch('https://anthienlong-face-real-esrgan.hf.space/gradio_api/upload', {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  })
  if (!uploadRes.ok) throw new Error('Upload ke AI upscaler gagal')
  const uploadData = await uploadRes.json()

  const sessionHash = Math.random().toString(36).substring(2)
  const joinRes = await fetch('https://anthienlong-face-real-esrgan.hf.space/gradio_api/queue/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [{ path: uploadData[0] }, '2x'],
      fn_index: 0,
      session_hash: sessionHash,
    }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  })
  if (!joinRes.ok) throw new Error('Queue AI upscaler gagal')

  const sseRes = await fetch(`https://anthienlong-face-real-esrgan.hf.space/gradio_api/queue/data?session_hash=${sessionHash}`, {
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  })
  const reader = sseRes.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    const text = decoder.decode(value)
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        const json = JSON.parse(line.slice(6))
        if (json.msg === 'process_completed') {
          if (json.output?.error) throw new Error(json.output.error)
          const fileUrl = json.output?.data?.[0]?.url
          if (!fileUrl) throw new Error('Output gambar AI tidak ditemukan')
          const dlRes = await fetch(fileUrl, { signal: AbortSignal.timeout(AI_TIMEOUT_MS) })
          return Buffer.from(await dlRes.arrayBuffer())
        }
      }
    }
  }
  throw new Error('Proses AI upscaler timeout')
}

/**
 * Upscale/enhance image via 9Router /v1/images/generations with Real-ESRGAN fallback
 */
export async function upscaleImageWithAI(buffer) {
  if (isAiEnabled()) {
    try {
      const dataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`

      const response = await fetch(
        `${AI_API_URL}/v1/images/generations?response_format=binary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AI_API_KEY}`,
          },
          body: JSON.stringify({
            model: AI_MODEL,
            prompt:
              'High resolution remaster, ultra detailed, sharp focus, enhanced clarity, 4k photo',
            image: dataUrl,
          }),
          signal: AbortSignal.timeout(AI_TIMEOUT_MS),
        },
      )

      if (response.ok) {
        const contentType = response.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          const json = await response.json()
          const b64 = json?.data?.[0]?.b64_json
          if (b64) {
            return Buffer.from(b64, 'base64')
          }
          const imgUrl = json?.data?.[0]?.url
          if (imgUrl) {
            const dl = await fetch(imgUrl)
            return Buffer.from(await dl.arrayBuffer())
          }
          throw new Error('9Router tidak mengembalikan gambar valid')
        }

        const arrayBuffer = await response.arrayBuffer()
        const resultBuffer = Buffer.from(arrayBuffer)
        if (resultBuffer && resultBuffer.length && !resultBuffer.toString('utf8', 0, 1).startsWith('{')) {
          return resultBuffer
        }
      }
      console.warn('9Router upscale respon tidak ok, beralih ke fallback...')
    } catch (err) {
      console.warn('9Router upscale error, beralih ke fallback:', err?.message || err)
    }
  }

  return await upscaleWithRealEsrgan(buffer)
}
