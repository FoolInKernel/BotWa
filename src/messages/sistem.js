import os from 'node:os'
import fs from 'node:fs'

function formatBytes(bytes) {
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / (1024 ** 2)).toFixed(1)} MB`
  return `${(bytes / (1024 ** 3)).toFixed(2)} GB`
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts = []
  if (d) parts.push(`${d} hari`)
  if (h) parts.push(`${h} jam`)
  parts.push(`${m} menit`)
  return parts.join(' ')
}

function getCpuTimes() {
  const cpus = os.cpus()
  let idle = 0
  let total = 0
  for (const cpu of cpus) {
    const t = cpu.times
    idle += t.idle
    total += t.user + t.nice + t.sys + t.irq + t.idle
  }
  return { idle, total }
}

function getCpuUsage() {
  return new Promise((resolve) => {
    const start = getCpuTimes()
    setTimeout(() => {
      const end = getCpuTimes()
      const idleDiff = end.idle - start.idle
      const totalDiff = end.total - start.total
      const pct = totalDiff ? ((1 - idleDiff / totalDiff) * 100).toFixed(1) : '0.0'
      resolve(`${pct}%`)
    }, 500)
  })
}

function getMemoryInfo() {
  const total = os.totalmem()
  const free = os.freemem()
  const used = total - free
  const pct = ((used / total) * 100).toFixed(1)
  return `${formatBytes(used)} / ${formatBytes(total)} (${pct}%)\nTersedia: ${formatBytes(free)}`
}

function getDiskInfo() {
  const stat = fs.statfsSync(process.cwd())
  const total = stat.blocks * stat.bsize
  const free = stat.bavail * stat.bsize
  const used = total - free
  const pct = ((used / total) * 100).toFixed(1)
  return `${formatBytes(used)} / ${formatBytes(total)} (${pct}%)\nTersedia: ${formatBytes(free)}`
}

function getCpuInfo() {
  const cpus = os.cpus()
  const model = cpus[0]?.model?.trim() || 'Tidak diketahui'
  return `${model}\nCore: ${cpus.length}`
}

export default {
  name: 'sistem',
  aliases: [],
  ownerOnly: true,
  allowUnlistedGroup: true,

  async execute({ sock, jid }) {
    const sections = []

    try {
      sections.push(`⏱ *Uptime*\n${formatUptime(os.uptime())}`)
    } catch {
      sections.push('⏱ *Uptime*\nN/A')
    }

    try {
      sections.push(`🖥 *Device*\n${os.hostname()}`)
    } catch {
      sections.push('🖥 *Device*\nN/A')
    }

    try {
      sections.push(`🧠 *CPU*\n${getCpuInfo()}`)
    } catch {
      sections.push('🧠 *CPU*\nN/A')
    }

    try {
      const usage = await getCpuUsage()
      sections.push(`📊 *CPU Usage*\n${usage}`)
    } catch {
      sections.push('📊 *CPU Usage*\nN/A')
    }

    try {
      sections.push(`💾 *Memory*\n${getMemoryInfo()}`)
    } catch {
      sections.push('💾 *Memory*\nN/A')
    }

    try {
      sections.push(`📁 *Disk*\n${getDiskInfo()}`)
    } catch {
      sections.push('📁 *Disk*\nN/A')
    }

    await sock.sendMessage(jid, {
      text: `📟 *Informasi Sistem*\n\n${sections.join('\n\n')}`,
    })
  },
}
