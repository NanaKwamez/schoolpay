/**
 * Generates PWA icons for SchoolPay using the canvas npm package.
 * Run: node scripts/generate-icons.js
 * Requires: npm install canvas (in scripts context only)
 */

const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Green background rounded square
  const radius = size * 0.2
  ctx.fillStyle = '#16a34a'
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(size - radius, 0)
  ctx.arcTo(size, 0, size, radius, radius)
  ctx.lineTo(size, size - radius)
  ctx.arcTo(size, size, size - radius, size, radius)
  ctx.lineTo(radius, size)
  ctx.arcTo(0, size, 0, size - radius, radius)
  ctx.lineTo(0, radius)
  ctx.arcTo(0, 0, radius, 0, radius)
  ctx.closePath()
  ctx.fill()

  // White "MGA" text
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.floor(size * 0.28)}px Arial`
  ctx.fillText('MGA', size / 2, size / 2)

  return canvas.toBuffer('image/png')
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons')
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true })

for (const size of [192, 512]) {
  const buffer = generateIcon(size)
  const outPath = path.join(iconsDir, `icon-${size}.png`)
  fs.writeFileSync(outPath, buffer)
  console.log(`Generated ${outPath} (${size}x${size})`)
}

console.log('Icons generated successfully!')
