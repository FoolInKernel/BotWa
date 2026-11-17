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
 * Upscale/enhance image via 9Router /v1/images/generations
 * Docs: 9router-image SKILL (response_format=binary)
 */
export async function upscaleImageWithAI(buffer) {
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

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`9Router error ${response.status}: ${errText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const resultBuffer = Buffer.from(arrayBuffer)

  if (!resultBuffer || !resultBuffer.length) {
    throw new Error('Hasil gambar dari 9Router kosong')
  }

  return resultBuffer
}
