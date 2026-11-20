import { describe, expect, it } from 'vitest'
import { coinShares, d6Pips, dieFacets, dieLabelY, dieOutline, dieShape, rangePosition } from './index'

describe('dieShape', () => {
  it('names the polyhedron for the common dice', () => {
    expect([4, 6, 8, 10, 12, 20].map(dieShape)).toEqual(['d4', 'd6', 'd8', 'd10', 'd12', 'd20'])
  })

  it('draws a d100 as the d10 it is', () => {
    expect(dieShape(100)).toBe('d10')
  })

  it('falls back for dice with no common shape', () => {
    expect(dieShape(3)).toBe('other')
    expect(dieShape(7)).toBe('other')
    expect(dieShape(1000)).toBe('other')
  })
})

describe('dieOutline', () => {
  it('has as many corners as the silhouette', () => {
    const corners = (shape: Parameters<typeof dieOutline>[0]) => dieOutline(shape).split(' ').length
    expect(corners('d4')).toBe(3)
    expect(corners('d8')).toBe(4)
    expect(corners('d10')).toBe(4)
    expect(corners('d12')).toBe(5)
    expect(corners('d20')).toBe(6)
  })

  it('stays inside the 100 × 100 box', () => {
    for (const shape of ['d4', 'd8', 'd10', 'd12', 'd20', ...[]] as const) {
      const points = [dieOutline(shape), ...dieFacets(shape)].join(' ').split(/[ ,]/).map(Number)
      expect(points.every(p => p >= 0 && p <= 100)).toBe(true)
    }
  })

  it('leaves the square dice to the component', () => {
    expect(dieOutline('d6')).toBe('')
    expect(dieOutline('other')).toBe('')
  })

  it('puts the number where each shape has room for it', () => {
    expect(dieLabelY('d4')).toBeGreaterThan(50)
    expect(dieLabelY('d10')).toBeLessThan(50)
    expect(dieLabelY('d20')).toBe(50)
  })
})

describe('d6Pips', () => {
  it('has as many pips as the value', () => {
    for (let value = 1; value <= 6; value++)
      expect(d6Pips(value)).toHaveLength(value)
  })

  it('lays the faces out as real dice do', () => {
    expect(d6Pips(1)).toEqual([[1, 1]])
    // Odd faces have a centre pip; even faces never do.
    for (let value = 1; value <= 6; value++)
      expect(d6Pips(value).some(([x, y]) => x === 1 && y === 1)).toBe(value % 2 === 1)
    // Every face is symmetric under a half turn.
    for (let value = 1; value <= 6; value++) {
      const pips = d6Pips(value).map(([x, y]) => `${x},${y}`).sort()
      const turned = d6Pips(value).map(([x, y]) => `${2 - x},${2 - y}`).sort()
      expect(turned).toEqual(pips)
    }
  })

  it('has no pips for values a d6 cannot show', () => {
    expect(d6Pips(0)).toEqual([])
    expect(d6Pips(7)).toEqual([])
  })
})

describe('rangePosition', () => {
  it('places a value along its range', () => {
    expect(rangePosition(1, 1, 100)).toBe(0)
    expect(rangePosition(100, 1, 100)).toBe(1)
    expect(rangePosition(0, -10, 10)).toBe(0.5)
  })

  it('clamps, and centres a range of one value', () => {
    expect(rangePosition(200, 1, 100)).toBe(1)
    expect(rangePosition(-5, 1, 100)).toBe(0)
    expect(rangePosition(7, 7, 7)).toBe(0.5)
  })
})

describe('coinShares', () => {
  it('always adds up to 100', () => {
    expect(coinShares(1, 2)).toEqual({ heads: 33, tails: 67 })
    expect(coinShares(2, 1)).toEqual({ heads: 67, tails: 33 })
    expect(coinShares(1, 0)).toEqual({ heads: 100, tails: 0 })
  })

  it('is null before any flip', () => {
    expect(coinShares(0, 0)).toBeNull()
  })
})
