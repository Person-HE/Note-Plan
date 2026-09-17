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

// Windows ICO 需要的标准尺寸（BMP 格式，rcedit 兼容）
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

/**
 * 从 Jimp 图像构建传统 BMP 格式的 ICO 图像数据
 * 包含 BITMAPINFOHEADER + XOR mask (BGRA) + AND mask (1bpp)
 */
function buildBmpIconData(image, size) {
  const width = size
  const height = size

  // 读取像素（jimp 的 bitmap.data 是 RGBA，从上到下）
  const srcData = image.bitmap.data

  // XOR mask: BGRA, 自底向上, 每行4字节对齐（32位色自然对齐）
  const xorSize = width * height * 4
  const xorMask = Buffer.alloc(xorSize)

  // AND mask: 1bpp, 自底向上, 每行对齐到4字节
  const andRowSize = Math.ceil(width / 8)
  const andRowAligned = Math.ceil(andRowSize / 4) * 4
  const andSize = andRowAligned * height
  const andMask = Buffer.alloc(andSize)

  for (let y = 0; y < height; y++) {
    // 自底向上：源图像的第 (height-1-y) 行对应目标的第 y 行
    const srcRow = (height - 1 - y) * width
    const dstRow = y * width

    for (let x = 0; x < width; x++) {
      const srcIdx = (srcRow + x) * 4
      const dstIdx = (dstRow + x) * 4

      const r = srcData[srcIdx]
      const g = srcData[srcIdx + 1]
      const b = srcData[srcIdx + 2]
      const a = srcData[srcIdx + 3]

      // BGRA 顺序
      xorMask[dstIdx] = b
      xorMask[dstIdx + 1] = g
      xorMask[dstIdx + 2] = r
      xorMask[dstIdx + 3] = a

      // AND mask: alpha < 128 视为透明（1=透明）
      if (a < 128) {
        const byteIdx = y * andRowAligned + Math.floor(x / 8)
        const bitIdx = 7 - (x % 8)
        andMask[byteIdx] |= (1 << bitIdx)
      }
    }
  }

  // BITMAPINFOHEADER (40 bytes)
  const header = Buffer.alloc(40)
  header.writeUInt32LE(40, 0)       // biSize
  header.writeInt32LE(width, 4)      // biWidth
  header.writeInt32LE(height * 2, 8) // biHeight (2x because includes AND mask)
  header.writeUInt16LE(1, 12)         // biPlanes
  header.writeUInt16LE(32, 14)        // biBitCount
  header.writeUInt32LE(0, 16)         // biCompression (BI_RGB)
  header.writeUInt32LE(xorSize + andSize, 20) // biSizeImage
  header.writeInt32LE(0, 24)          // biXPelsPerMeter
  header.writeInt32LE(0, 28)          // biYPelsPerMeter
  header.writeUInt32LE(0, 32)         // biClrUsed
  header.writeUInt32LE(0, 36)         // biClrImportant

  return Buffer.concat([header, xorMask, andMask])
}

/**
 * 构建完整的 ICO 文件（传统 BMP 格式）
 */
function buildIco(images) {
  const count = images.length
  const headerSize = 6
  const entrySize = 16

  // 计算偏移
  let dataOffset = headerSize + entrySize * count
  const entries = []
  const dataBuffers = []

  for (const img of images) {
    const size = img.size >= 256 ? 0 : img.size
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
    dataBuffers.push(img.data)
    dataOffset += img.data.length
  }

  const totalSize = headerSize + entrySize * count + dataBuffers.reduce((s, b) => s + b.length, 0)
  const buffer = Buffer.alloc(totalSize)
  let offset = 0

  // ICONDIR
  buffer.writeUInt16LE(0, offset)  // reserved
  offset += 2
  buffer.writeUInt16LE(1, offset)  // type = 1 (icon)
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
  for (const data of dataBuffers) {
    data.copy(buffer, offset)
    offset += data.length
  }

  return buffer
}

async function main() {
  console.log('Reading source:', SOURCE)
  const source = await Jimp.read(SOURCE)
  console.log('Source size:', source.width, 'x', source.height)

  const iconImages = []

  for (const size of ICO_SIZES) {
    const img = source.clone()
    await img.resize({ w: size, h: size })
    const bmpData = buildBmpIconData(img, size)
    iconImages.push({ size, data: bmpData })
    console.log(`  Built ${size}x${size} BMP icon (${bmpData.length} bytes)`)
  }

  const icoBuffer = buildIco(iconImages)
  const icoPath = path.join(ELECTRON_ASSETS, 'appIcon.ico')
  fs.writeFileSync(icoPath, icoBuffer)
  console.log(`\nWrote ${icoPath} (${icoBuffer.length} bytes)`)

  // 同时更新 public/favicon.ico
  const faviconPath = path.join(PUBLIC_DIR, 'favicon.ico')
  fs.writeFileSync(faviconPath, icoBuffer)
  console.log(`Wrote ${faviconPath} (${icoBuffer.length} bytes)`)

  // 验证 ICO 头
  const verify = fs.readFileSync(icoPath)
  const type = verify.readUInt16LE(2)
  const count = verify.readUInt16LE(4)
  console.log(`\nVerification: type=${type} (1=icon), count=${count}`)
  for (let i = 0; i < count; i++) {
    const off = 6 + i * 16
    const w = verify.readUInt8(off)
    const h = verify.readUInt8(off + 1)
    const bits = verify.readUInt16LE(off + 6)
    const sz = verify.readUInt32LE(off + 8)
    console.log(`  Entry ${i}: ${w === 0 ? 256 : w}x${h === 0 ? 256 : h}, ${bits}bpp, ${sz} bytes`)
  }

  console.log('\nDone! Traditional BMP-format ICO generated (rcedit compatible).')
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
