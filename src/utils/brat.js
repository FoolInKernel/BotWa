function wrapText(text, maxCharsPerLine = 16) {
  const words = text.toLowerCase().trim().split(/\s+/)
  const lines = []
  let currentLine = ''

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = currentLine ? currentLine + ' ' + word : word
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case '\'': return '&apos;'
      case '"': return '&quot;'
    }
  })
}

export function generateBratSvg(text, invert = false) {
  const lines = wrapText(text, 16)
  const fontSize = lines.length > 5 ? 36 : lines.length > 3 ? 42 : 54
  const lineHeight = fontSize * 1.25
  const totalHeight = lines.length * lineHeight
  const startY = Math.max(60, (512 - totalHeight) / 2 + fontSize)

  const bgColor = invert ? '#000000' : '#8ACE00'
  const textColor = invert ? '#FFFFFF' : '#000000'

  const tspanLines = lines
    .map((line, i) => `<tspan x="40" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join('')

  return `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${bgColor}"/>
    <text x="40" y="${startY}" font-family="Arial, sans-serif" font-weight="bold" font-size="${fontSize}" fill="${textColor}">
      ${tspanLines}
    </text>
  </svg>`
}
