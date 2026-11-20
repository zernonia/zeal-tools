/**
 * Give a MediaRecorder WebM file a duration, so players can seek in it.
 *
 * MediaRecorder writes WebM as a live stream: it starts the file before it
 * knows how long the recording will be, and never goes back. So the Segment
 * Info carries no Duration element, and Chrome's and Firefox's own players —
 * and VLC, and most editors — show the length as unknown and refuse to seek,
 * or only seek through what they have already buffered. This is the
 * well-known "fix-webm-duration" problem, and the fix is to write the
 * Duration element in once the recording has stopped and its length is known.
 *
 * WebM is Matroska, which is EBML: a tree of elements, each an ID, a size and
 * a payload, with IDs and sizes stored as variable-length integers. The
 * Duration lives at Segment › Info › Duration as a float, in units of the
 * file's TimecodeScale (nanoseconds per tick; 1,000,000 by default, which
 * makes the unit milliseconds).
 *
 * Only the start of the file is touched. `patchWebmDuration` reads as far as
 * the end of the Info element — a few hundred bytes in practice — and returns
 * a replacement for that prefix; the caller glues it to the untouched rest.
 * An hour-long recording is never copied into memory to change forty bytes.
 *
 * Inserting the element makes Info, and the Segment around it, longer, so
 * their sizes are rewritten. MediaRecorder writes the Segment with "unknown"
 * size, which needs no change; a known size is updated in place. If the file
 * has a SeekHead before Info, its positions for anything after Info are
 * shifted to match. Cues, which would also hold positions, are not written
 * by MediaRecorder; in a file that has them after Info, inserting would
 * leave their offsets short, so a file whose Duration already exists is
 * always patched in place and never shifted at all.
 */

const ID = {
  EBML: 0x1A45DFA3,
  Segment: 0x18538067,
  SeekHead: 0x114D9B74,
  Seek: 0x4DBB,
  SeekPosition: 0x53AC,
  Info: 0x1549A966,
  TimecodeScale: 0x2AD7B1,
  Duration: 0x4489,
} as const

/** Matroska's default: one tick is a millisecond. */
const DEFAULT_TIMECODE_SCALE = 1_000_000

/** Enough of the file to hold the headers, SeekHead and Info many times over. */
export const WEBM_HEAD_BYTES = 256 * 1024

interface ElementHeader {
  id: number
  /** Offset of the ID's first byte. */
  start: number
  /** Width of the size field, in bytes. */
  sizeWidth: number
  /** Offset of the payload's first byte. */
  dataStart: number
  /** Payload length, or null for EBML's "unknown size". */
  size: number | null
}

/** Leading zero bits of a byte, plus one: how many bytes a vint starting with it spans. */
function vintWidth(first: number, max: number): number {
  for (let width = 1; width <= max; width++) {
    if (first & (0x80 >> (width - 1)))
      return width
  }
  return 0
}

function readId(bytes: Uint8Array, pos: number): { id: number, width: number } | null {
  if (pos >= bytes.length)
    return null
  const width = vintWidth(bytes[pos]!, 4)
  if (!width || pos + width > bytes.length)
    return null
  let id = 0
  for (let i = 0; i < width; i++)
    id = id * 256 + bytes[pos + i]!
  return { id, width }
}

function readSize(bytes: Uint8Array, pos: number): { size: number | null, width: number } | null {
  if (pos >= bytes.length)
    return null
  const width = vintWidth(bytes[pos]!, 8)
  if (!width || pos + width > bytes.length)
    return null
  // The marker bit is not part of the value.
  let value = bytes[pos]! & (0xFF >> width)
  let allOnes = value === (0xFF >> width)
  for (let i = 1; i < width; i++) {
    const byte = bytes[pos + i]!
    value = value * 256 + byte
    allOnes &&= byte === 0xFF
  }
  return { size: allOnes ? null : value, width }
}

