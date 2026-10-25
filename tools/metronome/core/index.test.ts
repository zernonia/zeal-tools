import { describe, expect, it } from 'vitest'
import {
  asSubdivision,
  clampBeats,
  clampBpm,
  clickFor,
  formatPattern,
  MAELZEL_SCALE,
  markingBands,
  MAX_BPM,
  MIN_BPM,
  nextLevel,
  parsePattern,
  reanchor,
  scheduleClicks,
  secondsPerTick,
  tapTempo,
  tempoMarking,
} from './index'

describe('clamping', () => {
  it('keeps tempo in 20–300 and whole', () => {
    expect(clampBpm(10)).toBe(20)
    expect(clampBpm(999)).toBe(300)
    expect(clampBpm(119.6)).toBe(120)
    expect(clampBpm(Number.NaN)).toBe(120)
  })

  it('keeps beats in 1–12', () => {
    expect(clampBeats(0)).toBe(1)
    expect(clampBeats(13)).toBe(12)
    expect(clampBeats(Number.NaN)).toBe(4)
  })

  it('accepts only real subdivisions', () => {
    expect(asSubdivision(3)).toBe(3)
    expect(asSubdivision(5)).toBe(1)
  })
})

describe('secondsPerTick', () => {
  it('is 0.5 s a beat at 120, and divides by the subdivision', () => {
    expect(secondsPerTick(120, 1)).toBe(0.5)
    expect(secondsPerTick(120, 2)).toBe(0.25)
    expect(secondsPerTick(90, 3)).toBeCloseTo(60 / 90 / 3, 12)
  })
})

describe('patterns', () => {
  it('defaults to an accented first beat', () => {
    expect(parsePattern('', 4)).toEqual(['accent', 'normal', 'normal', 'normal'])
  })

  it('reads letters, ignores unknown ones and pads a short pattern with the default', () => {
    expect(parsePattern('nmx', 3)).toEqual(['normal', 'mute', 'normal'])
    expect(parsePattern('am', 4)).toEqual(['accent', 'mute', 'normal', 'normal'])
  })

  it('truncates a long pattern to the beat count', () => {
    expect(parsePattern('anmanm', 2)).toEqual(['accent', 'normal'])
  })

  it('round-trips', () => {
    const levels = parsePattern('anmn', 4)
    expect(parsePattern(formatPattern(levels), 4)).toEqual(levels)
    expect(formatPattern(levels)).toBe('anmn')
  })

  it('cycles accent → normal → mute → accent', () => {
    expect(nextLevel('accent')).toBe('normal')
    expect(nextLevel('normal')).toBe('mute')
    expect(nextLevel('mute')).toBe('accent')
  })
})

describe('clickFor', () => {
  const levels = parsePattern('anmn', 4)

  it('maps ticks onto beats and wraps at the bar line', () => {
    expect(clickFor(0, levels, 1)).toEqual({ beat: 0, kind: 'accent' })
    expect(clickFor(1, levels, 1)).toEqual({ beat: 1, kind: 'normal' })
    expect(clickFor(4, levels, 1)).toEqual({ beat: 0, kind: 'accent' })
  })

  it('gives off-beats the subdivision click', () => {
    expect(clickFor(0, levels, 3)).toEqual({ beat: 0, kind: 'accent' })
    expect(clickFor(1, levels, 3)).toEqual({ beat: 0, kind: 'sub' })
    expect(clickFor(2, levels, 3)).toEqual({ beat: 0, kind: 'sub' })
    expect(clickFor(3, levels, 3)).toEqual({ beat: 1, kind: 'normal' })
  })

  it('silences a muted beat\'s subdivisions along with it', () => {
    expect(clickFor(4, levels, 2)).toEqual({ beat: 2, kind: 'mute' })
    expect(clickFor(5, levels, 2)).toEqual({ beat: 2, kind: 'mute' })
  })
})

