import { readFile, writeFile } from 'node:fs/promises'
import { upscaleImageWithAI } from '../src/utils/ai.js'

const buffer = await readFile(process.argv[2])
console.log('Sending image to 9Router AI HD...')
const out = await upscaleImageWithAI(buffer)
await writeFile(process.argv[3], out)
console.log('✅ AI HD Sukses! Output tersimpan di:', process.argv[3], `(${out.length} bytes)`)
