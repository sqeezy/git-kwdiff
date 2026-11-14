// Placeholder icons: a green tile with a cream inset. Run `node scripts/make-icon.mjs`
// to regenerate src-tauri/icons/*.png and icon.ico. Replace with real art later.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const here = dirname(new URL(import.meta.url).pathname)
const out = join(here, '..', 'src-tauri', 'icons')
mkdirSync(out, { recursive: true })

const rgba = (r, g, b) => [r, g, b, 255]

function draw(size) {
  const px = Buffer.alloc(size * size * 4)
  const [bg, fg] = [rgba(15, 42, 29), rgba(63, 185, 80)]
  const inset = Math.round(size * 0.26)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inside = x > inset && x < size - inset && y > inset && y < size - inset
      const [r, g, b, a] = inside ? fg : bg
      const i = (y * size + x) * 4
      px[i] = r
      px[i + 1] = g
      px[i + 2] = b
      px[i + 3] = a
    }
  }
  return px
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body) >>> 0)
  return Buffer.concat([length, body, crc])
}

let table = null
function crc32(buf) {
  if (!table) {
    table = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function png(size) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  const pixels = draw(size)
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const pngs = new Map()
for (const size of [32, 128, 256, 512]) pngs.set(size, png(size))

writeFileSync(join(out, '32x32.png'), pngs.get(32))
writeFileSync(join(out, '128x128.png'), pngs.get(128))
writeFileSync(join(out, '128x128@2x.png'), pngs.get(256))
writeFileSync(join(out, 'icon.png'), pngs.get(512))

// ICO with PNG payloads: 6-byte header, 16-byte directory entries, then images.
const sizes = [32, 256]
const directory = Buffer.alloc(6 + 16 * sizes.length)
directory.writeUInt16LE(0, 0)
directory.writeUInt16LE(1, 2)
directory.writeUInt16LE(sizes.length, 4)
let offset = directory.length
sizes.forEach((size, index) => {
  const entry = 6 + index * 16
  directory[entry] = size === 256 ? 0 : size
  directory[entry + 1] = size === 256 ? 0 : size
  directory[entry + 2] = 0
  directory[entry + 3] = 0
  directory.writeUInt16LE(1, entry + 4)
  directory.writeUInt16LE(32, entry + 6)
  directory.writeUInt32LE(pngs.get(size).length, entry + 8)
  directory.writeUInt32LE(offset, entry + 12)
  offset += pngs.get(size).length
})
writeFileSync(
  join(out, 'icon.ico'),
  Buffer.concat([directory, ...sizes.map(size => pngs.get(size))]),
)

console.log('icons written to', out)