function readHeader(bytes: Uint8Array, pos: number): ElementHeader | null {
  const id = readId(bytes, pos)
  if (!id)
    return null
  const size = readSize(bytes, pos + id.width)
  if (!size)
    return null
  return { id: id.id, start: pos, sizeWidth: size.width, dataStart: pos + id.width + size.width, size: size.size }
}

/** The largest value a size vint of this width can hold; all-ones is reserved for "unknown". */
const maxForWidth = (width: number) => 2 ** (7 * width) - 2

/** Encode an EBML size in exactly `width` bytes, or null if it does not fit. */
export function encodeSize(value: number, width: number): Uint8Array | null {
  if (width < 1 || width > 8 || !Number.isInteger(value) || value < 0 || value > maxForWidth(width))
    return null
  const out = new Uint8Array(width)
  let rest = value
  for (let i = width - 1; i >= 0; i--) {
    out[i] = rest % 256
    rest = Math.floor(rest / 256)
  }
  out[0]! |= 0x80 >> (width - 1)
  return out
}

function minimalSizeWidth(value: number): number {
  let width = 1
  while (value > maxForWidth(width))
    width++
  return width
}

function readUint(bytes: Uint8Array, start: number, length: number): number {
  let value = 0
  for (let i = 0; i < length; i++)
    value = value * 256 + bytes[start + i]!
  return value
}

function writeUint(bytes: Uint8Array, start: number, length: number, value: number): boolean {
  if (value < 0 || value >= 2 ** (8 * length))
    return false
  let rest = value
  for (let i = length - 1; i >= 0; i--) {
    bytes[start + i] = rest % 256
    rest = Math.floor(rest / 256)
  }
  return true
}

/** Children of an element whose payload lies wholly inside `bytes`. */
function children(bytes: Uint8Array, from: number, to: number): ElementHeader[] | null {
  const list: ElementHeader[] = []
  let pos = from
  while (pos < to) {
    const child = readHeader(bytes, pos)
    if (!child || child.size === null || child.dataStart + child.size > to)
      return null
    list.push(child)
    pos = child.dataStart + child.size
  }
  return list
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let pos = 0
  for (const part of parts) {
    out.set(part, pos)
    pos += part.length
  }
  return out
}

export interface WebmPatch {
  /** Replacement for the first `consumed` bytes of the file. */
  bytes: Uint8Array
  /** How many bytes of the original the replacement stands for. */
  consumed: number
}

/**
 * Write `durationMs` into a WebM file's Segment Info.
 *
 * `head` is the start of the file — the whole file works too. Returns the
 * patched prefix and how much of the original it replaces, or null when the
 * bytes are not a WebM this can safely change: not EBML, no Segment, Info
 * not found before the first element of unknown size, or `head` too short to
 * reach the end of Info. Null means "leave the file as it is", which is
 * always safe — it plays, it just cannot seek.
 */
