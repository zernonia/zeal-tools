import { describe, expect, it } from 'vitest'
import {
  actionForKey,
  aspectRatio,
  capabilityLabel,
  CHATTER_MS,
  clampInterval,
  clampRecordingSeconds,
  coverage,
  createKeyTestState,
  DB_FLOOR,
  describeKey,
  describeLocation,
  formatCapability,
  formatChannels,
  formatDb,
  formatSampleRate,
  frequencyBars,
  fromDbfs,
  keyDown,
  keyUp,
  LAYOUTS,
  levelVerdict,
  measuredFps,
  meterFraction,
  MIN_AUTO_INTERVAL_MS,
  nextScreen,
  peak,
  pickMimeType,
  previousScreen,
  releaseAll,
  resolutionName,
  rms,
  SCREENS,
  shouldPreventDefault,
  snapshotFilename,
  suggestLayout,
  toDbfs,
  trimTimestamps,
  unmappedCodes,
  updatePeakHold,
} from './index'

const press = (code: string, key = code, repeat = false) => ({ code, key, location: 0, repeat })

describe('keyboard layouts', () => {
  for (const layout of Object.values(LAYOUTS)) {
    describe(layout.name, () => {
      it('has no duplicate codes', () => {
        const codes = layout.keys.map(k => k.code)
        expect(new Set(codes).size).toBe(codes.length)
      })

      it('has no overlapping keys', () => {
        const keys = layout.keys
        for (let i = 0; i < keys.length; i++) {
          for (let j = i + 1; j < keys.length; j++) {
            const a = keys[i]!
            const b = keys[j]!
            const overlap = a.x < b.x + b.w - 1e-9 && b.x < a.x + a.w - 1e-9
              && a.y < b.y + b.h - 1e-9 && b.y < a.y + a.h - 1e-9
            expect(overlap, `${a.code} overlaps ${b.code}`).toBe(false)
          }
        }
      })

      it('fits inside its stated size', () => {
        for (const k of layout.keys) {
          expect(k.x + k.w).toBeLessThanOrEqual(layout.width + 1e-9)
          expect(k.y + k.h).toBeLessThanOrEqual(layout.height + 1e-9)
        }
      })

      it('every main-block row is 15 units wide', () => {
        // Rows of the alphanumeric block must end flush, or the drawing has a gap.
        const main = layout.keys.filter(k => k.x < 15 && k.y >= 1.5)
        const rows = new Map<number, number>()
        for (const k of main)
          rows.set(k.y, Math.max(rows.get(k.y) ?? 0, k.x + k.w))
        for (const [y, end] of rows) {
          // The ISO Enter spans two rows, so the home row ends under it.
          if (layout.id === 'iso' && y === 3.5)
            expect(end).toBe(13.75)
          else
            expect(end, `row at ${y}`).toBe(15)
        }
      })

      it('is a full-size board: F-keys, nav cluster, arrows and numpad', () => {
        const codes = new Set(layout.keys.map(k => k.code))
        for (const code of ['F1', 'F12', 'PrintScreen', 'Insert', 'PageDown', 'ArrowUp', 'NumLock', 'Numpad0', 'NumpadEnter', 'NumpadAdd', 'ContextMenu', 'MetaRight'])
          expect(codes.has(code), code).toBe(true)
      })
    })
  }

  it('only ISO has IntlBackslash, and both have Backslash', () => {
    expect(LAYOUTS.iso.keys.some(k => k.code === 'IntlBackslash')).toBe(true)
    expect(LAYOUTS.ansi.keys.some(k => k.code === 'IntlBackslash')).toBe(false)
    expect(LAYOUTS.ansi.keys.some(k => k.code === 'Backslash')).toBe(true)
    expect(LAYOUTS.iso.keys.some(k => k.code === 'Backslash')).toBe(true)
    expect(LAYOUTS.ansi.keys).toHaveLength(104)
    expect(LAYOUTS.iso.keys).toHaveLength(105)
  })

  it('suggests ISO only for the ISO-only key', () => {
    expect(suggestLayout('IntlBackslash')).toBe('iso')
    expect(suggestLayout('KeyA')).toBeNull()
  })
})

