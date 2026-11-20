/**
 * Everything about a screen recording that is arithmetic or a decision, kept
 * out of the composable so it can be tested without a browser.
 */

export type Container = 'mp4' | 'webm'

export interface RecordingFormat {
  /** What to hand to `new MediaRecorder(stream, { mimeType })`; empty lets the browser choose. */
  mimeType: string
  container: Container
}

/**
 * Formats in order of preference.
 *
 * MP4 first, because it is the file people can actually use: it opens in
 * QuickTime, Windows' Photos app, iMovie, PowerPoint and every phone, where
 * WebM still does not everywhere. Chrome records MP4 from version 126 and
 * Safari has only ever recorded MP4. Firefox records WebM only.
 *
 * Within MP4, the explicit H.264 + AAC string goes first so a browser that
 * would otherwise pick a codec few players read is told which one we want.
 * Within WebM, VP9 compresses screen content noticeably better than VP8 at the
 * same bitrate; VP8 is the fallback for older encoders.
 */
export const FORMAT_CANDIDATES: readonly RecordingFormat[] = [
  { mimeType: 'video/mp4;codecs=avc1,mp4a', container: 'mp4' },
  { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', container: 'mp4' },
  { mimeType: 'video/mp4', container: 'mp4' },
  { mimeType: 'video/webm;codecs=vp9,opus', container: 'webm' },
  { mimeType: 'video/webm;codecs=vp8,opus', container: 'webm' },
  { mimeType: 'video/webm', container: 'webm' },
]

/**
 * Pick the best format this browser can record.
 *
 * Takes the support check as a predicate (`MediaRecorder.isTypeSupported`
 * in the browser) so the choice itself is pure. A predicate that throws is
 * treated as "no" — some engines throw on strings they do not parse. When
 * nothing matches, the empty MIME type lets the recorder use its own default,
 * and the container is read back from `recorder.mimeType` afterwards.
 */
export function pickFormat(isTypeSupported: (mimeType: string) => boolean): RecordingFormat {
  for (const candidate of FORMAT_CANDIDATES) {
    let supported = false
    try {
      supported = isTypeSupported(candidate.mimeType)
    }
    catch {}
    if (supported)
      return candidate
  }
  return { mimeType: '', container: 'webm' }
}

/** Which container a MIME type (as reported by the recorder) names. */
export function containerOf(mimeType: string, fallback: Container = 'webm'): Container {
  const type = mimeType.trim().toLowerCase()
  if (type.startsWith('video/mp4') || type.startsWith('audio/mp4'))
    return 'mp4'
  if (type.startsWith('video/webm') || type.startsWith('audio/webm'))
    return 'webm'
  return fallback
}

// ---------------------------------------------------------------------------
// Quality presets and size estimates
// ---------------------------------------------------------------------------

export type QualityId = 'standard' | 'high' | 'max'

export interface QualityPreset {
  id: QualityId
  label: string
  /** Target video bitrate handed to MediaRecorder. */
  videoBitsPerSecond: number
  hint: string
}

/** Voice and tab audio are well served at this; music barely notices. */
export const AUDIO_BITS_PER_SECOND = 128_000

export const QUALITY_PRESETS: readonly QualityPreset[] = [
  { id: 'standard', label: 'Standard', videoBitsPerSecond: 2_500_000, hint: 'Tutorials, slides and code. Small files.' },
  { id: 'high', label: 'High', videoBitsPerSecond: 5_000_000, hint: 'Sharp text on a 1080p screen, light motion.' },
  { id: 'max', label: 'Very high', videoBitsPerSecond: 10_000_000, hint: 'Video playback, games and fast scrolling.' },
]

export const DEFAULT_QUALITY: QualityId = 'high'

export function presetById(id: string): QualityPreset {
  return QUALITY_PRESETS.find(p => p.id === id) ?? QUALITY_PRESETS.find(p => p.id === DEFAULT_QUALITY)!
}

/**
 * Bytes per minute at a preset's ceiling.
 *
 * A ceiling, not a forecast: the bitrate is a target the encoder may
 * undershoot, and a still screen with a moving cursor comes in far lower
 * than the number. The UI says "up to".
 */
export function bytesPerMinute(preset: QualityPreset, withAudio = true): number {
  const bits = preset.videoBitsPerSecond + (withAudio ? AUDIO_BITS_PER_SECOND : 0)
  return (bits / 8) * 60
}

/** The bitrate a recording has actually run at so far, in bits per second. */
export function observedBitrate(bytes: number, elapsedMs: number): number {
  if (!(bytes > 0) || !(elapsedMs > 0))
    return 0
  return (bytes * 8) / (elapsedMs / 1000)
}

/** How large a recording of `seconds` would be at `bitsPerSecond`. */
export function estimateBytes(bitsPerSecond: number, seconds: number): number {
  if (!(bitsPerSecond > 0) || !(seconds > 0))
    return 0
  return (bitsPerSecond / 8) * seconds
}

/**
 * Below this much recorded, the observed rate is mostly the first keyframe
 * and container overhead, and would overstate the hourly size several times.
 */
export const MIN_OBSERVATION_MS = 5_000

/**
 * The size of an hour at the current pace: the observed rate once there is
 * enough of the recording to measure, the preset's ceiling until then.
 */
export function projectedBytesPerHour(bytes: number, elapsedMs: number, preset: QualityPreset, withAudio = true): number {
  if (elapsedMs >= MIN_OBSERVATION_MS && bytes > 0)
    return estimateBytes(observedBitrate(bytes, elapsedMs), 3600)
  return bytesPerMinute(preset, withAudio) * 60
}

export type MemoryLevel = 'ok' | 'notice' | 'warn'

/** Past here a recording is worth saving and starting afresh soon. */
export const MEMORY_NOTICE_BYTES = 1024 ** 3
/** Past here some browsers, especially on 8 GB machines, start to struggle. */
export const MEMORY_WARN_BYTES = 2 * 1024 ** 3

/**
 * How worried to be about a recording's size.
 *
 * The recording is held by the browser until it is downloaded, so its size
 * is the one real limit on length. Chrome can spill large blobs to disk and
 * often copes well past these figures, but not every browser does and the
 * page cannot ask which kind it is in, so the thresholds are conservative.
 */
export function memoryLevel(bytes: number): MemoryLevel {
  if (bytes >= MEMORY_WARN_BYTES)
    return 'warn'
  if (bytes >= MEMORY_NOTICE_BYTES)
    return 'notice'
  return 'ok'
}

// ---------------------------------------------------------------------------
// Names and clocks
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * `screen-recording-2026-11-20-0905.mp4`, in the visitor's local time.
 *
 * Local, not UTC: the name is for finding the file in Downloads, and a
 * recording made at five past nine should not be called 2205 because of
 * where the visitor happens to live.
 */
export function recordingFileName(date: Date, container: Container): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}`
  return `screen-recording-${day}-${time}.${container}`
}

/** `0:07`, `12:34`, `1:02:03` — the clock people expect on a recorder. */
export function formatElapsed(ms: number): string {
  const total = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}

/**
 * The same clock in words, for a screen reader: "1 minute 5 seconds".
 * Reading "1:05" aloud is ambiguous between minutes and hours.
 */
export function describeElapsed(ms: number): string {
  const total = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0
  const parts: string[] = []
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  if (hours)
    parts.push(unit(hours, 'hour'))
  if (minutes)
    parts.push(unit(minutes, 'minute'))
  if (seconds || !parts.length)
    parts.push(unit(seconds, 'second'))
  return parts.join(' ')
}

/**
 * Recorded time, with pauses left out.
 *
 * Held as closed spans plus the start of an open one, so the clock is
 * always computed from timestamps rather than counted up by a timer — a
 * background tab throttles timers to once a second or worse, and a counted
 * clock would fall behind the recording.
 */
export interface RecordingClock {
  /** Milliseconds already banked from spans that have ended. */
  banked: number
  /** Timestamp the current span started, or null while paused or stopped. */
  runningSince: number | null
}

export const newClock = (): RecordingClock => ({ banked: 0, runningSince: null })

export function clockStart(clock: RecordingClock, now: number): RecordingClock {
  return clock.runningSince === null ? { ...clock, runningSince: now } : clock
}

export function clockPause(clock: RecordingClock, now: number): RecordingClock {
  if (clock.runningSince === null)
    return clock
  return { banked: clock.banked + Math.max(0, now - clock.runningSince), runningSince: null }
}

export function clockElapsed(clock: RecordingClock, now: number): number {
  return clock.banked + (clock.runningSince === null ? 0 : Math.max(0, now - clock.runningSince))
}

// ---------------------------------------------------------------------------
// Can this browser record its screen at all?
// ---------------------------------------------------------------------------

export type Support = 'ok' | 'insecure' | 'mobile' | 'no-display-media' | 'no-recorder'

export interface Environment {
  isSecureContext: boolean
  hasDisplayMedia: boolean
  hasMediaRecorder: boolean
  userAgent: string
  maxTouchPoints: number
}

/** iPadOS reports itself as a Mac; a Mac with five touch points is an iPad. */
export function isMobileDevice(env: Pick<Environment, 'userAgent' | 'maxTouchPoints'>): boolean {
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(env.userAgent))
    return true
  return /Macintosh/.test(env.userAgent) && env.maxTouchPoints > 1
}

/**
 * Decide, from what the browser exposes, whether recording can work.
 *
 * Capability first, device second: if a mobile browser ever ships
 * `getDisplayMedia`, it gets to try rather than being turned away by its
 * user agent. The device only decides which honest message to show when the
 * API is missing — on a phone the useful answer is the phone's own recorder.
 * An insecure page is checked first because there the API is hidden rather
 * than absent, and the fix is the address, not the browser.
 */
export function detectSupport(env: Environment): Support {
  if (!env.isSecureContext)
    return 'insecure'
  if (!env.hasDisplayMedia)
    return isMobileDevice(env) ? 'mobile' : 'no-display-media'
  if (!env.hasMediaRecorder)
    return 'no-recorder'
  return 'ok'
}

// ---------------------------------------------------------------------------
// Explaining a failed capture
// ---------------------------------------------------------------------------

export type CaptureFailure = 'cancelled' | 'system' | 'failed'

export interface CaptureError {
  kind: CaptureFailure
  message: string
}

/**
 * Turn what `getDisplayMedia` threw into something a person can act on.
 *
 * Chrome throws `NotAllowedError` both when the picker is closed and when the
 * site is blocked, and the two cannot be told apart — so the message covers
 * both and treats it as a cancel, not a fault. The one case worth singling
 * out is the operating system refusing the browser itself, which Chrome
 * reports as "Permission denied by system": on a Mac that is a setting in
 * System Settings, and no amount of clicking Start again will fix it.
 */
export function explainCaptureError(name: string, message = ''): CaptureError {
  if (name === 'NotAllowedError' && /system/i.test(message)) {
    return {
      kind: 'system',
      message: 'Your computer is not letting this browser record the screen. On a Mac, open System Settings → Privacy & Security → Screen Recording (Screen & System Audio Recording on newer versions), switch your browser on, then quit and reopen it.',
    }
  }
  switch (name) {
    case 'NotAllowedError':
      return { kind: 'cancelled', message: 'Nothing was shared — the picker was closed, or screen sharing is blocked for this site in the browser\'s settings.' }
    case 'NotReadableError':
    case 'AbortError':
      return { kind: 'system', message: 'The screen could not be captured. Another app may be using it, or the operating system refused — on a Mac, check that your browser is allowed under System Settings → Privacy & Security → Screen Recording.' }
    case 'NotFoundError':
      return { kind: 'failed', message: 'There was no screen, window or tab available to capture.' }
    case 'InvalidStateError':
      return { kind: 'failed', message: 'Screen sharing has to start from a click. Press Start recording again.' }
    case 'SecurityError':
      return { kind: 'failed', message: 'Screen capture is blocked on this page — it needs a secure (https) address and cannot run inside some embedded frames.' }
    default:
      return { kind: 'failed', message: 'This browser refused to start the screen capture.' }
  }
}
