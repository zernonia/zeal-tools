import { describe, expect, it } from 'vitest'
import { encodeSize, fixWebmDuration, patchWebmDuration } from './webm'

// ---------------------------------------------------------------------------
// A tiny EBML writer and an independent reader, written separately from the
// code under test so a shared misunderstanding cannot pass both ways.
// ---------------------------------------------------------------------------

function idBytes(id: number): number[] {
  const out: number[] = []
  let rest = id
  while (rest > 0) {
    out.unshift(rest & 0xFF)
    rest = Math.floor(rest / 256)
  }
  return out
}

/** A size vint of a forced width; width 8 with value null is "unknown". */
function sizeBytes(value: number | null, width: number): number[] {
  if (value === null)
    return [(0x80 >> (width - 1)) | (0xFF >> width), ...Array.from<number>({ length: width - 1 }).fill(0xFF)]
  const out = Array.from<number>({ length: width }).fill(0)
  let rest = value
  for (let i = width - 1; i >= 0; i--) {
    out[i] = rest % 256
    rest = Math.floor(rest / 256)
  }
  out[0]! |= 0x80 >> (width - 1)
  return out
}

function el(id: number, payload: number[], width = 1, unknown = false): number[] {
  return [...idBytes(id), ...sizeBytes(unknown ? null : payload.length, width), ...payload]
}

function u(value: number, length: number): number[] {
  const out = Array.from<number>({ length }).fill(0)
  let rest = value
  for (let i = length - 1; i >= 0; i--) {
    out[i] = rest % 256
    rest = Math.floor(rest / 256)
  }
  return out
}

const ascii = (text: string) => [...text].map(c => c.charCodeAt(0))

const EBML_HEADER = el(0x1A45DFA3, [
  ...el(0x4286, [1]), // EBMLVersion
  ...el(0x4282, ascii('webm')), // DocType
])
const TRACKS = el(0x1654AE6B, el(0xAE, [...el(0xD7, [1]), ...el(0x83, [1])]))
const CLUSTER = el(0x1F43B675, [...el(0xE7, [0]), ...el(0xA3, [0x81, 0, 0, 0x80, 1, 2, 3, 4])], 8, true)

interface InfoOptions {
  scale?: number
  duration?: { size: 4 | 8, value: number }
  sizeWidth?: number
  padding?: number
}

function info({ scale = 1_000_000, duration, sizeWidth = 1, padding = 0 }: InfoOptions = {}): number[] {
  const payload = [
    ...el(0x2AD7B1, u(scale, 4)),
    ...el(0x4D80, ascii('Chrome')),
    ...el(0x5741, ascii('Chrome')),
  ]
  if (padding)
    payload.push(...el(0x7BA9, Array.from<number>({ length: padding }).fill(0x61))) // Title
  if (duration) {
    const bytes = new Uint8Array(duration.size)
    const view = new DataView(bytes.buffer)
    if (duration.size === 8)
      view.setFloat64(0, duration.value)
    else
      view.setFloat32(0, duration.value)
    payload.push(...el(0x4489, [...bytes]))
  }
  return el(0x1549A966, payload, sizeWidth)
}

function webm(segmentChildren: number[], segmentSize: 'unknown' | 'known' = 'unknown'): Uint8Array {
  const segment = segmentSize === 'unknown'
    ? el(0x18538067, segmentChildren, 8, true)
    : el(0x18538067, segmentChildren, 8)
  return new Uint8Array([...EBML_HEADER, ...segment])
}

// --- the independent reader -------------------------------------------------

interface Node { id: number, offset: number, dataOffset: number, size: number | null, children?: Node[] }

function vint(bytes: Uint8Array, pos: number, keepMarker: boolean) {
  const first = bytes[pos]!
  let length = 1
  while (length <= 8 && !(first & (1 << (8 - length))))
    length++
  let value = keepMarker ? first : first & ((1 << (8 - length)) - 1)
  let ones = value === (1 << (8 - length)) - 1
  for (let i = 1; i < length; i++) {
    value = value * 256 + bytes[pos + i]!
    ones = ones && bytes[pos + i] === 0xFF
  }
  return { value, length, unknown: !keepMarker && ones }
}

const MASTERS = new Set([0x18538067, 0x1549A966, 0x114D9B74, 0x4DBB, 0x1654AE6B, 0xAE])

