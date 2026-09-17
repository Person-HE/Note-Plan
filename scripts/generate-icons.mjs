import { Jimp } from 'jimp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const PUBLIC_DIR = path.join(ROOT, 'public')
const ELECTRON_ASSETS = path.join(ROOT, 'electron', 'assets')
const SOURCE = path.join(PUBLIC_DIR, 'icon-1024.png')

fs.mkdirSync(PUBLIC_DIR, { recursive: true })
fs.mkdirSync(ELECTRON_ASSETS, { recursive: true })

// ICO 格式需要的尺寸
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
// 需要单独导出的 PNG 尺寸
const PNG_SIZES = [16, 32, 48, 64, 128, 180, 192, 256, 512]

async function main() {
  console.log('Reading source icon:', SOURCE)
  const source = await Jimp.read(SOURCE)
  console.log('Source size:', source.width, 'x', source.height)

  // 生成各尺寸 PNG
  const pngBuffers = {}
  for (const size of [...new Set([...ICO_SIZES, ...PNG_SIZES])]) {
    const img = source.clone()
    await img.resize({ w: size, h: size })
    const buf = await img.getBuffer('image/png')
    pngBuffers[size] = buf
    const outPath = path.join(PUBLIC_DIR, `icon-${size}.png`)
    fs.writeFileSync(outPath, buf)
    console.log(`  Generated icon-${size}.png (${buf.length} bytes)`)
  }

  // 复制为常用文件名
  fs.copyFileSync(path.join(PUBLIC_DIR, 'icon-192.png'), path.join(PUBLIC_DIR, 'pwa-192x192.png'))
  fs.copyFileSync(path.join(PUBLIC_DIR, 'icon-512.png'), path.join(PUBLIC_DIR, 'pwa-512x512.png'))
  fs.copyFileSync(path.join(PUBLIC_DIR, 'icon-180.png'), path.join(PUBLIC_DIR, 'apple-touch-icon.png'))
  fs.copyFileSync(path.join(PUBLIC_DIR, 'icon-32.png'), path.join(PUBLIC_DIR, 'favicon-32.png'))
  fs.copyFileSync(path.join(PUBLIC_DIR, 'icon-16.png'), path.join(PUBLIC_DIR, 'favicon-16.png'))
  console.log('  Copied PWA / apple-touch / favicon PNGs')

  // 构建 ICO 文件（PNG 压缩格式，现代 Windows 支持）
  const icoBuffer = buildIco(ICO_SIZES.map(s => ({ size: s, data: pngBuffers[s] })))
  const icoPath = path.join(ELECTRON_ASSETS, 'appIcon.ico')
  fs.writeFileSync(icoPath, icoBuffer)
  console.log(`  Generated appIcon.ico (${icoBuffer.length} bytes)`)

  // 同时在 public 下放一份 favicon.ico
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer)
  console.log('  Copied favicon.ico')

  console.log('\nAll icons generated successfully!')
}

/**
 * 构建 ICO 文件（使用 PNG 压缩的图像条目）
 * ICO 格式: ICONDIR + 多个 ICONDIRENTRY + 图像数据
 */
function buildIco(images) {
  const headerSize = 6 // ICONDIR
  const entrySize = 16 // ICONDIRENTRY per image
  const count = images.length

  // 计算所有图像数据的总偏移
  let dataOffset = headerSize + entrySize * count
  const entries = []
  let totalDataSize = 0

  for (const img of images) {
    const size = img.size >= 256 ? 0 : img.size // ICO 中 256 用 0 表示
    entries.push({
      width: size,
      height: size,
      colorCount: 0,
      reserved: 0,
      planes: 1,
      bitCount: 32,
      bytesInRes: img.data.length,
      imageOffset: dataOffset,
    })
    dataOffset += img.data.length
    totalDataSize += img.data.length
  }

  const buffer = Buffer.alloc(headerSize + entrySize * count + totalDataSize)
  let offset = 0

  // ICONDIR
  buffer.writeUInt16LE(0, offset) // reserved
  offset += 2
  buffer.writeUInt16LE(1, offset) // type: 1 = icon
  offset += 2
  buffer.writeUInt16LE(count, offset) // count
  offset += 2

  // ICONDIRENTRY
  for (const entry of entries) {
    buffer.writeUInt8(entry.width, offset)
    offset += 1
    buffer.writeUInt8(entry.height, offset)
    offset += 1
    buffer.writeUInt8(entry.colorCount, offset)
    offset += 1
    buffer.writeUInt8(entry.reserved, offset)
    offset += 1
    buffer.writeUInt16LE(entry.planes, offset)
    offset += 2
    buffer.writeUInt16LE(entry.bitCount, offset)
    offset += 2
    buffer.writeUInt32LE(entry.bytesInRes, offset)
    offset += 4
    buffer.writeUInt32LE(entry.imageOffset, offset)
    offset += 4
  }

  // 图像数据
  for (const img of images) {
    img.data.copy(buffer, offset)
    offset += img.data.length
  }

  return buffer
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
