import { describe, expect, it } from 'vitest'
import { crc32, createZip } from './zip'

const enc = (s: string) => new TextEncoder().encode(s)

/**
 * Read an archive back using only its own central directory.
 *
 * Written independently of the writer so the two have to agree on offsets and
 * lengths: a self-consistent-but-wrong archive fails here. The output has also
 * been checked against the system `unzip`, which reports no errors and returns
 * every entry byte for byte.
 */
function readZip(zip: Uint8Array) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  const eocd = zip.length - 22
  expect(view.getUint32(eocd, true)).toBe(0x06054B50)
  const count = view.getUint16(eocd + 10, true)
  let p = view.getUint32(eocd + 16, true)

  const entries: { name: string, data: Uint8Array, crc: number }[] = []
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(p, true)).toBe(0x02014B50)
    const crc = view.getUint32(p + 16, true)
    const size = view.getUint32(p + 24, true)
    const nameLen = view.getUint16(p + 28, true)
    const local = view.getUint32(p + 42, true)
    const name = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nameLen))

    expect(view.getUint32(local, true)).toBe(0x04034B50)
    const localNameLen = view.getUint16(local + 26, true)
    const extraLen = view.getUint16(local + 28, true)
    const start = local + 30 + localNameLen + extraLen
    entries.push({ name, data: zip.subarray(start, start + size), crc })
    p += 46 + nameLen
  }
  return entries
}

describe('crc32', () => {
  it('matches the standard check value', () => {
    // The canonical CRC-32 test vector.
    expect(crc32(enc('123456789'))).toBe(0xCBF43926)
  })

  it('is zero for no bytes and stable for one', () => {
    expect(crc32(new Uint8Array(0))).toBe(0)
    expect(crc32(new Uint8Array([0]))).toBe(0xD202EF8D)
  })

  it('stays inside 32 unsigned bits', () => {
    for (const data of [enc('a'), enc('zeal.tools'), new Uint8Array([255, 255, 255])]) {
      expect(crc32(data)).toBeGreaterThanOrEqual(0)
      expect(crc32(data)).toBeLessThanOrEqual(0xFFFFFFFF)
    }
  })
})

describe('createZip', () => {
  it('round-trips names and contents', () => {
    const zip = createZip([
      { name: 'hello.txt', data: enc('Hello, zeal.') },
      { name: 'nested/data.bin', data: new Uint8Array([0, 1, 2, 253, 254, 255]) },
    ])
    const back = readZip(zip)
    expect(back.map(e => e.name)).toEqual(['hello.txt', 'nested/data.bin'])
    expect(new TextDecoder().decode(back[0]!.data)).toBe('Hello, zeal.')
    expect([...back[1]!.data]).toEqual([0, 1, 2, 253, 254, 255])
  })

  it('records a CRC the reader can check', () => {
    const zip = createZip([{ name: 'a.bin', data: enc('payload') }])
    const [entry] = readZip(zip)
    expect(entry!.crc).toBe(crc32(enc('payload')))
  })

  it('handles an empty file', () => {
    const back = readZip(createZip([{ name: 'empty.txt', data: new Uint8Array(0) }]))
    expect(back[0]!.data.length).toBe(0)
    expect(back[0]!.crc).toBe(0)
  })

  it('handles an empty archive', () => {
    const zip = createZip([])
    expect(zip.length).toBe(22)
    expect(readZip(zip)).toEqual([])
  })

  it('survives bytes that are not text', () => {
    // Store mode must not touch the payload, including bytes that look like
    // the format's own signatures.
    const nasty = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0x50, 0x4B, 0x05, 0x06])
    const back = readZip(createZip([{ name: 'sig.bin', data: nasty }]))
    expect([...back[0]!.data]).toEqual([...nasty])
  })

  it('keeps non-ASCII names readable', () => {
    const back = readZip(createZip([{ name: 'café/日本.txt', data: enc('x') }]))
    expect(back[0]!.name).toBe('café/日本.txt')
  })

  it('writes the modification time it was given', () => {
    const zip = createZip([{ name: 'a', data: enc('b') }], new Date(2026, 7, 20, 12, 30, 0))
    const view = new DataView(zip.buffer)
    // 2026-08-20 packed as MS-DOS date: ((2026-1980)<<9)|(8<<5)|20
    expect(view.getUint16(12, true)).toBe(((2026 - 1980) << 9) | (8 << 5) | 20)
  })

  it('is deterministic, so the same input gives the same archive', () => {
    const make = () => createZip([{ name: 'a.txt', data: enc('same') }])
    expect([...make()]).toEqual([...make()])
  })
})
