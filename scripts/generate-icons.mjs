import sharp from 'sharp'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const src = join(root, 'public/images/logo.png')
const outDir = join(root, 'public/icons')

mkdirSync(outDir, { recursive: true })

const SIZES = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-96x96.png', size: 96 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'web-app-manifest-192x192.png', size: 192 },
  { name: 'web-app-manifest-512x512.png', size: 512 },
]

const meta = await sharp(src).metadata()
const max = Math.max(meta.width, meta.height)
const pad = Math.round(max * 0.08)
const squareSize = max + pad * 2

// Square white canvas with logo centered
const squareBase = await sharp({
  create: {
    width: squareSize,
    height: squareSize,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
})
  .composite([{
    input: src,
    left: Math.round((squareSize - meta.width) / 2),
    top: Math.round((squareSize - meta.height) / 2),
  }])
  .png()
  .toBuffer()

for (const { name, size } of SIZES) {
  await sharp(squareBase)
    .resize(size, size, { fit: 'fill' })
    .png()
    .toFile(join(outDir, name))
  console.log(`  ✓ ${name}`)
}

// Build favicon.ico with 16x16 and 32x32 PNG chunks
const ico16 = await sharp(squareBase).resize(16, 16).png().toBuffer()
const ico32 = await sharp(squareBase).resize(32, 32).png().toBuffer()

function buildIco(images) {
  const count = images.length
  const headerSize = 6
  const dirEntrySize = 16
  const dataOffset = headerSize + dirEntrySize * count

  let totalSize = dataOffset
  for (const img of images) totalSize += img.data.length

  const buf = Buffer.alloc(totalSize)
  buf.writeUInt16LE(0, 0)      // reserved
  buf.writeUInt16LE(1, 2)      // type: ICO
  buf.writeUInt16LE(count, 4)  // count

  let offset = dataOffset
  for (let i = 0; i < images.length; i++) {
    const { size, data } = images[i]
    const base = headerSize + i * dirEntrySize
    buf.writeUInt8(size === 256 ? 0 : size, base)
    buf.writeUInt8(size === 256 ? 0 : size, base + 1)
    buf.writeUInt8(0, base + 2)   // color count
    buf.writeUInt8(0, base + 3)   // reserved
    buf.writeUInt16LE(1, base + 4)  // planes
    buf.writeUInt16LE(32, base + 6) // bit count
    buf.writeUInt32LE(data.length, base + 8)
    buf.writeUInt32LE(offset, base + 12)
    data.copy(buf, offset)
    offset += data.length
  }

  return buf
}

const icoData = buildIco([
  { size: 16, data: ico16 },
  { size: 32, data: ico32 },
])
writeFileSync(join(outDir, 'favicon.ico'), icoData)
console.log('  ✓ favicon.ico')

console.log('\nDone! Icons saved to public/icons/')
