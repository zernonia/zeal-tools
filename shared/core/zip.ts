/**
 * A minimal ZIP writer — stored, never deflated.
 *
 * Two tools need to hand back a bundle of files: a batch of compressed images,
 * and a favicon pack. Both bundles are already-compressed binaries, where
 * deflate buys nothing and costs a dependency, so entries are stored verbatim.
 * That keeps this to a container format we can own outright and test.
 *
 * No Zip64: entries and archives here are far below the 4 GiB point where it
 * becomes necessary, and `createZip` throws rather than emitting a file that
 * would silently be wrong.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++)
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

export function crc32(data: Uint8Array): number {
  let c = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++)
    c = CRC_TABLE[(c ^ data[i]!) & 0xFF]! ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

export interface ZipEntry {
  name: string
  data: Uint8Array
}

const MAX = 0xFFFFFFFF

/** MS-DOS packed date and time, which is what the format stores. */
function dosStamp(date: Date): { time: number, date: number } {
  const year = Math.max(1980, date.getFullYear())
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

export function createZip(entries: ZipEntry[], modifiedAt = new Date(1980, 0, 1)): Uint8Array {
  const stamp = dosStamp(modifiedAt)
  const encoder = new TextEncoder()

  const prepared = entries.map((entry) => {
    const name = encoder.encode(entry.name)
    if (entry.data.length > MAX)
      throw new Error(`${entry.name} is too large for a plain ZIP`)
    return { name, data: entry.data, crc: crc32(entry.data) }
  })

  const localSize = prepared.reduce((n, e) => n + 30 + e.name.length + e.data.length, 0)
  const centralSize = prepared.reduce((n, e) => n + 46 + e.name.length, 0)
  if (localSize + centralSize + 22 > MAX)
    throw new Error('Archive is too large for a plain ZIP')

  const out = new Uint8Array(localSize + centralSize + 22)
  const view = new DataView(out.buffer)
  let offset = 0
  const offsets: number[] = []

  for (const entry of prepared) {
    offsets.push(offset)
    view.setUint32(offset, 0x04034B50, true)
    view.setUint16(offset + 4, 20, true) // version needed
    view.setUint16(offset + 6, 0, true) // flags
    view.setUint16(offset + 8, 0, true) // method: stored
    view.setUint16(offset + 10, stamp.time, true)
    view.setUint16(offset + 12, stamp.date, true)
    view.setUint32(offset + 14, entry.crc, true)
    view.setUint32(offset + 18, entry.data.length, true)
    view.setUint32(offset + 22, entry.data.length, true)
    view.setUint16(offset + 26, entry.name.length, true)
    view.setUint16(offset + 28, 0, true) // extra
    out.set(entry.name, offset + 30)
    out.set(entry.data, offset + 30 + entry.name.length)
    offset += 30 + entry.name.length + entry.data.length
  }

  const centralStart = offset
  for (const [i, entry] of prepared.entries()) {
    view.setUint32(offset, 0x02014B50, true)
    view.setUint16(offset + 4, 20, true) // version made by
    view.setUint16(offset + 6, 20, true) // version needed
    view.setUint16(offset + 8, 0, true)
    view.setUint16(offset + 10, 0, true) // stored
    view.setUint16(offset + 12, stamp.time, true)
    view.setUint16(offset + 14, stamp.date, true)
    view.setUint32(offset + 16, entry.crc, true)
    view.setUint32(offset + 20, entry.data.length, true)
    view.setUint32(offset + 24, entry.data.length, true)
    view.setUint16(offset + 28, entry.name.length, true)
    view.setUint16(offset + 30, 0, true) // extra
    view.setUint16(offset + 32, 0, true) // comment
    view.setUint16(offset + 34, 0, true) // disk
    view.setUint16(offset + 36, 0, true) // internal attrs
    view.setUint32(offset + 38, 0, true) // external attrs
    view.setUint32(offset + 42, offsets[i]!, true)
    out.set(entry.name, offset + 46)
    offset += 46 + entry.name.length
  }

  view.setUint32(offset, 0x06054B50, true)
  view.setUint16(offset + 4, 0, true)
  view.setUint16(offset + 6, 0, true)
  view.setUint16(offset + 8, prepared.length, true)
  view.setUint16(offset + 10, prepared.length, true)
  view.setUint32(offset + 12, centralSize, true)
  view.setUint32(offset + 16, centralStart, true)
  view.setUint16(offset + 20, 0, true)

  return out
}
