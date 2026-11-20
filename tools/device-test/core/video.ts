/**
 * Webcam test helpers: measured frame rate, readable capabilities and
 * resolution names. The browser hands us numbers and loosely typed
 * capability objects; this turns them into something a person can read.
 */

/**
 * Frames per second over the last `windowMs`, from frame timestamps in
 * milliseconds (oldest first). Uses the span between the first and last frame
 * in the window rather than the window length, so a camera that has only just
 * started is not reported as slow.
 */
export function measuredFps(timestamps: readonly number[], windowMs = 1000): number {
  if (timestamps.length < 2)
    return 0
  const end = timestamps[timestamps.length - 1]!
  const recent = timestamps.filter(t => t >= end - windowMs)
  if (recent.length < 2)
    return 0
  const span = end - recent[0]!
  return span > 0 ? ((recent.length - 1) * 1000) / span : 0
}

/** Drop timestamps older than `keepMs` before the newest, so the list stays short. */
export function trimTimestamps(timestamps: number[], keepMs = 2000): number[] {
  if (!timestamps.length)
    return timestamps
  const end = timestamps[timestamps.length - 1]!
  const first = timestamps.findIndex(t => t >= end - keepMs)
  return first > 0 ? timestamps.slice(first) : timestamps
}

/** The common name for a frame size, if it has one. */
export function resolutionName(width: number, height: number): string {
  const short = Math.min(width, height)
  const long = Math.max(width, height)
  const named: [number, number, string][] = [
    [3840, 2160, '4K UHD'],
    [2560, 1440, '1440p QHD'],
    [1920, 1080, '1080p Full HD'],
    [1280, 720, '720p HD'],
    [960, 540, '540p'],
    [640, 480, '480p VGA'],
    [640, 360, '360p'],
    [320, 240, 'QVGA'],
  ]
  const match = named.find(([w, h]) => w === long && h === short)
  return match ? match[2] : ''
}

/** Width:height reduced to its smallest whole-number form, e.g. 16:9. */
export function aspectRatio(width: number, height: number): string {
  if (!width || !height)
    return ''
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
  const d = gcd(Math.round(width), Math.round(height))
  const w = Math.round(width) / d
  const h = Math.round(height) / d
  // 854×480 and friends reduce to ugly fractions like 427:240; a decimal reads better.
  return w > 32 || h > 32 ? `${(width / height).toFixed(2)}:1` : `${w}:${h}`
}

/**
 * One entry of `MediaStreamTrack.getCapabilities()` as text. Values arrive as
 * ranges (`{ min, max, step }`), lists of strings, booleans or plain values.
 */
export function formatCapability(value: unknown): string {
  if (value === null || value === undefined)
    return '—'
  if (Array.isArray(value))
    return value.length ? value.map(String).join(', ') : '—'
  if (typeof value === 'boolean')
    return value ? 'Yes' : 'No'
  if (typeof value === 'number')
    return formatNumber(value)
  if (typeof value === 'object') {
    const range = value as { min?: number, max?: number, step?: number }
    if (typeof range.min === 'number' || typeof range.max === 'number') {
      const min = typeof range.min === 'number' ? formatNumber(range.min) : '?'
      const max = typeof range.max === 'number' ? formatNumber(range.max) : '?'
      return min === max ? min : `${min} – ${max}`
    }
    return '—'
  }
  return String(value)
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

/** Capability names made readable: `whiteBalanceMode` → "White balance mode". */
export function capabilityLabel(name: string): string {
  const special: Record<string, string> = {
    deviceId: 'Device ID',
    groupId: 'Group ID',
    frameRate: 'Frame rate (fps)',
    width: 'Width (px)',
    height: 'Height (px)',
    aspectRatio: 'Aspect ratio',
    facingMode: 'Facing',
    resizeMode: 'Resize mode',
  }
  if (special[name])
    return special[name]
  const words = name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Capability keys not worth listing: IDs are noise to a person reading them. */
export const HIDDEN_CAPABILITIES = new Set(['deviceId', 'groupId'])

/** The frame sizes the resolution picker asks for. `ideal`, never `exact`. */
export const RESOLUTION_REQUESTS = [
  { id: 'default', label: 'Browser default', width: 0, height: 0 },
  { id: '720p', label: '720p (1280 × 720)', width: 1280, height: 720 },
  { id: '1080p', label: '1080p (1920 × 1080)', width: 1920, height: 1080 },
  { id: '4k', label: '4K (3840 × 2160)', width: 3840, height: 2160 },
] as const

export type ResolutionRequest = typeof RESOLUTION_REQUESTS[number]['id']

/** A safe download name for a snapshot. */
export function snapshotFilename(width: number, height: number, date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `webcam-${width}x${height}-${stamp}.png`
}

/**
 * The short quality grade for the badge on the preview, by the frame's
 * shorter side, so a portrait phone camera grades the same as landscape.
 */
export function qualityGrade(width: number, height: number): string {
  const short = Math.min(width, height)
  if (!short)
    return ''
  if (short >= 2160)
    return '4K'
  if (short >= 1440)
    return 'QHD'
  if (short >= 1080)
    return 'Full HD'
  if (short >= 720)
    return 'HD'
  return 'SD'
}

export type FpsVerdict = 'smooth' | 'fine' | 'choppy'

/**
 * How a measured frame rate will look on a call. Under 15 fps motion visibly
 * stutters; from 24 it reads as smooth video. Zero means not measured yet.
 */
export function fpsVerdict(fps: number): FpsVerdict | null {
  if (!fps)
    return null
  if (fps >= 24)
    return 'smooth'
  return fps >= 15 ? 'fine' : 'choppy'
}
