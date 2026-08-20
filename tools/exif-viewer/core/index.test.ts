import { describe, expect, it } from 'vitest'
import { jpegWithExif } from './fixture'
import { readExif, stripMetadata } from './index'

function value(jpeg: Uint8Array, label: string) {
  return readExif(jpeg).tags.find(t => t.label === label)?.value
}

describe('readExif', () => {
  it('reads what a camera writes', () => {
    const jpeg = jpegWithExif({ make: 'Fujifilm', model: 'X-T5', iso: 400, aperture: 2.8, taken: '2026:08:20 14:31:05' })
    expect(value(jpeg, 'Camera make')).toBe('Fujifilm')
    expect(value(jpeg, 'Camera model')).toBe('X-T5')
    expect(value(jpeg, 'ISO')).toBe('400')
    expect(value(jpeg, 'Aperture')).toBe('f/2.8')
    expect(value(jpeg, 'Taken')).toBe('2026:08:20 14:31:05')
  })

  it('names the orientation rather than printing a number', () => {
    expect(value(jpegWithExif({ orientation: 1 }), 'Orientation')).toBe('Normal')
    expect(value(jpegWithExif({ orientation: 6 }), 'Orientation')).toBe('Rotated 90° CW')
    expect(value(jpegWithExif({ orientation: 8 }), 'Orientation')).toBe('Rotated 90° CCW')
  })

  it('converts coordinates out of degrees, minutes and seconds', () => {
    // 51°30'26.4"N, 0°7'39.6"W — central London.
    const jpeg = jpegWithExif({ gps: { lat: [51, 30, 26.4], latRef: 'N', lon: [0, 7, 39.6], lonRef: 'W' } })
    const reading = readExif(jpeg)
    expect(reading.location!.latitude).toBeCloseTo(51.50733, 4)
    expect(reading.location!.longitude).toBeCloseTo(-0.12767, 4)
  })

  it('gets the hemisphere right in both directions', () => {
    // South and west are negative; getting this wrong puts Sydney in Siberia.
    const south = readExif(jpegWithExif({ gps: { lat: [33, 51, 54], latRef: 'S', lon: [151, 12, 36], lonRef: 'E' } }))
    expect(south.location!.latitude).toBeCloseTo(-33.865, 3)
    expect(south.location!.longitude).toBeCloseTo(151.21, 3)
  })

  it('marks identifying tags as sensitive', () => {
    const reading = readExif(jpegWithExif({ make: 'Apple', gps: { lat: [1, 0, 0], latRef: 'N', lon: [1, 0, 0], lonRef: 'E' } }))
    expect(reading.tags.find(t => t.label === 'Camera make')?.sensitive).toBe(true)
    expect(reading.tags.find(t => t.label === 'Location')?.sensitive).toBe(true)
    // Orientation says nothing about a person, so it is not flagged.
    expect(reading.tags.find(t => t.label === 'Orientation')?.sensitive).toBeUndefined()
  })

  it('reports nothing rather than throwing on input it cannot read', () => {
    // This parses arbitrary bytes a stranger produced.
    for (const bad of [new Uint8Array(0), new Uint8Array([0xFF, 0xD8]), new Uint8Array([1, 2, 3, 4, 5])])
      expect(readExif(bad).tags).toEqual([])
  })

  it('survives a header claiming an absurd number of entries', () => {
    const jpeg = jpegWithExif({ make: 'Canon' })
    const corrupted = Uint8Array.from(jpeg)
    // The IFD entry count sits right after the TIFF header.
    corrupted[6 + 6 + 8] = 0xFF
    corrupted[6 + 6 + 9] = 0xFF
    expect(() => readExif(corrupted)).not.toThrow()
  })

  it('finds no location when the photo carries none', () => {
    expect(readExif(jpegWithExif({ make: 'Nikon' })).location).toBeUndefined()
  })
})

/** Everything from the scan marker onward is the compressed image itself. */
function scanData(jpeg: Uint8Array): Uint8Array {
  let p = 2
  while (p + 4 <= jpeg.length) {
    if (jpeg[p] !== 0xFF)
      break
    if (jpeg[p + 1] === 0xDA)
      return jpeg.subarray(p)
    p += 2 + ((jpeg[p + 2]! << 8) | jpeg[p + 3]!)
  }
  return new Uint8Array(0)
}