function parse(bytes: Uint8Array, from: number, to: number): Node[] {
  const nodes: Node[] = []
  let pos = from
  while (pos < to) {
    const id = vint(bytes, pos, true)
    const size = vint(bytes, pos + id.length, false)
    const dataOffset = pos + id.length + size.length
    const length = size.unknown ? to - dataOffset : size.value
    const node: Node = { id: id.value, offset: pos, dataOffset, size: size.unknown ? null : size.value }
    // Unknown-size elements run to the end of their parent; for the Segment
    // that is the end of the file. Stop descending into clusters.
    if (MASTERS.has(id.value))
      node.children = parse(bytes, dataOffset, dataOffset + length)
    nodes.push(node)
    pos = dataOffset + length
  }
  return nodes
}

function find(nodes: Node[], ...path: number[]): Node | undefined {
  let level = nodes
  let found: Node | undefined
  for (const id of path) {
    found = level.find(n => n.id === id)
    if (!found)
      return undefined
    level = found.children ?? []
  }
  return found
}

function durationOf(file: Uint8Array): number | undefined {
  const node = find(parse(file, 0, file.length), 0x18538067, 0x1549A966, 0x4489)
  if (!node)
    return undefined
  const view = new DataView(file.buffer, file.byteOffset + node.dataOffset, node.size!)
  return node.size === 8 ? view.getFloat64(0) : view.getFloat32(0)
}

const tail = (file: Uint8Array, length: number) => [...file.subarray(file.length - length)]

// ---------------------------------------------------------------------------