export function patchWebmDuration(head: Uint8Array, durationMs: number): WebmPatch | null {
  if (!Number.isFinite(durationMs) || durationMs <= 0)
    return null

  const ebml = readHeader(head, 0)
  if (!ebml || ebml.id !== ID.EBML || ebml.size === null)
    return null

  const segment = readHeader(head, ebml.dataStart + ebml.size)
  if (!segment || segment.id !== ID.Segment)
    return null

  // Walk the Segment's top-level children until Info. Everything before it
  // must have a known size, or there is no way to step over it.
  let seekHead: ElementHeader | null = null
  let info: ElementHeader | null = null
  let pos = segment.dataStart
  while (!info) {
    const child = readHeader(head, pos)
    if (!child || child.size === null)
      return null
    if (child.id === ID.Info)
      info = child
    else if (child.id === ID.SeekHead)
      seekHead = child
    pos = child.dataStart + child.size
    if (pos > head.length)
      return null
  }
  const infoSize = info.size!
  const infoEnd = info.dataStart + infoSize

  const fields = children(head, info.dataStart, infoEnd)
  if (!fields)
    return null
  const scaleField = fields.find(f => f.id === ID.TimecodeScale)
  const scale = scaleField && scaleField.size! > 0 && scaleField.size! <= 8
    ? readUint(head, scaleField.dataStart, scaleField.size!)
    : DEFAULT_TIMECODE_SCALE
  if (!(scale > 0))
    return null
  const ticks = (durationMs * 1_000_000) / scale

  // Already present (Firefox sometimes writes one, a re-saved file will):
  // overwrite the float where it sits. Nothing moves, nothing else changes.
  const existing = fields.find(f => f.id === ID.Duration)
  if (existing) {
    const out = head.slice(0, infoEnd)
    const view = new DataView(out.buffer, out.byteOffset, out.byteLength)
    if (existing.size === 8)
      view.setFloat64(existing.dataStart, ticks)
    else if (existing.size === 4)
      view.setFloat32(existing.dataStart, ticks)
    else
      return null
    return { bytes: out, consumed: infoEnd }
  }

  // Insert ID 0x4489, size 8 (one-byte vint 0x88), then the float64.
  const duration = new Uint8Array(11)
  duration.set([0x44, 0x89, 0x88])
  new DataView(duration.buffer).setFloat64(3, ticks)

  const newInfoSize = infoSize + duration.length
  // Keep the size field's width where possible, so nothing after Info moves
  // further than the element itself grew.
  const infoSizeBytes = encodeSize(newInfoSize, info.sizeWidth) ?? encodeSize(newInfoSize, minimalSizeWidth(newInfoSize))!
  const infoIdBytes = head.subarray(info.start, info.start + (info.dataStart - info.sizeWidth - info.start))
  const delta = (infoIdBytes.length + infoSizeBytes.length + newInfoSize) - (infoEnd - info.start)

  let segmentSizeBytes = head.subarray(segment.dataStart - segment.sizeWidth, segment.dataStart)
  if (segment.size !== null) {
    const resized = encodeSize(segment.size + delta, segment.sizeWidth)
    if (!resized)
      return null
    segmentSizeBytes = resized
  }

  // Everything between the Segment's payload start and Info, with any
  // SeekHead positions past Info shifted by how much Info grew. Positions are
  // relative to the Segment's payload, which itself does not move: the
  // Segment's size field keeps its width.
  const between = head.slice(segment.dataStart, info.start)
  if (seekHead && delta) {
    const infoPosition = info.start - segment.dataStart
    const base = segment.dataStart
    const seeks = children(head, seekHead.dataStart, seekHead.dataStart + seekHead.size!)
    if (!seeks)
      return null
    for (const seek of seeks.filter(s => s.id === ID.Seek)) {
      const entries = children(head, seek.dataStart, seek.dataStart + seek.size!)
      if (!entries)
        return null
      for (const entry of entries.filter(e => e.id === ID.SeekPosition)) {
        const value = readUint(head, entry.dataStart, entry.size!)
        if (value > infoPosition && !writeUint(between, entry.dataStart - base, entry.size!, value + delta))
          return null
      }
    }
  }

  const bytes = concat([
    head.subarray(0, segment.start),
    head.subarray(segment.start, segment.dataStart - segment.sizeWidth),
    segmentSizeBytes,
    between,
    infoIdBytes,
    infoSizeBytes,
    head.subarray(info.dataStart, infoEnd),
    duration,
  ])
  return { bytes, consumed: infoEnd }
}

/**
 * The whole-file form: the fixed file, or null if it could not be fixed.
 * Convenient for tests and small files; the browser uses the prefix form.
 */
export function fixWebmDuration(file: Uint8Array, durationMs: number): Uint8Array | null {
  const patch = patchWebmDuration(file, durationMs)
  if (!patch)
    return null
  return concat([patch.bytes, file.subarray(patch.consumed)])
}