describe('stripMetadata', () => {
  it('removes EXIF from a JPEG', () => {
    const jpeg = jpegWithExif({ make: 'Fujifilm', gps: { lat: [51, 30, 26], latRef: 'N', lon: [0, 7, 39], lonRef: 'W' } })
    const { data, removed } = stripMetadata(jpeg, 'image/jpeg')
    expect(removed).toBeGreaterThan(0)
    expect(readExif(data).tags).toEqual([])
    expect(readExif(data).location).toBeUndefined()
  })

  it('leaves the image data byte for byte identical', () => {
    // This is the whole point: a canvas would also remove the metadata, and
    // would re-encode every pixel doing it. Verified against a real 5.6 MB
    // photograph as well — same length, same SHA-256.
    const jpeg = jpegWithExif({ make: 'Fujifilm', iso: 800 })
    const { data } = stripMetadata(jpeg, 'image/jpeg')
    expect([...scanData(data)]).toEqual([...scanData(jpeg)])
  })

  it('keeps the file a valid JPEG', () => {
    const { data } = stripMetadata(jpegWithExif({ make: 'Sony' }), 'image/jpeg')
    expect(data[0]).toBe(0xFF)
    expect(data[1]).toBe(0xD8)
    expect(data.at(-2)).toBe(0xFF)
    expect(data.at(-1)).toBe(0xD9)
  })

  it('is smaller than it started, and reports by how much', () => {
    const jpeg = jpegWithExif({ make: 'Panasonic', model: 'GH6', taken: '2026:01:01 00:00:00' })
    const { data, removed } = stripMetadata(jpeg, 'image/jpeg')
    expect(data.length).toBe(jpeg.length - removed)
  })

  it('removes text and time chunks from a PNG but keeps the pixels', () => {
    const png = buildPng([
      ['IHDR', new Uint8Array(13)],
      ['tEXt', new TextEncoder().encode('Author\0Someone')],
      ['tIME', new Uint8Array(7)],
      ['IDAT', new Uint8Array([1, 2, 3, 4])],
      ['IEND', new Uint8Array(0)],
    ])
    const { data, removed } = stripMetadata(png, 'image/png')
    const types = chunkTypes(data)
    expect(types).toEqual(['IHDR', 'IDAT', 'IEND'])
    expect(removed).toBeGreaterThan(0)
  })

  it('keeps a PNG colour profile, which is not metadata about you', () => {
    const png = buildPng([
      ['IHDR', new Uint8Array(13)],
      ['iCCP', new Uint8Array([9, 9])],
      ['eXIf', new Uint8Array([1, 1])],
      ['IDAT', new Uint8Array([1])],
      ['IEND', new Uint8Array(0)],
    ])
    expect(chunkTypes(stripMetadata(png, 'image/png').data)).toEqual(['IHDR', 'iCCP', 'IDAT', 'IEND'])
  })

  it('passes through a format it does not know how to open safely', () => {
    const bytes = new Uint8Array([1, 2, 3])
    const out = stripMetadata(bytes, 'image/webp')
    expect([...out.data]).toEqual([1, 2, 3])
    expect(out.removed).toBe(0)
  })

  it('does not mangle a file with nothing to remove', () => {
    const png = buildPng([['IHDR', new Uint8Array(13)], ['IDAT', new Uint8Array([7])], ['IEND', new Uint8Array(0)]])
    const { data, removed } = stripMetadata(png, 'image/png')
    expect(removed).toBe(0)
    expect([...data]).toEqual([...png])
  })
})

function buildPng(chunks: [string, Uint8Array][]): Uint8Array {
  const parts: number[] = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
  for (const [type, data] of chunks) {
    const len = data.length
    parts.push((len >>> 24) & 0xFF, (len >>> 16) & 0xFF, (len >>> 8) & 0xFF, len & 0xFF)
    for (const ch of type) parts.push(ch.charCodeAt(0))
    parts.push(...data)
    parts.push(0, 0, 0, 0) // CRC, unread by the stripper since chunks are copied whole
  }
  return new Uint8Array(parts)
}

function chunkTypes(png: Uint8Array): string[] {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const types: string[] = []
  let p = 8
  while (p + 8 <= png.length) {
    const len = view.getUint32(p)
    types.push(String.fromCharCode(png[p + 4]!, png[p + 5]!, png[p + 6]!, png[p + 7]!))
    p += 12 + len
  }
  return types
}
