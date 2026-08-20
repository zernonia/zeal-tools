/**
 * Minimal zero-dependency PNG writer.
 *
 * Emits a valid 8-bit RGBA PNG using zlib "stored" (uncompressed) deflate
 * blocks — no compression library required, so this runs anywhere, including
 * Cloudflare Workers. QR codes are small; the byte overhead is irrelevant
 * next to owning the whole pipeline.
 */

const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c >>> 0
}

function crc32(...chunks: Uint8Array[]): number {
  let c = 0xFFFFFFFF
  for (const chunk of chunks) {
    for (const byte of chunk) c = CRC_TABLE[(c ^ byte) & 0xFF] ^ (c >>> 8)
  }
  return (c ^ 0xFFFFFFFF) >>> 0
}

function adler32(data: Uint8Array): number {
  let a = 1; let b = 0
  for (const byte of data) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

function u32(value: number): Uint8Array {
  return new Uint8Array([value >>> 24 & 0xFF, value >>> 16 & 0xFF, value >>> 8 & 0xFF, value & 0xFF])
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new Uint8Array([...type].map(c => c.charCodeAt(0)))
  const out = new Uint8Array(12 + data.length)
  out.set(u32(data.length), 0)
  out.set(typeBytes, 4)
  out.set(data, 8)
  out.set(u32(crc32(typeBytes, data)), 8 + data.length)
  return out
}

/** zlib stream with stored deflate blocks (max 65535 bytes per block). */
function zlibStored(data: Uint8Array): Uint8Array {
  const blocks: Uint8Array[] = [new Uint8Array([0x78, 0x01])]
  for (let off = 0; off < data.length; off += 65535) {
    const slice = data.subarray(off, Math.min(off + 65535, data.length))
    const last = off + 65535 >= data.length ? 1 : 0
    const header = new Uint8Array(5)
    header[0] = last
    header[1] = slice.length & 0xFF
    header[2] = slice.length >>> 8
    header[3] = ~slice.length & 0xFF
    header[4] = (~slice.length >>> 8) & 0xFF
    blocks.push(header, slice)
  }
  blocks.push(u32(adler32(data)))
  const total = blocks.reduce((n, b) => n + b.length, 0)
  const out = new Uint8Array(total)
  let pos = 0
  for (const b of blocks) { out.set(b, pos); pos += b.length }
  return out
}

/** PNG colour types we emit: 2 is RGB, 6 is RGBA. */
export type PngColorType = 2 | 6

/**
 * Prefix each scanline with its filter byte (0 = None).
 *
 * Exported because compression may be asynchronous — `CompressionStream` in a
 * browser is — so a caller sometimes needs the raw bytes before the deflate
 * step rather than handing in a synchronous compressor.
 */
export function pngScanlines(width: number, height: number, pixels: Uint8Array, channels: 3 | 4): Uint8Array {
  if (pixels.length !== width * height * channels)
    throw new Error(`pixel length must be width*height*${channels}`)

  const stride = width * channels
  const raw = new Uint8Array(height * (stride + 1))
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    raw.set(pixels.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1)
  }
  return raw
}

/** Wrap an already-compressed IDAT payload in the surrounding chunks. */
export function assemblePng(width: number, height: number, idat: Uint8Array, colorType: PngColorType = 6): Uint8Array {
  const ihdr = new Uint8Array(13)
  ihdr.set(u32(width), 0)
  ihdr.set(u32(height), 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = colorType
  // compression, filter, interlace all 0

  const signature = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  const parts = [signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))]
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let pos = 0
  for (const p of parts) { out.set(p, pos); pos += p.length }
  return out
}

/**
 * Encode raw RGBA pixels (row-major, 4 bytes/px) as a PNG file.
 *
 * `deflate` optionally supplies a real zlib compressor (e.g. node:zlib's
 * deflateSync in build scripts); at runtime we default to stored blocks and
 * stay dependency-free.
 */
export function encodePng(width: number, height: number, rgba: Uint8Array, deflate?: (raw: Uint8Array) => Uint8Array): Uint8Array {
  const raw = pngScanlines(width, height, rgba, 4)
  return assemblePng(width, height, deflate ? deflate(raw) : zlibStored(raw), 6)
}

/**
 * Encode opaque RGB pixels (3 bytes/px) as a PNG with **no alpha channel**.
 *
 * Not a micro-optimisation: Apple rejects an App Store icon whose PNG carries
 * an alpha channel (ITMS-90717), and a canvas always writes RGBA even when
 * every pixel is fully opaque. The only way to satisfy the validator is to
 * emit colour type 2, where the channel does not exist to be complained about.
 */
export function encodePngRgb(width: number, height: number, rgb: Uint8Array, deflate?: (raw: Uint8Array) => Uint8Array): Uint8Array {
  const raw = pngScanlines(width, height, rgb, 3)
  return assemblePng(width, height, deflate ? deflate(raw) : zlibStored(raw), 2)
}

/** Parse a CSS hex color (#rgb, #rrggbb, #rrggbbaa) into RGBA bytes. */
export function hexToRgba(hex: string, fallback: [number, number, number, number] = [0, 0, 0, 255]): [number, number, number, number] {
  const m = hex.trim().match(/^#?([0-9a-f]{3,8})$/i)
  if (!m)
    return fallback
  let h = m[1]
  if (h.length === 3 || h.length === 4)
    h = [...h].map(c => c + c).join('')
  if (h.length !== 6 && h.length !== 8)
    return fallback
  const n = Number.parseInt(h, 16)
  if (h.length === 6)
    return [n >>> 16 & 0xFF, n >>> 8 & 0xFF, n & 0xFF, 255]
  return [n >>> 24 & 0xFF, n >>> 16 & 0xFF, n >>> 8 & 0xFF, n & 0xFF]
}