describe('fixWebmDuration', () => {
  it('inserts a Duration into Info when MediaRecorder left it out', () => {
    const file = webm([...info(), ...TRACKS, ...CLUSTER])
    expect(durationOf(file)).toBeUndefined()

    const fixed = fixWebmDuration(file, 83_250)!
    expect(fixed).not.toBeNull()
    expect(durationOf(fixed)).toBe(83_250)
    expect(fixed.length).toBe(file.length + 11)
    // Tracks and the cluster are carried through byte for byte.
    expect(tail(fixed, TRACKS.length + CLUSTER.length)).toEqual([...TRACKS, ...CLUSTER])
  })

  it('keeps the other Info fields intact', () => {
    const fixed = fixWebmDuration(webm([...info(), ...TRACKS]), 1000)!
    const infoNode = find(parse(fixed, 0, fixed.length), 0x18538067, 0x1549A966)!
    expect(infoNode.children!.map(c => c.id)).toEqual([0x2AD7B1, 0x4D80, 0x5741, 0x4489])
  })

  it('writes the duration in TimecodeScale units, not always milliseconds', () => {
    // A scale of 1,000 ns makes one tick a microsecond.
    const fixed = fixWebmDuration(webm([...info({ scale: 1000 }), ...TRACKS]), 2500)!
    expect(durationOf(fixed)).toBe(2_500_000)
  })

  it('overwrites an existing 8-byte Duration in place', () => {
    const file = webm([...info({ duration: { size: 8, value: 12 } }), ...TRACKS, ...CLUSTER])
    const fixed = fixWebmDuration(file, 61_000)!
    expect(fixed.length).toBe(file.length)
    expect(durationOf(fixed)).toBe(61_000)
  })

  it('overwrites an existing 4-byte Duration in place', () => {
    const file = webm([...info({ duration: { size: 4, value: 0 } }), ...TRACKS])
    const fixed = fixWebmDuration(file, 4096)!
    expect(fixed.length).toBe(file.length)
    expect(durationOf(fixed)).toBe(4096)
  })

  it('keeps a wide Info size field at its width', () => {
    const file = webm([...info({ sizeWidth: 8 }), ...TRACKS])
    const fixed = fixWebmDuration(file, 500)!
    expect(fixed.length).toBe(file.length + 11)
    expect(durationOf(fixed)).toBe(500)
  })

  it('widens a one-byte Info size that the extra element overflows', () => {
    // A payload of 120 bytes fits a one-byte size (max 126); 131 does not.
    const base = info().length - 5 // payload of the default Info (4-byte ID, 1-byte size)
    const file = webm([...info({ padding: 120 - base - 3 }), ...TRACKS])
    const before = find(parse(file, 0, file.length), 0x18538067, 0x1549A966)!
    expect(before.size).toBe(120)

    const fixed = fixWebmDuration(file, 9000)!
    expect(fixed.length).toBe(file.length + 12)
    expect(durationOf(fixed)).toBe(9000)
    expect(tail(fixed, TRACKS.length)).toEqual(TRACKS)
  })

  it('updates a known Segment size', () => {
    const file = webm([...info(), ...TRACKS], 'known')
    const fixed = fixWebmDuration(file, 1234)!
    const segment = find(parse(fixed, 0, fixed.length), 0x18538067)!
    expect(segment.size).toBe(fixed.length - segment.dataOffset)
    expect(durationOf(fixed)).toBe(1234)
  })

  it('shifts SeekHead positions that point past Info', () => {
    // SeekHead → Info, Tracks. Positions are relative to the Segment payload.
    const seekHeadFor = (infoPos: number, tracksPos: number) => el(0x114D9B74, [
      ...el(0x4DBB, [...el(0x53AB, idBytes(0x1549A966)), ...el(0x53AC, u(infoPos, 4))]),
      ...el(0x4DBB, [...el(0x53AB, idBytes(0x1654AE6B)), ...el(0x53AC, u(tracksPos, 4))]),
    ])
    const probe = seekHeadFor(0, 0)
    const infoBytes = info()
    const seekHead = seekHeadFor(probe.length, probe.length + infoBytes.length)
    const file = webm([...seekHead, ...infoBytes, ...TRACKS])
    const fixed = fixWebmDuration(file, 777)!

    const segment = find(parse(fixed, 0, fixed.length), 0x18538067)!
    const seeks = find(segment.children!, 0x114D9B74)!.children!
    const positions = seeks.map((seek) => {
      const pos = seek.children!.find(c => c.id === 0x53AC)!
      return [...fixed.subarray(pos.dataOffset, pos.dataOffset + pos.size!)].reduce((n, b) => n * 256 + b, 0)
    })
    const at = (rel: number) => vint(fixed, segment.dataOffset + rel, true).value
    expect(at(positions[0]!)).toBe(0x1549A966)
    expect(at(positions[1]!)).toBe(0x1654AE6B)
    expect(durationOf(fixed)).toBe(777)
  })

  it('refuses what is not a WebM', () => {
    expect(fixWebmDuration(new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70]), 1000)).toBeNull()
    expect(fixWebmDuration(new Uint8Array(), 1000)).toBeNull()
  })

  it('refuses a nonsense duration', () => {
    const file = webm([...info(), ...TRACKS])
    expect(fixWebmDuration(file, 0)).toBeNull()
    expect(fixWebmDuration(file, Number.NaN)).toBeNull()
    expect(fixWebmDuration(file, -5)).toBeNull()
  })

  it('gives up when an unknown-size element comes before Info', () => {
    const file = webm([...CLUSTER, ...info()])
    expect(fixWebmDuration(file, 1000)).toBeNull()
  })
})

describe('patchWebmDuration', () => {
  it('needs only the start of the file and says how much it replaces', () => {
    const file = webm([...info(), ...TRACKS, ...CLUSTER])
    const head = file.subarray(0, file.length - CLUSTER.length)
    const patch = patchWebmDuration(head, 3000)!
    expect(patch.consumed).toBe(file.length - TRACKS.length - CLUSTER.length)
    const glued = new Uint8Array([...patch.bytes, ...file.subarray(patch.consumed)])
    expect(durationOf(glued)).toBe(3000)
  })

  it('returns null when the head stops before Info ends', () => {
    const file = webm([...info(), ...TRACKS])
    expect(patchWebmDuration(file.subarray(0, EBML_HEADER.length + 20), 1000)).toBeNull()
  })
})

describe('encodeSize', () => {
  it('encodes vints with the marker bit', () => {
    expect([...encodeSize(8, 1)!]).toEqual([0x88])
    expect([...encodeSize(127 + 4, 2)!]).toEqual([0x40, 0x83])
    expect([...encodeSize(1, 8)!]).toEqual([0x01, 0, 0, 0, 0, 0, 0, 1])
  })

  it('refuses a value that does not fit, including the reserved all-ones', () => {
    expect(encodeSize(127, 1)).toBeNull()
    expect(encodeSize(126, 1)).not.toBeNull()
    expect(encodeSize(-1, 2)).toBeNull()
  })
})