describe('keyboard state', () => {
  it('tracks held keys, presses and rollover', () => {
    let s = createKeyTestState()
    s = keyDown(s, press('KeyA', 'a'), 0)
    s = keyDown(s, press('KeyS', 's'), 100)
    s = keyDown(s, press('KeyD', 'd'), 200)
    expect(s.down).toEqual(['KeyA', 'KeyS', 'KeyD'])
    expect(s.maxRollover).toBe(3)
    s = keyUp(s, 'KeyS')
    expect(s.down).toEqual(['KeyA', 'KeyD'])
    expect(s.maxRollover).toBe(3)
    expect(s.presses).toEqual({ KeyA: 1, KeyS: 1, KeyD: 1 })
    expect(s.total).toBe(3)
    expect(s.last?.key).toBe('d')
  })

  it('does not count auto-repeat as presses or chatter', () => {
    let s = createKeyTestState()
    s = keyDown(s, press('KeyA'), 0)
    for (let t = 1; t < 10; t++)
      s = keyDown(s, press('KeyA', 'a', true), t * 5)
    expect(s.presses.KeyA).toBe(1)
    expect(s.repeats).toBe(9)
    expect(s.chatter).toEqual({})
    expect(s.down).toEqual(['KeyA'])
  })

  it('flags a second press inside the chatter window', () => {
    let s = createKeyTestState()
    s = keyDown(s, press('KeyE'), 1000)
    s = keyUp(s, 'KeyE')
    s = keyDown(s, press('KeyE'), 1000 + CHATTER_MS - 18)
    expect(s.chatter).toEqual({ KeyE: 1 })
    expect(s.lastChatter).toEqual({ code: 'KeyE', gap: CHATTER_MS - 18 })
  })

  it('does not flag a fast human double-tap', () => {
    let s = createKeyTestState()
    s = keyDown(s, press('KeyE'), 1000)
    s = keyUp(s, 'KeyE')
    s = keyDown(s, press('KeyE'), 1085)
    expect(s.chatter).toEqual({})
    expect(s.lastChatter).toBeNull()
  })

  it('flags at just under the threshold and not at it', () => {
    let s = keyDown(createKeyTestState(), press('KeyQ'), 0)
    s = keyDown(keyUp(s, 'KeyQ'), press('KeyQ'), CHATTER_MS)
    expect(s.chatter.KeyQ).toBeUndefined()
    s = keyDown(keyUp(s, 'KeyQ'), press('KeyQ'), CHATTER_MS * 2 - 1)
    expect(s.chatter.KeyQ).toBe(1)
  })

  it('ignores keyup for a key not held', () => {
    const s = createKeyTestState()
    expect(keyUp(s, 'KeyZ')).toBe(s)
  })

  it('counts a keyup-only PrintScreen as a press, and nothing else', () => {
    let s = keyUp(createKeyTestState(), 'PrintScreen')
    expect(s.presses.PrintScreen).toBe(1)
    expect(s.total).toBe(1)
    expect(s.down).toEqual([])
    s = keyDown(s, press('PrintScreen'), 0)
    s = keyUp(s, 'PrintScreen')
    expect(s.presses.PrintScreen).toBe(2)
  })

  it('releases everything but modifiers when ⌘ goes up on a Mac', () => {
    let s = createKeyTestState()
    s = keyDown(s, press('MetaLeft'), 0)
    s = keyDown(s, press('ShiftLeft'), 10)
    s = keyDown(s, press('KeyC'), 20)
    // macOS never sends KeyC's keyup while ⌘ is down.
    s = keyUp(s, 'MetaLeft', { metaSwallowsKeyup: true })
    expect(s.down).toEqual(['ShiftLeft'])
  })

  it('keeps other keys on ⌘ up elsewhere', () => {
    let s = createKeyTestState()
    s = keyDown(s, press('MetaLeft'), 0)
    s = keyDown(s, press('KeyC'), 20)
    s = keyUp(s, 'MetaLeft')
    expect(s.down).toEqual(['KeyC'])
  })

  it('releaseAll clears held keys and keeps history', () => {
    let s = keyDown(keyDown(createKeyTestState(), press('KeyA'), 0), press('KeyB'), 1)
    s = releaseAll(s)
    expect(s.down).toEqual([])
    expect(s.maxRollover).toBe(2)
    expect(s.total).toBe(2)
    expect(releaseAll(s)).toBe(s)
  })

  it('records an event with no code without counting it', () => {
    const s = keyDown(createKeyTestState(), { key: 'Unidentified', code: '', location: 0, repeat: false }, 0)
    expect(s.total).toBe(0)
    expect(s.last?.key).toBe('Unidentified')
  })

  it('reports codes the drawing has no key for, and coverage', () => {
    let s = createKeyTestState()
    s = keyDown(s, press('KeyA'), 0)
    s = keyDown(s, press('F13'), 100)
    s = keyDown(s, press('IntlBackslash'), 200)
    expect(unmappedCodes(s, LAYOUTS.ansi)).toEqual(['F13', 'IntlBackslash'])
    expect(unmappedCodes(s, LAYOUTS.iso)).toEqual(['F13'])
    expect(coverage(s, LAYOUTS.ansi)).toEqual({ pressed: 1, total: 104 })
  })

  it('prevents only keys that would scroll, navigate or reload', () => {
    for (const code of ['Space', 'ArrowDown', 'Tab', 'Backspace', 'F5', 'Slash', 'AltLeft'])
      expect(shouldPreventDefault(code), code).toBe(true)
    for (const code of ['Escape', 'KeyA', 'Digit1', 'ShiftLeft', 'F12', 'Enter'])
      expect(shouldPreventDefault(code), code).toBe(false)
  })

  it('describes keys and locations readably', () => {
    expect(describeKey(' ')).toBe('Space')
    expect(describeKey('Dead')).toMatch(/accent/)
    expect(describeKey('')).toBe('—')
    expect(describeKey('ü')).toBe('ü')
    expect(describeLocation(0)).toBe('Standard')
    expect(describeLocation(1)).toBe('Left')
    expect(describeLocation(2)).toBe('Right')
    expect(describeLocation(3)).toBe('Numpad')
    expect(describeLocation(7)).toBe('7')
  })
})

