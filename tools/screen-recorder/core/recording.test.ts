import { describe, expect, it } from 'vitest'
import {
  AUDIO_BITS_PER_SECOND,
  bytesPerMinute,
  clockElapsed,
  clockPause,
  clockStart,
  containerOf,
  describeElapsed,
  detectSupport,
  estimateBytes,
  explainCaptureError,
  formatElapsed,
  isMobileDevice,
  memoryLevel,
  newClock,
  observedBitrate,
  pickFormat,
  presetById,
  projectedBytesPerHour,
  QUALITY_PRESETS,
  recordingFileName,
} from '.'

describe('pickFormat', () => {
  it('prefers MP4 with H.264 and AAC when the browser records it', () => {
    const chrome = new Set(['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'])
    expect(pickFormat(type => chrome.has(type))).toEqual({ mimeType: 'video/mp4;codecs=avc1,mp4a', container: 'mp4' })
  })

  it('takes plain MP4 when that is all there is (Safari)', () => {
    expect(pickFormat(type => type === 'video/mp4')).toEqual({ mimeType: 'video/mp4', container: 'mp4' })
  })

  it('falls back through VP9, VP8 and plain WebM (Firefox, older Chrome)', () => {
    expect(pickFormat(t => t.startsWith('video/webm')).mimeType).toBe('video/webm;codecs=vp9,opus')
    expect(pickFormat(t => t === 'video/webm;codecs=vp8,opus' || t === 'video/webm').mimeType).toBe('video/webm;codecs=vp8,opus')
    expect(pickFormat(t => t === 'video/webm')).toEqual({ mimeType: 'video/webm', container: 'webm' })
  })

  it('lets the browser choose when nothing matches, and survives a throwing predicate', () => {
    expect(pickFormat(() => false)).toEqual({ mimeType: '', container: 'webm' })
    expect(pickFormat(() => {
      throw new Error('unparseable')
    }).mimeType).toBe('')
  })
})

describe('containerOf', () => {
  it('reads the container from what the recorder reports', () => {
    expect(containerOf('video/mp4; codecs="avc1.4d002a, mp4a.40.2"')).toBe('mp4')
    expect(containerOf('video/x-matroska;codecs=avc1')).toBe('webm')
    expect(containerOf('VIDEO/WEBM;codecs=vp8')).toBe('webm')
    expect(containerOf('', 'mp4')).toBe('mp4')
  })
})

describe('sizes', () => {
  it('works out the ceiling per minute for each preset', () => {
    const standard = presetById('standard')
    expect(bytesPerMinute(standard)).toBe(((2_500_000 + AUDIO_BITS_PER_SECOND) / 8) * 60)
    expect(bytesPerMinute(standard, false)).toBe((2_500_000 / 8) * 60)
  })

  it('orders presets from smallest to largest', () => {
    const rates = QUALITY_PRESETS.map(p => p.videoBitsPerSecond)
    expect(rates).toEqual([...rates].sort((a, b) => a - b))
  })

  it('falls back to the default preset for an unknown id', () => {
    expect(presetById('nonsense').id).toBe('high')
  })

  it('measures the bitrate actually achieved', () => {
    expect(observedBitrate(1_000_000, 4000)).toBe(2_000_000)
    expect(observedBitrate(0, 4000)).toBe(0)
    expect(observedBitrate(100, 0)).toBe(0)
  })

  it('estimates size from a rate and a length', () => {
    expect(estimateBytes(8_000_000, 60)).toBe(60_000_000)
    expect(estimateBytes(Number.NaN, 60)).toBe(0)
  })

  it('projects an hour from the preset until there is enough to measure', () => {
    const high = presetById('high')
    expect(projectedBytesPerHour(400_000, 1000, high)).toBe(bytesPerMinute(high) * 60)
    // 10 s at 1 Mbit/s observed → 450 MB an hour.
    expect(projectedBytesPerHour(1_250_000, 10_000, high)).toBe(450_000_000)
  })

  it('grades memory pressure', () => {
    expect(memoryLevel(500 * 1024 ** 2)).toBe('ok')
    expect(memoryLevel(1024 ** 3)).toBe('notice')
    expect(memoryLevel(3 * 1024 ** 3)).toBe('warn')
  })
})

