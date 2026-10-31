import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { GROUPS_FILE } from './config.js'

const resolvedPath = path.resolve(GROUPS_FILE)

export async function readGroups() {
  try {
    const data = await readFile(resolvedPath, 'utf8')
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

export async function saveGroups(groups) {
  await mkdir(path.dirname(resolvedPath), { recursive: true })
  await writeFile(
    resolvedPath,
    JSON.stringify([...new Set(groups)], null, 2) + '\n',
    'utf8',
  )
}

export async function isAllowedGroup(jid) {
  if (!jid?.endsWith('@g.us')) return false

  const groups = await readGroups()
  return groups.includes(jid)
}