describe('audio levels', () => {
  it('rms of a full-scale sine is 1/√2, peak is 1', () => {
    const n = 4800
    const sine = Float32Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 100 * i) / 48000))
    expect(rms(sine)).toBeCloseTo(Math.SQRT1_2, 3)
    expect(peak(sine)).toBeCloseTo(1, 3)
    // A full-scale sine is the classic −3.01 dBFS RMS reference.
    expect(toDbfs(rms(sine))).toBeCloseTo(-3.01, 1)
  })

  it('rms of a square wave equals its amplitude', () => {
    const square = Float32Array.from({ length: 1000 }, (_, i) => (i % 2 ? 0.5 : -0.5))
    expect(rms(square)).toBeCloseTo(0.5, 6)
    expect(toDbfs(0.5)).toBeCloseTo(-6.02, 2)
  })

  it('handles empty and silent input', () => {
    expect(rms([])).toBe(0)
    expect(peak([])).toBe(0)
    expect(toDbfs(0)).toBe(DB_FLOOR)
    expect(toDbfs(Number.NaN)).toBe(DB_FLOOR)
    expect(toDbfs(1e-12)).toBe(DB_FLOOR)
    expect(toDbfs(1)).toBe(0)
  })

  it('round-trips dBFS', () => {
    for (const db of [-60, -20, -6, -0.5, 0])
      expect(toDbfs(fromDbfs(db))).toBeCloseTo(db, 9)
  })

  it('maps decibels onto the meter linearly in dB', () => {
    expect(meterFraction(-80)).toBe(0)
    expect(meterFraction(-60)).toBe(0)
    expect(meterFraction(-30)).toBe(0.5)
    expect(meterFraction(0)).toBe(1)
    expect(meterFraction(3)).toBe(1)
    expect(meterFraction(-50, -100)).toBe(0.5)
  })

  it('gives a plain-words verdict', () => {
    expect(levelVerdict(-90, -85)).toBe('silent')
    expect(levelVerdict(-55, -40)).toBe('quiet')
    expect(levelVerdict(-25, -12)).toBe('good')
    expect(levelVerdict(-10, -2)).toBe('loud')
    expect(levelVerdict(-10, 0)).toBe('clipping')
  })

  it('holds a peak, then lets it fall, never below the live level', () => {
    let held = updatePeakHold({ db: DB_FLOOR, at: 0 }, -10, 0)
    expect(held).toEqual({ db: -10, at: 0 })
    held = updatePeakHold(held, -30, 1000)
    expect(held.db).toBe(-10)
    // 1.5 s hold, then 20 dB/s: at 2.0 s it has fallen 10 dB.
    held = updatePeakHold(held, -40, 2000)
    expect(held.db).toBeCloseTo(-20, 6)
    // Fallen past the live level: snaps to it.
    held = updatePeakHold(held, -25, 3500)
    expect(held.db).toBe(-25)
    // A louder level always replaces it.
    expect(updatePeakHold(held, -1, 3600).db).toBe(-1)
  })

  it('collapses a spectrum into log-spaced bars', () => {
    const bins = new Uint8Array(1024)
    expect(frequencyBars(bins, 16)).toEqual(Array.from({ length: 16 }).fill(0))
    bins[1000] = 255
    const bars = frequencyBars(bins, 16)
    expect(bars).toHaveLength(16)
    expect(bars[15]).toBe(1)
    expect(bars.slice(0, 15).every(v => v === 0)).toBe(true)
    bins.fill(0)
    bins[2] = 128
    expect(frequencyBars(bins, 16).some(v => v > 0.49 && v < 0.51)).toBe(true)
    expect(frequencyBars(new Uint8Array(1), 4)).toEqual([0, 0, 0, 0])
  })

  it('picks the first supported recording type', () => {
    expect(pickMimeType(['audio/webm', 'audio/mp4'], t => t === 'audio/mp4')).toBe('audio/mp4')
    expect(pickMimeType(['audio/webm'], () => false)).toBe('')
  })

  it('clamps the recording length', () => {
    expect(clampRecordingSeconds(5)).toBe(5)
    expect(clampRecordingSeconds(60)).toBe(10)
    expect(clampRecordingSeconds(0)).toBe(1)
    expect(clampRecordingSeconds(Number.NaN)).toBe(5)
  })

  it('formats readouts', () => {
    expect(formatDb(-12.345)).toBe('−12.3 dBFS')
    expect(formatDb(DB_FLOOR)).toBe('−∞ dBFS')
    expect(formatDb(0)).toBe('0.0 dBFS')
    expect(formatSampleRate(48000)).toBe('48 kHz')
    expect(formatSampleRate(44100)).toBe('44.1 kHz')
    expect(formatSampleRate(undefined)).toBe('Not reported')
    expect(formatChannels(1)).toBe('Mono (1)')
    expect(formatChannels(2)).toBe('Stereo (2)')
    expect(formatChannels(4)).toBe('4 channels')
    expect(formatChannels(undefined)).toBe('Not reported')
  })
})