describe('recordingFileName', () => {
  it('names the file by local date and time', () => {
    expect(recordingFileName(new Date(2026, 10, 20, 9, 5), 'mp4')).toBe('screen-recording-2026-11-20-0905.mp4')
    expect(recordingFileName(new Date(2027, 0, 1, 23, 59), 'webm')).toBe('screen-recording-2027-01-01-2359.webm')
  })
})

describe('elapsed time', () => {
  it('formats like a recorder clock', () => {
    expect(formatElapsed(0)).toBe('0:00')
    expect(formatElapsed(7_900)).toBe('0:07')
    expect(formatElapsed(754_000)).toBe('12:34')
    expect(formatElapsed(3_723_000)).toBe('1:02:03')
    expect(formatElapsed(-5)).toBe('0:00')
    expect(formatElapsed(Number.NaN)).toBe('0:00')
  })

  it('describes it in words for a screen reader', () => {
    expect(describeElapsed(0)).toBe('0 seconds')
    expect(describeElapsed(65_000)).toBe('1 minute 5 seconds')
    expect(describeElapsed(3_600_000)).toBe('1 hour')
    expect(describeElapsed(7_261_000)).toBe('2 hours 1 minute 1 second')
  })

  it('leaves pauses out of the recorded time', () => {
    let clock = clockStart(newClock(), 1000)
    expect(clockElapsed(clock, 4000)).toBe(3000)
    clock = clockPause(clock, 4000)
    expect(clockElapsed(clock, 60_000)).toBe(3000)
    clock = clockStart(clock, 60_000)
    expect(clockElapsed(clock, 62_500)).toBe(5500)
  })

  it('ignores a double start or a double pause', () => {
    let clock = clockStart(newClock(), 0)
    clock = clockStart(clock, 5000)
    expect(clockElapsed(clock, 6000)).toBe(6000)
    clock = clockPause(clock, 6000)
    clock = clockPause(clock, 9000)
    expect(clockElapsed(clock, 9000)).toBe(6000)
  })
})

describe('detectSupport', () => {
  const desktop = {
    isSecureContext: true,
    hasDisplayMedia: true,
    hasMediaRecorder: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36',
    maxTouchPoints: 0,
  }
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
  const android = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'

  it('is fine on a desktop browser with both APIs', () => {
    expect(detectSupport(desktop)).toBe('ok')
  })

  it('blames the address, not the browser, on an insecure page', () => {
    expect(detectSupport({ ...desktop, isSecureContext: false, hasDisplayMedia: false })).toBe('insecure')
  })

  it('points phones at their own recorder', () => {
    expect(detectSupport({ ...desktop, hasDisplayMedia: false, userAgent: iphone })).toBe('mobile')
    expect(detectSupport({ ...desktop, hasDisplayMedia: false, userAgent: android })).toBe('mobile')
    // iPadOS claims to be a Mac.
    expect(detectSupport({ ...desktop, hasDisplayMedia: false, maxTouchPoints: 5 })).toBe('mobile')
  })

  it('lets any browser with the API try, whatever its user agent says', () => {
    expect(detectSupport({ ...desktop, userAgent: android })).toBe('ok')
  })

  it('separates a desktop without screen capture from one without a recorder', () => {
    expect(detectSupport({ ...desktop, hasDisplayMedia: false })).toBe('no-display-media')
    expect(detectSupport({ ...desktop, hasMediaRecorder: false })).toBe('no-recorder')
  })

  it('recognises mobile devices', () => {
    expect(isMobileDevice({ userAgent: iphone, maxTouchPoints: 5 })).toBe(true)
    expect(isMobileDevice({ userAgent: desktop.userAgent, maxTouchPoints: 0 })).toBe(false)
  })
})

describe('explainCaptureError', () => {
  it('treats a closed picker as a cancel, not a fault', () => {
    expect(explainCaptureError('NotAllowedError', 'Permission denied').kind).toBe('cancelled')
  })

  it('singles out the operating system refusing the browser', () => {
    const error = explainCaptureError('NotAllowedError', 'Permission denied by system')
    expect(error.kind).toBe('system')
    expect(error.message).toContain('System Settings')
  })

  it('has a message for every failure, including ones it has never seen', () => {
    for (const name of ['NotReadableError', 'AbortError', 'NotFoundError', 'InvalidStateError', 'SecurityError', 'TypeError', 'Whatever'])
      expect(explainCaptureError(name).message.length).toBeGreaterThan(20)
  })
})
