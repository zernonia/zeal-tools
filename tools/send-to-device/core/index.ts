/**
 * Send to Device — the pure part.
 *
 * Two devices on the same network talk directly over a WebRTC data channel.
 * Nothing here touches the network: this is the wire format they agree on, the
 * chunking, and the arithmetic behind the progress readout. That split is what
 * lets the fiddly parts — framing a header, splitting a file at exact offsets,
 * an ETA that does not jump about — be tested without a second device.
 */

/** What the sender tells the receiver before any bytes arrive. */
export interface FileMeta {
  name: string
  size: number
  type: string
}

/**
 * Data channel messages cap out well below a file's size, so payloads are
 * split. 16 KiB is the size every browser agrees is safe to send in one go —
 * larger messages are fragmented by SCTP and some implementations drop them.
 */
export const CHUNK_SIZE = 16 * 1024

/** What kind of thing the person is holding, for the icon beside its name. */
export type DeviceKind = 'phone' | 'computer'

/** Byte ranges to slice a file into, in order. */
export function chunkRanges(size: number, chunkSize = CHUNK_SIZE): { start: number, end: number }[] {
  if (size < 0 || chunkSize < 1)
    throw new Error('size must not be negative and chunkSize must be positive')

  const ranges: { start: number, end: number }[] = []
  for (let start = 0; start < size; start += chunkSize)
    ranges.push({ start, end: Math.min(start + chunkSize, size) })
  return ranges
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0)
    return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  const rounded = unit === 0 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${units[unit]}`
}

/** 0–1, clamped, and 1 for an empty file so it never reads as stuck. */
export function transferProgress(transferred: number, total: number): number {
  if (total <= 0)
    return 1
  return Math.min(1, Math.max(0, transferred / total))
}

export function formatRate(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0)
    return '—'
  return `${formatBytes(bytesPerSecond)}/s`
}

/**
 * Time left, in words.
 *
 * Deliberately coarse: a per-frame estimate from an instantaneous rate swings
 * wildly on a wifi link, and a number that jerks around reads as broken even
 * when the transfer is healthy.
 */
export function estimateRemaining(transferred: number, total: number, bytesPerSecond: number): string {
  const left = total - transferred
  if (left <= 0)
    return 'done'
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0)
    return 'estimating…'

  const seconds = left / bytesPerSecond
  if (seconds < 5)
    return 'a moment'
  if (seconds < 60)
    return `${Math.round(seconds / 5) * 5} seconds`
  if (seconds < 3600) {
    const minutes = Math.round(seconds / 60)
    return `${minutes} minute${minutes === 1 ? '' : 's'}`
  }
  const hours = Math.round(seconds / 360) / 10
  return `${hours} hour${hours === 1 ? '' : 's'}`
}

/**
 * Average rate over the whole transfer so far.
 *
 * Averaged rather than sampled instantaneously for the same reason the ETA is
 * coarse — and it is the honest figure to show against a total.
 */
export function averageRate(transferred: number, elapsedMs: number): number {
  if (elapsedMs <= 0)
    return 0
  return transferred / (elapsedMs / 1000)
}

const ADJECTIVES = [
  'Amber',
  'Bold',
  'Brave',
  'Bright',
  'Calm',
  'Clever',
  'Copper',
  'Curious',
  'Eager',
  'Gentle',
  'Golden',
  'Happy',
  'Keen',
  'Lucky',
  'Merry',
  'Mellow',
  'Nimble',
  'Noble',
  'Quiet',
  'Rapid',
  'Silver',
  'Sunny',
  'Swift',
  'Witty',
]

const ANIMALS = [
  'Badger',
  'Beacon',
  'Bison',
  'Falcon',
  'Ferret',
  'Finch',
  'Gecko',
  'Heron',
  'Ibex',
  'Jackal',
  'Kestrel',
  'Lynx',
  'Magpie',
  'Marten',
  'Osprey',
  'Otter',
  'Panda',
  'Puffin',
  'Raven',
  'Robin',
  'Sparrow',
  'Tapir',
  'Walrus',
  'Wombat',
]

/**
 * A short, human-sayable name for this device.
 *
 * Devices on a network are listed to each other by name, so the name has to be
 * checkable at a glance and easy to say across a room — an address means
 * nothing to most people and a random string cannot be read aloud.
 *
 * 576 combinations: plenty to tell apart the handful of devices in one place,
 * and far too few to identify anybody. It is regenerated every visit rather
 * than stored, so it follows nobody around.
 */
export function deviceAlias(random: () => number = Math.random): string {
  const adjective = ADJECTIVES[Math.floor(random() * ADJECTIVES.length)] ?? ADJECTIVES[0]!
  const animal = ANIMALS[Math.floor(random() * ANIMALS.length)] ?? ANIMALS[0]!
  return `${adjective} ${animal}`
}
