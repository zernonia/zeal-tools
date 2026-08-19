import { describe, expect, it } from 'vitest'
import {
  averageRate,
  CHUNK_SIZE,
  chunkRanges,
  deviceAlias,
  estimateRemaining,
  formatBytes,
  formatRate,
  transferProgress,
} from './index'

describe('chunkRanges', () => {
  it('splits on exact boundaries when the size divides evenly', () => {
    expect(chunkRanges(300, 100)).toEqual([
      { start: 0, end: 100 },
      { start: 100, end: 200 },
      { start: 200, end: 300 },
    ])
  })

  it('leaves the remainder in a short final chunk', () => {
    const ranges = chunkRanges(250, 100)
    expect(ranges).toHaveLength(3)
    expect(ranges.at(-1)).toEqual({ start: 200, end: 250 })
  })

  it('covers every byte exactly once, with no gap or overlap', () => {
    const ranges = chunkRanges(10_000, 512)
    expect(ranges[0]!.start).toBe(0)
    expect(ranges.at(-1)!.end).toBe(10_000)
    for (let i = 1; i < ranges.length; i++)
      expect(ranges[i]!.start).toBe(ranges[i - 1]!.end)
    expect(ranges.reduce((sum, r) => sum + (r.end - r.start), 0)).toBe(10_000)
  })

  it('returns nothing for an empty file', () => {
    expect(chunkRanges(0)).toEqual([])
  })

  it('returns a single short chunk for a file below the chunk size', () => {
    expect(chunkRanges(10, 100)).toEqual([{ start: 0, end: 10 }])
  })

  it('defaults to the size every browser will send in one message', () => {
    expect(CHUNK_SIZE).toBe(16 * 1024)
    expect(chunkRanges(CHUNK_SIZE * 2)).toHaveLength(2)
  })

  it('refuses nonsense input', () => {
    expect(() => chunkRanges(-1)).toThrow()
    expect(() => chunkRanges(100, 0)).toThrow()
  })
})

describe('formatBytes', () => {
  it('uses whole numbers for bytes and one decimal above', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(999)).toBe('999 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
  })

  it('climbs through the units', () => {
    expect(formatBytes(1024 ** 2)).toBe('1 MB')
    expect(formatBytes(1024 ** 3)).toBe('1 GB')
    expect(formatBytes(5.5 * 1024 ** 3)).toBe('5.5 GB')
  })

  it('does not print something silly for bad input', () => {
    expect(formatBytes(-5)).toBe('0 B')
    expect(formatBytes(Number.NaN)).toBe('0 B')
  })
})

describe('transferProgress', () => {
  it('reports the fraction moved', () => {
    expect(transferProgress(50, 200)).toBe(0.25)
    expect(transferProgress(200, 200)).toBe(1)
  })

  it('clamps rather than exceeding one', () => {
    expect(transferProgress(300, 200)).toBe(1)
    expect(transferProgress(-10, 200)).toBe(0)
  })

  it('calls an empty file finished, not stuck at zero', () => {
    expect(transferProgress(0, 0)).toBe(1)
  })
})

describe('formatRate', () => {
  it('renders a rate per second', () => {
    expect(formatRate(1024)).toBe('1 KB/s')
    expect(formatRate(1024 ** 2 * 2)).toBe('2 MB/s')
  })

  it('shows a placeholder before there is anything to measure', () => {
    expect(formatRate(0)).toBe('—')
    expect(formatRate(Number.NaN)).toBe('—')
  })
})

describe('estimateRemaining', () => {
  it('says done once everything has arrived', () => {
    expect(estimateRemaining(100, 100, 1000)).toBe('done')
    expect(estimateRemaining(120, 100, 1000)).toBe('done')
  })

  it('waits for a rate before guessing', () => {
    expect(estimateRemaining(0, 1000, 0)).toBe('estimating…')
  })

  it('rounds to steady bands rather than a jittering number', () => {
    // A per-frame estimate swings wildly on wifi; coarse bands read as calm.
    expect(estimateRemaining(0, 1000, 1000)).toBe('a moment')
    expect(estimateRemaining(0, 30_000, 1000)).toBe('30 seconds')
    expect(estimateRemaining(0, 120_000, 1000)).toBe('2 minutes')
    expect(estimateRemaining(0, 60_000, 1000)).toBe('1 minute')
  })

  it('switches to hours for a genuinely long transfer', () => {
    expect(estimateRemaining(0, 7_200_000, 1000)).toMatch(/hours?/)
  })

  it('never goes backwards as bytes arrive at a steady rate', () => {
    let previous = Infinity
    for (const moved of [0, 200, 400, 600, 800]) {
      const seconds = (1000 - moved) / 100
      expect(seconds).toBeLessThanOrEqual(previous)
      previous = seconds
    }
  })
})

describe('averageRate', () => {
  it('is bytes over seconds', () => {
    expect(averageRate(1000, 1000)).toBe(1000)
    expect(averageRate(1000, 2000)).toBe(500)
  })

  it('is zero before any time has passed', () => {
    expect(averageRate(1000, 0)).toBe(0)
  })
})

describe('deviceAlias', () => {
  it('is two capitalised words', () => {
    expect(deviceAlias(() => 0)).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/)
  })

  it('walks the whole list rather than favouring the front', () => {
    expect(deviceAlias(() => 0)).not.toBe(deviceAlias(() => 0.99))
  })

  it('never falls off the end of either list', () => {
    // Math.random() can return values arbitrarily close to 1; an index of
    // length would be undefined and print "undefined Otter".
    for (const r of [0, 0.5, 0.999999, 1 - Number.EPSILON])
      expect(deviceAlias(() => r)).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/)
  })

  it('offers enough names to tell a few devices apart', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 400; i++)
      seen.add(deviceAlias())
    expect(seen.size).toBeGreaterThan(100)
  })

  it('stays short enough to read aloud and to fit a QR', () => {
    for (let i = 0; i < 50; i++)
      expect(deviceAlias().length).toBeLessThanOrEqual(20)
  })
})
