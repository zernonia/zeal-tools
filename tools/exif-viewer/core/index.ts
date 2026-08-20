/**
 * EXIF viewer and metadata stripper — the pure part.
 *
 * Two jobs, and the second is the reason this exists rather than leaning on a
 * canvas. Re-drawing an image through a canvas does remove its metadata, but
 * it also re-encodes every pixel, so a "privacy" step quietly costs you
 * quality. Removing the metadata *segments* from the file instead leaves the
 * compressed image data byte for byte identical — the photo is untouched and
 * only the labels are gone.
 *
 * No DOM, no dependencies: bytes in, bytes and readings out.
 */

export interface ExifTag {
  label: string
  value: string
  /** Tags that identify a person, a place or a device. */
  sensitive?: boolean
}

export interface ExifReading {
  tags: ExifTag[]
  /** Decimal degrees, when the photo carries a location. */
  location?: { latitude: number, longitude: number }
}

// ---------------------------------------------------------------- TIFF reader

const ASCII = 2
const SHORT = 3
const LONG = 4
const RATIONAL = 5
const SRATIONAL = 10

const TYPE_SIZES: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 }

interface Cursor {
  view: DataView
  /** Offsets inside a TIFF block are relative to the block, not the file. */
  base: number
  little: boolean
}

function readValue(cur: Cursor, type: number, count: number, offset: number): unknown[] {
  const out: unknown[] = []
  const size = TYPE_SIZES[type] ?? 1
  for (let i = 0; i < count; i++) {
    const at = offset + i * size
    if (at + size > cur.view.byteLength)
      break
    switch (type) {
      case SHORT: out.push(cur.view.getUint16(at, cur.little)); break
      case LONG: out.push(cur.view.getUint32(at, cur.little)); break
      case RATIONAL: {
        const n = cur.view.getUint32(at, cur.little)
        const d = cur.view.getUint32(at + 4, cur.little)
        out.push(d === 0 ? 0 : n / d)
        break
      }
      case SRATIONAL: {
        const n = cur.view.getInt32(at, cur.little)
        const d = cur.view.getInt32(at + 4, cur.little)
        out.push(d === 0 ? 0 : n / d)
        break
      }
      case ASCII: out.push(String.fromCharCode(cur.view.getUint8(at))); break
      default: out.push(cur.view.getUint8(at))
    }
  }
  return out
}

interface Entry { tag: number, type: number, count: number, values: unknown[] }

function readIfd(cur: Cursor, ifdOffset: number): Entry[] {
  const entries: Entry[] = []
  const start = cur.base + ifdOffset
  if (start + 2 > cur.view.byteLength)
    return entries

  const count = cur.view.getUint16(start, cur.little)
  // A corrupt or hostile header can claim an enormous entry count.
  const safeCount = Math.min(count, 512)

  for (let i = 0; i < safeCount; i++) {
    const at = start + 2 + i * 12
    if (at + 12 > cur.view.byteLength)
      break
    const tag = cur.view.getUint16(at, cur.little)
    const type = cur.view.getUint16(at + 2, cur.little)
    const n = cur.view.getUint32(at + 4, cur.little)
    const size = (TYPE_SIZES[type] ?? 1) * n
    // Four bytes or fewer live inline; anything larger is a pointer.
    const valueAt = size <= 4 ? at + 8 : cur.base + cur.view.getUint32(at + 8, cur.little)
    entries.push({ tag, type, count: n, values: readValue(cur, type, Math.min(n, 4096), valueAt) })
  }
  return entries
}

function text(entry: Entry | undefined): string {
  if (!entry)
    return ''
  return (entry.values as string[]).join('').replace(/\0+$/, '').trim()
}

function num(entry: Entry | undefined): number | undefined {
  const v = entry?.values?.[0]
  return typeof v === 'number' ? v : undefined
}

/** Degrees, minutes, seconds to decimal degrees. */
function toDecimal(parts: unknown[], ref: string): number | undefined {
  const [d, m, s] = parts as number[]
  if (typeof d !== 'number' || typeof m !== 'number' || typeof s !== 'number')
    return undefined
  const value = d + m / 60 + s / 3600
  if (!Number.isFinite(value))
    return undefined
  return ref === 'S' || ref === 'W' ? -value : value
}

