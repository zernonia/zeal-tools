import { describe, expect, it } from 'vitest'
import { createRandomInt } from '../../../shared/core/random'
import {
  entryAt,
  formatEntries,
  MAX_ENTRIES,
  parseEntries,
  pickIndex,
  rotationFor,
  segments,
  sliceColor,
  slicePath,
  totalWeight,
  without,
} from './index'

const names = (...labels: string[]) => labels.map((label, id) => ({ id, label, weight: 1 }))

describe('parseEntries', () => {
  it('reads one name per line and drops blanks', () => {
    const entries = parseEntries('Ada\n\n  Grace  \n\nLinus\n')
    expect(entries.map(e => e.label)).toEqual(['Ada', 'Grace', 'Linus'])
    expect(entries.every(e => e.weight === 1)).toBe(true)
  })

  it('gives every entry a distinct id', () => {
    const entries = parseEntries('Ada\nAda\nAda')
    expect(new Set(entries.map(e => e.id)).size).toBe(3)
  })

  it('reads a trailing multiplier as a weight', () => {
    expect(parseEntries('Ada x3')).toEqual([{ id: 0, label: 'Ada', weight: 3 }])
    expect(parseEntries('Ada ×3')).toEqual([{ id: 0, label: 'Ada', weight: 3 }])
    expect(parseEntries('Ada X 10')).toEqual([{ id: 0, label: 'Ada', weight: 10 }])
  })

  it('does not mistake a name that merely contains an x', () => {
    expect(parseEntries('Max')).toEqual([{ id: 0, label: 'Max', weight: 1 }])
    expect(parseEntries('Xavier')).toEqual([{ id: 0, label: 'Xavier', weight: 1 }])
    // A multiplier needs whitespace before it, so this is a whole name.
    expect(parseEntries('Room x2b')).toEqual([{ id: 0, label: 'Room x2b', weight: 1 }])
  })

  it('keeps the name when only a multiplier is typed', () => {
    expect(parseEntries('x3')).toEqual([{ id: 0, label: 'x3', weight: 1 }])
  })

  it('reads a hostile line in linear time', () => {
    // The pattern this replaced could exchange characters between a lazy
    // prefix and a whitespace run, so a line of spaces took exponentially
    // long. Two thousand spaces is instant now and was not before.
    const started = performance.now()
    expect(parseEntries(`${'\u0020'.repeat(20_000)}x3`)).toHaveLength(1)
    expect(performance.now() - started).toBeLessThan(50)
  })

  it('bounds the list and the labels', () => {
    const many = Array.from({ length: MAX_ENTRIES + 50 }, (_, i) => `Name ${i}`).join('\n')
    expect(parseEntries(many)).toHaveLength(MAX_ENTRIES)
    expect(parseEntries('a'.repeat(500))[0]!.label).toHaveLength(60)
  })
})

describe('formatEntries', () => {
  it('round-trips a list through text', () => {
    const text = 'Ada\nGrace \u00D73\nLinus'
    expect(formatEntries(parseEntries(text))).toBe(text)
  })

  it('writes a weight only when there is one', () => {
    expect(formatEntries([{ id: 0, label: 'Ada', weight: 1 }])).toBe('Ada')
  })
})

describe('segments', () => {
  it('fills the circle exactly', () => {
    const list = segments(names('a', 'b', 'c', 'd', 'e', 'f', 'g'))
    expect(list[0]!.start).toBe(0)
    expect(list[list.length - 1]!.end).toBeCloseTo(360, 9)
    for (let i = 1; i < list.length; i++)
      expect(list[i]!.start).toBe(list[i - 1]!.end)
  })

  it('gives a weighted entry proportionally more of the wheel', () => {
    const list = segments([
      { id: 0, label: 'Ada', weight: 3 },
      { id: 1, label: 'Bob', weight: 1 },
    ])
    expect(list[0]!.end - list[0]!.start).toBeCloseTo(270, 9)
    expect(list[1]!.end - list[1]!.start).toBeCloseTo(90, 9)
    expect(totalWeight([{ id: 0, label: 'Ada', weight: 3 }, { id: 1, label: 'Bob', weight: 1 }])).toBe(4)
  })

  it('is empty for no entries', () => {
    expect(segments([])).toEqual([])
    expect(entryAt(0, [])).toBeNull()
  })
})