describe('webcam helpers', () => {
  it('measures frame rate from timestamps', () => {
    const thirty = Array.from({ length: 61 }, (_, i) => i * (1000 / 30))
    expect(measuredFps(thirty)).toBeCloseTo(30, 6)
    const fifteen = Array.from({ length: 31 }, (_, i) => i * (1000 / 15))
    expect(measuredFps(fifteen)).toBeCloseTo(15, 6)
    expect(measuredFps([])).toBe(0)
    expect(measuredFps([5])).toBe(0)
  })

  it('only counts the recent window', () => {
    // Slow at first, then 30 fps for the last second.
    const times = [0, 500, 1000, ...Array.from({ length: 31 }, (_, i) => 2000 + i * (1000 / 30))]
    expect(measuredFps(times)).toBeCloseTo(30, 6)
  })

  it('trims old timestamps', () => {
    expect(trimTimestamps([0, 100, 2500, 3000], 1000)).toEqual([2500, 3000])
    expect(trimTimestamps([], 1000)).toEqual([])
    const fresh = [1, 2, 3]
    expect(trimTimestamps(fresh, 1000)).toBe(fresh)
  })

  it('names common resolutions in either orientation', () => {
    expect(resolutionName(1920, 1080)).toBe('1080p Full HD')
    expect(resolutionName(1080, 1920)).toBe('1080p Full HD')
    expect(resolutionName(1280, 720)).toBe('720p HD')
    expect(resolutionName(640, 480)).toBe('480p VGA')
    expect(resolutionName(1234, 567)).toBe('')
  })

  it('reduces aspect ratios', () => {
    expect(aspectRatio(1920, 1080)).toBe('16:9')
    expect(aspectRatio(640, 480)).toBe('4:3')
    expect(aspectRatio(1080, 1080)).toBe('1:1')
    expect(aspectRatio(854, 480)).toBe('1.78:1')
    expect(aspectRatio(0, 480)).toBe('')
  })

  it('formats capability values of every shape', () => {
    expect(formatCapability({ min: 1, max: 1920, step: 1 })).toBe('1 – 1920')
    expect(formatCapability({ min: 0, max: 30.000030517578125 })).toBe('0 – 30')
    expect(formatCapability({ min: 1.5, max: 1.5 })).toBe('1.5')
    expect(formatCapability({ max: 4 })).toBe('? – 4')
    expect(formatCapability(['user', 'environment'])).toBe('user, environment')
    expect(formatCapability([])).toBe('—')
    expect(formatCapability(true)).toBe('Yes')
    expect(formatCapability(false)).toBe('No')
    expect(formatCapability(2.5)).toBe('2.5')
    expect(formatCapability(undefined)).toBe('—')
    expect(formatCapability({})).toBe('—')
    expect(formatCapability('none')).toBe('none')
  })

  it('labels capability names', () => {
    expect(capabilityLabel('whiteBalanceMode')).toBe('White balance mode')
    expect(capabilityLabel('frameRate')).toBe('Frame rate (fps)')
    expect(capabilityLabel('zoom')).toBe('Zoom')
  })

  it('names snapshots safely', () => {
    expect(snapshotFilename(1280, 720, new Date(2026, 10, 20, 9, 5, 3))).toBe('webcam-1280x720-20261120-090503.png')
  })
})

