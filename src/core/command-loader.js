import { readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MESSAGES_DIR = path.join(__dirname, '..', 'messages')

export async function loadCommands() {
  const commands = new Map()
  const files = (await readdir(MESSAGES_DIR))
    .filter((f) => f.endsWith('.js'))
    .sort()

  for (const file of files) {
    const filePath = path.join(MESSAGES_DIR, file)
    const mod = await import(filePath)
    const cmd = mod.default

    if (!cmd || typeof cmd.name !== 'string' || !cmd.name) {
      throw new Error(`${file}: missing or invalid "name"`)
    }
    if (!Array.isArray(cmd.aliases)) {
      throw new Error(`${file}: "aliases" must be an array`)
    }
    if (typeof cmd.execute !== 'function') {
      throw new Error(`${file}: "execute" must be a function`)
    }

    const keys = [cmd.name, ...cmd.aliases]
    for (const key of keys) {
      if (commands.has(key)) {
        const existing = commands.get(key)
        throw new Error(
          `${file}: duplicate command key "${key}" (already registered by "${existing.name}")`,
        )
      }
      commands.set(key, cmd)
    }
  }

  return commands
}