describe('rotationFor and entryAt are inverses', () => {
  // The whole fairness claim rests on this. If the two disagree by one slice
  // or by a sign, the wheel stops beside a name it did not choose.
  for (const count of [1, 2, 3, 5, 8, 13, 50]) {
    it(`lands on the chosen entry with ${count} entries`, () => {
      const entries = Array.from({ length: count }, (_, i) => ({ id: i, label: `n${i}`, weight: 1 }))
      for (let index = 0; index < count; index++) {
        for (const position of [0, 0.15, 0.5, 0.85, 1]) {
          const rotation = rotationFor(index, entries, 6, position)
          expect(entryAt(rotation, entries)!.index).toBe(index)
        }
      }
    })
  }

  it('holds for weighted entries too', () => {
    const entries = [
      { id: 0, label: 'a', weight: 7 },
      { id: 1, label: 'b', weight: 1 },
      { id: 2, label: 'c', weight: 3 },
      { id: 3, label: 'd', weight: 1 },
    ]
    for (let index = 0; index < entries.length; index++)
      expect(entryAt(rotationFor(index, entries), entries)!.index).toBe(index)
  })

  it('is unaffected by how many turns the wheel takes', () => {
    const entries = names('a', 'b', 'c', 'd', 'e')
    for (const turns of [0, 1, 6, 40])
      expect(entryAt(rotationFor(2, entries, turns), entries)!.index).toBe(2)
  })

  it('always spins forwards, and by at least the requested turns', () => {
    const entries = names('a', 'b', 'c', 'd', 'e', 'f')
    for (let index = 0; index < entries.length; index++) {
      const rotation = rotationFor(index, entries, 6)
      expect(rotation).toBeGreaterThanOrEqual(6 * 360)
      expect(rotation).toBeLessThan(7 * 360)
    }
  })

  it('reads the first entry at rest', () => {
    // A wheel that has not moved must show its first slice under the pointer,
    // or the very first frame contradicts the geometry.
    expect(entryAt(0, names('a', 'b', 'c'))!.index).toBe(0)
  })

  it('returns zero for an index that is not there', () => {
    expect(rotationFor(9, names('a', 'b'))).toBe(0)
    expect(rotationFor(-1, names('a', 'b'))).toBe(0)
  })
})

describe('pickIndex', () => {
  /** A draw that returns a fixed sequence, to make the selection deterministic. */
  function fixedInt(values: number[]) {
    let i = 0
    return () => values[i++ % values.length]!
  }

  it('maps each ticket to the entry that owns it', () => {
    const entries = [
      { id: 0, label: 'a', weight: 2 },
      { id: 1, label: 'b', weight: 1 },
      { id: 2, label: 'c', weight: 3 },
    ]
    // Tickets 0-1 are a's, 2 is b's, 3-5 are c's.
    const got = [0, 1, 2, 3, 4, 5].map(t => pickIndex(entries, fixedInt([t])))
    expect(got).toEqual([0, 0, 1, 2, 2, 2])
  })

  it('draws from the total weight, not the entry count', () => {
    const entries = [{ id: 0, label: 'a', weight: 5 }, { id: 1, label: 'b', weight: 5 }]
    let asked = -1
    pickIndex(entries, (max) => { asked = max; return 0 })
    expect(asked).toBe(10)
  })

  it('returns -1 with nothing to pick from', () => {
    expect(pickIndex([], fixedInt([0]))).toBe(-1)
  })

  it('is uniform over a real crypto draw', () => {
    // Not a proof of the generator — that is tested in shared/core/random —
    // but it does catch an off-by-one that starves the first or last entry.
    const entries = names('a', 'b', 'c', 'd', 'e')
    const randomInt = createRandomInt(bytes => crypto.getRandomValues(bytes))
    const counts = Array.from({ length: 5 }).fill(0) as number[]
    for (let i = 0; i < 20_000; i++)
      counts[pickIndex(entries, randomInt)]!++

    expect(counts.every(c => c > 0)).toBe(true)
    for (const count of counts)
      expect(Math.abs(count - 4000)).toBeLessThan(600)
  })
})

describe('without', () => {
  it('removes exactly one entry and keeps the rest in order', () => {
    const entries = names('a', 'b', 'c')
    expect(without(entries, 1).map(e => e.label)).toEqual(['a', 'c'])
    expect(entries).toHaveLength(3)
  })

  it('removes only the picked duplicate, not every match', () => {
    const entries = names('Ada', 'Ada', 'Ada')
    const rest = without(entries, 1)
    expect(rest).toHaveLength(2)
    expect(rest.map(e => e.id)).toEqual([0, 2])
  })
})

describe('slicePath', () => {
  it('starts a slice at the top of the circle', () => {
    // Twelve o'clock on a radius-100 wheel is (100, 0) — the pointer's position.
    expect(slicePath(100, 0, 90).startsWith('M 100 100 L 100 0 ')).toBe(true)
  })

  it('sets the large-arc flag only past a half turn', () => {
    expect(slicePath(100, 0, 90)).toContain('0 0 1')
    expect(slicePath(100, 0, 270)).toContain('0 1 1')
  })

  it('draws a whole circle as two arcs', () => {
    // One arc from a point back to itself has no defined sweep and renders as
    // nothing, which would leave a single-name wheel blank.
    const path = slicePath(100, 0, 360)
    expect(path.match(/A /g)).toHaveLength(2)
    expect(path).not.toContain('L ')
  })
})

describe('sliceColor', () => {
  it('gives every slice its own hue on a small wheel', () => {
    const seen = new Set(Array.from({ length: 8 }, (_, i) => sliceColor(i, 8)))
    expect(seen.size).toBe(8)
  })

  it('holds lightness and chroma constant', () => {
    for (let i = 0; i < 30; i++)
      expect(sliceColor(i, 30).startsWith('oklch(0.86 0.09 ')).toBe(true)
  })

  it('keeps neighbours apart on a crowded wheel', () => {
    const hue = (index: number) => Number(/ (\d+\.\d)\)$/.exec(sliceColor(index, 40))![1])
    for (let i = 1; i < 40; i++) {
      const delta = Math.abs(hue(i) - hue(i - 1))
      expect(Math.min(delta, 360 - delta)).toBeGreaterThan(60)
    }
  })
})