describe('scheduleClicks', () => {
  const levels = parsePattern('', 4)

  it('returns every click before the horizon, at exact multiples of the interval', () => {
    const clicks = scheduleClicks({ tick: 0, time: 10 }, 0, 11, 120, levels, 1)
    expect(clicks.map(c => c.time)).toEqual([10, 10.5])
    expect(clicks.map(c => c.kind)).toEqual(['accent', 'normal'])
  })

  it('continues from where the last window stopped, without overlap or gap', () => {
    const anchor = { tick: 0, time: 0 }
    const first = scheduleClicks(anchor, 0, 0.1, 100, levels, 4)
    const second = scheduleClicks(anchor, first.at(-1)!.tick + 1, 0.4, 100, levels, 4)
    const all = [...first, ...second]
    expect(all.map(c => c.tick)).toEqual(all.map((_, i) => i))
    for (const click of all)
      expect(click.time).toBeCloseTo(click.tick * 0.15, 12)
  })

  it('does not drift: the ten-thousandth click lands exactly where it should', () => {
    // 10,000 sixteenths at 137 BPM is about 18 minutes.
    const interval = 60 / 137 / 4
    const expected = 2 + 10_000 * interval
    const clicks = scheduleClicks({ tick: 0, time: 2 }, 10_000, expected + interval / 2, 137, levels, 4)
    expect(clicks).toHaveLength(1)
    expect(clicks[0]!.time).toBe(expected)
  })

  it('returns nothing when the next click is beyond the horizon', () => {
    expect(scheduleClicks({ tick: 0, time: 5 }, 0, 4.9, 120, levels, 1)).toEqual([])
  })
})

describe('reanchor', () => {
  it('lands a tempo change on the next beat, keeping the count', () => {
    // At 60 BPM in eighths, tick 5 is the off-beat after the third beat; the
    // fourth beat (tick 6) falls at 3 s.
    const anchor = reanchor({ tick: 0, time: 0 }, 5, { bpm: 60, subdivision: 2 }, 2)
    expect(anchor).toEqual({ tick: 6, time: 3 })
  })

  it('keeps the beat number when the subdivision changes', () => {
    // The fourth beat is tick 6 in eighths and tick 9 in triplets.
    const anchor = reanchor({ tick: 0, time: 0 }, 5, { bpm: 60, subdivision: 2 }, 3)
    expect(anchor).toEqual({ tick: 9, time: 3 })
    expect(clickFor(anchor.tick, parsePattern('', 4), 3).beat).toBe(3)
  })

  it('takes effect immediately when already on a beat', () => {
    const anchor = reanchor({ tick: 4, time: 10 }, 8, { bpm: 120, subdivision: 1 }, 1)
    expect(anchor).toEqual({ tick: 8, time: 12 })
  })
})

describe('tapTempo', () => {
  it('needs two taps', () => {
    expect(tapTempo([])).toBeNull()
    expect(tapTempo([1000])).toBeNull()
  })

  it('reads 120 from taps half a second apart', () => {
    expect(tapTempo([0, 500, 1000, 1500])).toBe(120)
  })

  it('ignores one fumbled tap, thanks to the median', () => {
    expect(tapTempo([0, 500, 1000, 1300, 2000, 2500, 3000])).toBe(120)
  })

  it('starts over after a pause', () => {
    expect(tapTempo([0, 1000, 2000, 5000, 5400, 5800])).toBe(150)
  })

  it('follows a change of speed using only the recent taps', () => {
    const slow = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000]
    const fast = [7500, 8000, 8500, 9000, 9500, 10000, 10500]
    expect(tapTempo([...slow, ...fast])).toBe(120)
  })

  it('clamps to the metronome\'s range', () => {
    expect(tapTempo([0, 100, 200])).toBe(300)
  })
})

describe('tempoMarking', () => {
  it('names common tempos', () => {
    expect(tempoMarking(50)).toBe('Largo')
    expect(tempoMarking(100)).toBe('Andante')
    expect(tempoMarking(120)).toBe('Allegro')
    expect(tempoMarking(240)).toBe('Prestissimo')
  })
})

describe('markingBands', () => {
  it('tiles the whole range with no gaps or overlaps', () => {
    const bands = markingBands()
    expect(bands[0]!.from).toBe(MIN_BPM)
    expect(bands.at(-1)!.to).toBe(MAX_BPM)
    for (let i = 1; i < bands.length; i++)
      expect(bands[i]!.from).toBe(bands[i - 1]!.to)
  })

  it('agrees with tempoMarking everywhere', () => {
    for (const band of markingBands()) {
      for (let bpm = band.from; bpm < band.to; bpm++)
        expect(tempoMarking(bpm), `${bpm} BPM`).toBe(band.name)
    }
  })
})

describe('mAELZEL_SCALE', () => {
  it('runs 40 to 208, rising, inside the metronome range', () => {
    expect(MAELZEL_SCALE[0]).toBe(40)
    expect(MAELZEL_SCALE.at(-1)).toBe(208)
    for (let i = 1; i < MAELZEL_SCALE.length; i++)
      expect(MAELZEL_SCALE[i]!).toBeGreaterThan(MAELZEL_SCALE[i - 1]!)
  })
})
