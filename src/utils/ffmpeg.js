import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const FFMPEG_TIMEOUT_MS = 60_000
const MAX_STICKER_BYTES = 480 * 1024
const WEBP_QUALITY_LADDER = [55, 45, 35, 25, 18]

let ffmpegAvailable
let encoderList
let webpEncoder
let opusEncoder

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`${command} timeout setelah ${FFMPEG_TIMEOUT_MS / 1000} detik`))
    }, FFMPEG_TIMEOUT_MS)

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        reject(
          new Error(
            `${command} gagal (kode ${code}): ${stderr.slice(-400).trim()}`,
          ),
        )
      }
    })
  })
}

async function listEncoders() {
  if (encoderList) return encoderList
  const { stdout } = await run('ffmpeg', ['-hide_banner', '-encoders'])
  encoderList = stdout
  return encoderList
}

export async function isFfmpegAvailable() {
  if (ffmpegAvailable !== undefined) return ffmpegAvailable

  try {
    await run('ffmpeg', ['-version'])
    ffmpegAvailable = true
  } catch {
    ffmpegAvailable = false
  }

  return ffmpegAvailable
}

async function pickWebpEncoder() {
  if (webpEncoder) return webpEncoder
  const encoders = await listEncoders()
  webpEncoder = /libwebp_anim/.test(encoders)
    ? 'libwebp_anim'
    : /libwebp/.test(encoders)
      ? 'libwebp'
      : null
  return webpEncoder
}

async function pickOpusEncoder() {
  if (opusEncoder) return opusEncoder
  const encoders = await listEncoders()
  opusEncoder = /libopus/.test(encoders)
    ? 'libopus'
    : /\bopus\b/.test(encoders)
      ? 'opus'
      : null
  return opusEncoder
}

async function withTempDir(task) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'wa-sa-'))
  try {
    return await task(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

/**
 * Video → WebP animasi 512x512 (maks ±480 KB).
 * Kualitas diturunkan bertahap bila hasil melebihi batas WhatsApp.
 */
export async function videoToAnimatedSticker(
  input,
  { maxSeconds = 6, fps = 12 } = {},
) {
  const encoder = await pickWebpEncoder()
  if (!encoder) {
    throw new Error('Encoder WebP tidak tersedia di ffmpeg server.')
  }

  return withTempDir(async (dir) => {
    const inputPath = path.join(dir, 'input')
    const outputPath = path.join(dir, 'sticker.webp')
    await writeFile(inputPath, input)

    const filter = [
      'setpts=PTS-STARTPTS',
      'scale=512:512:force_original_aspect_ratio=increase',
      'crop=512:512',
      `fps=${fps}`,
    ].join(',')

    let lastBuffer = null

    for (const quality of WEBP_QUALITY_LADDER) {
      await run('ffmpeg', [
        '-y',
        '-i',
        inputPath,
        '-t',
        String(maxSeconds),
        '-vcodec',
        encoder,
        '-vf',
        filter,
        '-q:v',
        String(quality),
        '-compression_level',
        '6',
        '-loop',
        '0',
        '-preset',
        'default',
        '-an',
        outputPath,
      ])

      lastBuffer = await readFile(outputPath)
      if (lastBuffer.length <= MAX_STICKER_BYTES) return lastBuffer
    }

    return lastBuffer
  })
}

/**
 * Ambil audio dari video/audio apa pun lalu encode ke Ogg Opus
 * (format yang dipakai WhatsApp untuk pesan suara).
 */
export async function toOpusOgg(input, { maxSeconds = 6 } = {}) {
  const encoder = await pickOpusEncoder()
  if (!encoder) {
    throw new Error('Encoder Opus tidak tersedia di ffmpeg server.')
  }

  return withTempDir(async (dir) => {
    const inputPath = path.join(dir, 'input')
    const outputPath = path.join(dir, 'audio.ogg')
    await writeFile(inputPath, input)

    await run('ffmpeg', [
      '-y',
      '-i',
      inputPath,
      '-t',
      String(maxSeconds),
      '-vn',
      '-af',
      'asetpts=PTS-STARTPTS',
      '-c:a',
      encoder,
      '-ac',
      '1',
      '-ar',
      '48000',
      '-b:a',
      '32k',
      '-f',
      'ogg',
      outputPath,
    ])

    return readFile(outputPath)
  })
}

export async function probeDuration(input) {
  return withTempDir(async (dir) => {
    const inputPath = path.join(dir, 'input')
    await writeFile(inputPath, input)
    const { stdout } = await run('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      inputPath,
    ])
    const seconds = Number.parseFloat(stdout.trim())
    return Number.isFinite(seconds) ? seconds : null
  })
}