describe('dead pixel screens', () => {
  it('covers black, white, the primaries and a gradient', () => {
    const ids = SCREENS.map(s => s.id)
    for (const id of ['black', 'white', 'red', 'green', 'blue', 'gradient'])
      expect(ids).toContain(id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('steps forwards and backwards, wrapping', () => {
    const n = SCREENS.length
    expect(nextScreen(0)).toBe(1)
    expect(nextScreen(n - 1)).toBe(0)
    expect(previousScreen(0)).toBe(n - 1)
    expect(previousScreen(3)).toBe(2)
    expect(nextScreen(0, 0)).toBe(0)
  })

  it('never auto-advances faster than once a second', () => {
    expect(clampInterval(100)).toBe(MIN_AUTO_INTERVAL_MS)
    expect(clampInterval(0)).toBe(MIN_AUTO_INTERVAL_MS)
    expect(clampInterval(-5)).toBe(MIN_AUTO_INTERVAL_MS)
    expect(clampInterval(5000)).toBe(5000)
    expect(clampInterval(Number.NaN)).toBeGreaterThanOrEqual(MIN_AUTO_INTERVAL_MS)
  })

  it('maps keys to actions', () => {
    expect(actionForKey('Space')).toBe('next')
    expect(actionForKey('ArrowRight')).toBe('next')
    expect(actionForKey('ArrowLeft')).toBe('previous')
    expect(actionForKey('Escape')).toBe('exit')
    expect(actionForKey('KeyH')).toBe('toggle-hint')
    expect(actionForKey('KeyZ')).toBeNull()
  })
})
