/**
 * A JPEG carrying EXIF, built to the spec, for tests.
 *
 * Test-only, and deliberately written from the TIFF specification rather than
 * from the parser: a fixture derived from the reader would agree with it even
 * if both misread the format. The reader was separately checked against a real
 * photograph produced by a real device, which is what makes this pairing
 * meaningful rather than circular.
 */

interface Field {
  tag: number
  type: number
  values: number[] | string
}

const SIZES: Record<number, number> = { 2: 1, 3: 2, 4: 4, 5: 8 }

function fieldBytes(field: Field): Uint8Array {
  if (field.type === 2) {
    const text = `${field.values as string}\0`
    return new TextEncoder().encode(text)
  }
  const values = field.values as number[]
  const out = new Uint8Array(values.length * SIZES[field.type]!)
  const view = new DataView(out.buffer)
  values.forEach((v, i) => {
    if (field.type === 3) {
      view.setUint16(i * 2, v, true)
    }
    else if (field.type === 4) {
      view.setUint32(i * 4, v, true)
    }
    else if (field.type === 5) {
      // Rationals are numerator/denominator pairs; ×1000 keeps them exact.
      view.setUint32(i * 8, Math.round(v * 1000), true)
      view.setUint32(i * 8 + 4, 1000, true)
    }
  })
  return out
}

function count(field: Field): number {
  return field.type === 2 ? (field.values as string).length + 1 : (field.values as number[]).length
}

/** Lay out one IFD plus its overflow data, at a known offset in the TIFF block. */
function buildIfd(fields: Field[], ifdOffset: number, dataOffset: number) {
  const sorted = [...fields].sort((a, b) => a.tag - b.tag)
  const ifd = new Uint8Array(2 + sorted.length * 12 + 4)
  const view = new DataView(ifd.buffer)
  view.setUint16(0, sorted.length, true)

  const overflow: Uint8Array[] = []
  let overflowAt = dataOffset

  sorted.forEach((field, i) => {
    const at = 2 + i * 12
    const bytes = fieldBytes(field)
    view.setUint16(at, field.tag, true)
    view.setUint16(at + 2, field.type, true)
    view.setUint32(at + 4, count(field), true)
    if (bytes.length <= 4) {
      ifd.set(bytes, at + 8)
    }
    else {
      view.setUint32(at + 8, overflowAt, true)
      overflow.push(bytes)
      overflowAt += bytes.length
    }
  })

  const data = new Uint8Array(overflowAt - dataOffset)
  let p = 0
  for (const chunk of overflow) {
    data.set(chunk, p)
    p += chunk.length
  }
  return { ifd, data, end: overflowAt, ifdOffset }
}

export interface FixtureOptions {
  make?: string
  model?: string
  orientation?: number
  iso?: number
  aperture?: number
  taken?: string
  /** Degrees, minutes, seconds plus hemisphere. */
  gps?: { lat: [number, number, number], latRef: string, lon: [number, number, number], lonRef: string }
}

/** A minimal but structurally valid JPEG whose APP1 segment holds real EXIF. */
export function jpegWithExif(options: FixtureOptions = {}): Uint8Array {
  const exifFields: Field[] = []
  if (options.iso !== undefined)
    exifFields.push({ tag: 0x8827, type: 3, values: [options.iso] })
  if (options.aperture !== undefined)
    exifFields.push({ tag: 0x829D, type: 5, values: [options.aperture] })
  if (options.taken)
    exifFields.push({ tag: 0x9003, type: 2, values: options.taken })

  const gpsFields: Field[] = []
  if (options.gps) {
    gpsFields.push({ tag: 1, type: 2, values: options.gps.latRef })
    gpsFields.push({ tag: 2, type: 5, values: options.gps.lat })
    gpsFields.push({ tag: 3, type: 2, values: options.gps.lonRef })
    gpsFields.push({ tag: 4, type: 5, values: options.gps.lon })
  }

  // Three IFDs laid out back to back, then one shared overflow area.
  const zeroFields: Field[] = []
  if (options.make)
    zeroFields.push({ tag: 0x010F, type: 2, values: options.make })
  if (options.model)
    zeroFields.push({ tag: 0x0110, type: 2, values: options.model })
  if (options.orientation !== undefined)
    zeroFields.push({ tag: 0x0112, type: 3, values: [options.orientation] })

  const zeroSize = 2 + (zeroFields.length + 2) * 12 + 4
  const exifSize = 2 + exifFields.length * 12 + 4
  const gpsSize = 2 + gpsFields.length * 12 + 4

  const ifd0At = 8
  const exifAt = ifd0At + zeroSize
  const gpsAt = exifAt + exifSize
  const dataAt = gpsAt + gpsSize

  if (exifFields.length)
    zeroFields.push({ tag: 0x8769, type: 4, values: [exifAt] })
  if (gpsFields.length)
    zeroFields.push({ tag: 0x8825, type: 4, values: [gpsAt] })

  const zero = buildIfd(zeroFields, ifd0At, dataAt)
  const exif = buildIfd(exifFields, exifAt, zero.end)
  const gps = buildIfd(gpsFields, gpsAt, exif.end)

  const tiff = new Uint8Array(gps.end)
  const tv = new DataView(tiff.buffer)
  tv.setUint16(0, 0x4949, true) // little-endian
  tv.setUint16(2, 42, true)
  tv.setUint32(4, ifd0At, true)
  tiff.set(zero.ifd, ifd0At)
  tiff.set(exif.ifd, exifAt)
  tiff.set(gps.ifd, gpsAt)
  tiff.set(zero.data, dataAt)
  tiff.set(exif.data, zero.end)
  tiff.set(gps.data, exif.end)

  const header = new TextEncoder().encode('Exif\0\0')
  const payload = new Uint8Array(header.length + tiff.length)
  payload.set(header)
  payload.set(tiff, header.length)

  const app1Length = payload.length + 2
  const scan = new Uint8Array([0xFF, 0xDA, 0x00, 0x08, 1, 1, 0, 0, 0x3F, 0x00, 0x12, 0x34, 0xFF, 0xD9])
  const out = new Uint8Array(2 + 4 + payload.length + scan.length)
  out.set([0xFF, 0xD8], 0)
  out.set([0xFF, 0xE1, (app1Length >> 8) & 0xFF, app1Length & 0xFF], 2)
  out.set(payload, 6)
  out.set(scan, 6 + payload.length)
  return out
}
