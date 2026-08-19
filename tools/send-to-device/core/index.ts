import { encodeQr } from '../../../shared/core/qr'

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

/**
 * A connection offer or answer, encoded for a QR code.
 *
 * Kept as plain JSON rather than compressed: a full offer measured 716 bytes,
 * and a QR carries 2953, so the density saving is not worth a format the other
 * side has to decode before it can even connect.
 */
export function encodeSignal(description: { type: string, sdp: string }): string {
  return JSON.stringify({ t: description.type, s: description.sdp })
}

export function decodeSignal(text: string): { type: string, sdp: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  }
  catch {
    throw new Error('That code is not from this tool.')
  }

  const value = parsed as { t?: unknown, s?: unknown }
  if (typeof value.t !== 'string' || typeof value.s !== 'string')
    throw new Error('That code is not from this tool.')
  if (value.t !== 'offer' && value.t !== 'answer')
    throw new Error('That code is neither an offer nor an answer.')

  return { type: value.t, sdp: value.s }
}

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

/**
 * URL-safe base64, for carrying an offer in a link.
 *
 * The offer is shown as a QR containing a normal https link, so a phone reads
 * it with the camera app it already has and lands on the page ready to send —
 * no camera permission, no in-page scanner, and nothing to download. That only
 * works if the payload survives a URL fragment, hence the `+/=` swap.
 */
export function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes)
    binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
    + '='.repeat((4 - (encoded.length % 4)) % 4)
  let binary: string
  try {
    binary = atob(padded)
  }
  catch {
    throw new Error('That link is incomplete or damaged.')
  }
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/**
 * Draw a payload as a plain black-on-white QR, using our own encoder.
 *
 * Deliberately unstyled — this code exists to be read by a camera in one go,
 * often across a room, so contrast and quiet zone matter and decoration does
 * not. Error correction starts at L because these payloads are long and the
 * capacity is better spent on the payload; `boostEc` then raises it for free
 * whenever the chosen version has room to spare.
 */
export function qrSvg(text: string): string {
  const qr = encodeQr(text, { ecLevel: 'L', boostEc: true })
  const quiet = 4
  const span = qr.size + quiet * 2

  let path = ''
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.modules[y * qr.size + x] === 1)
        path += `M${x + quiet} ${y + quiet}h1v1h-1z`
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${span} ${span}" shape-rendering="crispEdges">`
    + `<rect width="${span}" height="${span}" fill="#fff"/>`
    + `<path d="${path}" fill="#000"/>`
    + `</svg>`
}