const ORIENTATIONS: Record<number, string> = {
  1: 'Normal',
  2: 'Mirrored',
  3: 'Rotated 180°',
  4: 'Mirrored, rotated 180°',
  5: 'Mirrored, rotated 90° CCW',
  6: 'Rotated 90° CW',
  7: 'Mirrored, rotated 90° CW',
  8: 'Rotated 90° CCW',
}

/** Find the EXIF block in a JPEG: the APP1 segment beginning "Exif\0\0". */
function findJpegExif(bytes: Uint8Array): number | null {
  if (bytes[0] !== 0xFF || bytes[1] !== 0xD8)
    return null
  let p = 2
  while (p + 4 < bytes.length) {
    if (bytes[p] !== 0xFF)
      return null
    const marker = bytes[p + 1]!
    if (marker === 0xDA || marker === 0xD9)
      return null
    const length = (bytes[p + 2]! << 8) | bytes[p + 3]!
    if (marker === 0xE1
      && bytes[p + 4] === 0x45 && bytes[p + 5] === 0x78
      && bytes[p + 6] === 0x69 && bytes[p + 7] === 0x66) {
      return p + 10
    }
    p += 2 + length
  }
  return null
}

/** Find the EXIF payload in a PNG: the contents of an `eXIf` chunk. */
function findPngExif(bytes: Uint8Array): number | null {
  if (bytes.length < 8 || bytes[0] !== 0x89 || bytes[1] !== 0x50)
    return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let p = 8
  while (p + 8 <= bytes.length) {
    const length = view.getUint32(p)
    const type = String.fromCharCode(bytes[p + 4]!, bytes[p + 5]!, bytes[p + 6]!, bytes[p + 7]!)
    if (type === 'eXIf')
      return p + 8
    if (type === 'IEND')
      return null
    p += 12 + length
  }
  return null
}

/**
 * Read whatever the file admits to.
 *
 * Never throws: this parses arbitrary bytes a stranger produced, so an
 * unreadable or hostile header yields an empty reading rather than an
 * exception the caller has to guard every use with.
 */
export function readExif(bytes: Uint8Array): ExifReading {
  const empty: ExifReading = { tags: [] }
  try {
    const start = findJpegExif(bytes) ?? findPngExif(bytes)
    if (start === null || start + 8 > bytes.length)
      return empty

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const order = view.getUint16(start)
    if (order !== 0x4949 && order !== 0x4D4D)
      return empty
    const little = order === 0x4949
    if (view.getUint16(start + 2, little) !== 42)
      return empty

    const cur: Cursor = { view, base: start, little }
    const ifd0 = readIfd(cur, view.getUint32(start + 4, little))
    const byTag = (list: Entry[], tag: number) => list.find(e => e.tag === tag)

    const exifPointer = num(byTag(ifd0, 0x8769))
    const gpsPointer = num(byTag(ifd0, 0x8825))
    const exif = exifPointer ? readIfd(cur, exifPointer) : []
    const gps = gpsPointer ? readIfd(cur, gpsPointer) : []

    const tags: ExifTag[] = []
    const push = (label: string, value: string | number | undefined, sensitive?: boolean) => {
      if (value === undefined || value === '' || value === null)
        return
      tags.push({ label, value: String(value), sensitive })
    }

    push('Camera make', text(byTag(ifd0, 0x010F)), true)
    push('Camera model', text(byTag(ifd0, 0x0110)), true)
    push('Lens', text(byTag(exif, 0xA434)), true)
    push('Software', text(byTag(ifd0, 0x0131)), true)
    push('Taken', text(byTag(exif, 0x9003)) || text(byTag(ifd0, 0x0132)), true)

    const orientation = num(byTag(ifd0, 0x0112))
    push('Orientation', orientation ? ORIENTATIONS[orientation] ?? `Unknown (${orientation})` : undefined)

    const exposure = num(byTag(exif, 0x829A))
    push('Exposure', exposure ? (exposure >= 1 ? `${exposure}s` : `1/${Math.round(1 / exposure)}s`) : undefined)
    const aperture = num(byTag(exif, 0x829D))
    push('Aperture', aperture ? `f/${Math.round(aperture * 10) / 10}` : undefined)
    push('ISO', num(byTag(exif, 0x8827)))
    const focal = num(byTag(exif, 0x920A))
    push('Focal length', focal ? `${Math.round(focal)}mm` : undefined)

    const latitude = toDecimal(byTag(gps, 2)?.values ?? [], text(byTag(gps, 1)))
    const longitude = toDecimal(byTag(gps, 4)?.values ?? [], text(byTag(gps, 3)))

    const reading: ExifReading = { tags }
    if (latitude !== undefined && longitude !== undefined) {
      reading.location = { latitude, longitude }
      push('Location', `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, true)
    }
    return reading
  }
  catch {
    return empty
  }
}

// ------------------------------------------------------------------ stripping

/**
 * JPEG application segments that carry metadata rather than image data.
 *
 * APP0 (JFIF) and APP2 (ICC colour profile) are deliberately kept: the first
 * describes pixel density and the second describes how the colours should be
 * interpreted, so dropping it visibly shifts the image. Neither identifies
 * anybody, which is the thing being removed here.
 */
function isMetadataMarker(marker: number): boolean {
  if (marker === 0xFE) // COM, a free-text comment
    return true
  if (marker === 0xE0 || marker === 0xE2) // JFIF, ICC
    return false
  return marker >= 0xE1 && marker <= 0xEF // APP1..APP15
}

/** PNG chunks that carry text, timestamps or EXIF rather than pixels. */
const PNG_METADATA = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME'])

export interface StripResult {
  data: Uint8Array
  /** How many bytes of metadata were removed. */
  removed: number
  /** True when the pixel data is untouched — always so for the formats we handle. */
  lossless: boolean
}

/**
 * Remove metadata without touching a single pixel.
 *
 * Both formats are containers: the compressed image lives in its own
 * segments, and everything removed here sits beside it. The image data is
 * copied through verbatim, so the result decodes to exactly the same pixels
 * as the original — which is the whole difference between this and running a
 * photo through a canvas.
 */
export function stripMetadata(bytes: Uint8Array, type: string): StripResult {
  const kind = type.toLowerCase()
  if (kind === 'image/jpeg' || kind === 'image/jpg')
    return stripJpeg(bytes)
  if (kind === 'image/png')
    return stripPng(bytes)
  return { data: bytes, removed: 0, lossless: true }
}

function stripJpeg(bytes: Uint8Array): StripResult {
  if (bytes[0] !== 0xFF || bytes[1] !== 0xD8)
    return { data: bytes, removed: 0, lossless: true }

  const keep: [number, number][] = [[0, 2]]
  let p = 2
  let removed = 0

  while (p + 4 <= bytes.length) {
    if (bytes[p] !== 0xFF)
      break
    const marker = bytes[p + 1]!
    // Everything from the scan header to the end is image data.
    if (marker === 0xDA) {
      keep.push([p, bytes.length])
      p = bytes.length
      break
    }
    const length = (bytes[p + 2]! << 8) | bytes[p + 3]!
    const end = p + 2 + length
    if (end > bytes.length)
      break
    if (isMetadataMarker(marker))
      removed += end - p
    else
      keep.push([p, end])
    p = end
  }

  const size = keep.reduce((n, [a, b]) => n + (b - a), 0)
  const out = new Uint8Array(size)
  let at = 0
  for (const [a, b] of keep) {
    out.set(bytes.subarray(a, b), at)
    at += b - a
  }
  return { data: out, removed, lossless: true }
}

function stripPng(bytes: Uint8Array): StripResult {
  if (bytes.length < 8 || bytes[0] !== 0x89 || bytes[1] !== 0x50)
    return { data: bytes, removed: 0, lossless: true }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const keep: [number, number][] = [[0, 8]]
  let p = 8
  let removed = 0

  while (p + 8 <= bytes.length) {
    const length = view.getUint32(p)
    const type = String.fromCharCode(bytes[p + 4]!, bytes[p + 5]!, bytes[p + 6]!, bytes[p + 7]!)
    const end = p + 12 + length
    if (end > bytes.length)
      break
    if (PNG_METADATA.has(type))
      removed += end - p
    else
      keep.push([p, end])
    p = end
    if (type === 'IEND')
      break
  }

  const size = keep.reduce((n, [a, b]) => n + (b - a), 0)
  const out = new Uint8Array(size)
  let at = 0
  for (const [a, b] of keep) {
    out.set(bytes.subarray(a, b), at)
    at += b - a
  }
  return { data: out, removed, lossless: true }
}
