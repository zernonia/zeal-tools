import type { ByteSource } from './random'
import { describe, expect, it } from 'vitest'
import {
  ADVANTAGE,
  createRandomBelow,
  currentStreak,
  describeRoll,
  DiceNotationError,
  DISADVANTAGE,
  flipCoins,
  generateNumbers,
  longestStreak,
  MAX_OUTCOMES,
  numberGrid,
  parseDice,
  restorePlus,
  rollDice,
  runRandom,
  summarise,
  tally,
} from '.'

/** Hands out the given bytes in order, looping. */
function sequence(bytes: number[]): ByteSource {
  let i = 0
  return (out) => {
    for (let j = 0; j < out.length; j++)
      out[j] = bytes[i++ % bytes.length]!
  }
}

/** mulberry32 — a small seeded PRNG, so the statistical test is repeatable. */
function seeded(seed: number): ByteSource {
  let state = seed >>> 0
  return (out) => {
    for (let j = 0; j < out.length; j++) {
      state = (state + 0x6D2B79F5) >>> 0
      let t = state
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      out[j] = ((t ^ (t >>> 14)) >>> 0) & 0xFF
    }
  }
}

const options = { min: 1, max: 100, count: 1, unique: false, sort: 'none' as const, decimals: 0 }

describe('createRandomBelow', () => {
  it('rejects out-of-range values instead of folding them back with a modulo', () => {
    // n = 6 needs 3 bits; 6 and 7 must be thrown away, not mapped to 0 and 1.
    const below = createRandomBelow(sequence([7, 6, 5]))
    expect(below(6)).toBe(5)
  })

  it('masks off the bits it does not need', () => {
    // 0xFF masked to 3 bits is 7 — rejected for n = 6; 0xF9 masked is 1.
    expect(createRandomBelow(sequence([0xFF, 0xF9]))(6)).toBe(1)
  })

  it('is exactly uniform over every possible byte', () => {
    // Feed each of the 256 byte values once: a modulo would give 0–3 one more
    // hit than 4–5 for n = 6. Rejection gives every outcome the same count.
    for (const n of [2, 3, 5, 6, 7, 10, 100, 200, 255, 256]) {
      const source = sequence(Array.from({ length: 256 }, (_, i) => i))
      const below = createRandomBelow(source)
      const counts = Array.from<number>({ length: n }).fill(0)
      // Every n consumes exactly 256 bytes for 256·(n / 2^bits) accepted draws.
      const bits = Math.ceil(Math.log2(n))
      const accepted = 256 * n / 2 ** bits
      for (let i = 0; i < accepted; i++)
        counts[below(n)]!++
      expect(new Set(counts).size, `n = ${n}`).toBe(1)
    }
  })

  it('always returns 0 for a single outcome, without reading anything', () => {
    let reads = 0
    const below = createRandomBelow(() => { reads++ })
    expect(below(1)).toBe(0)
    expect(reads).toBe(0)
  })

  it('reaches the top of a 2^53 range exactly', () => {
    // Seven 0xFF bytes masked to 53 bits is 2^53 − 1, the largest outcome.
    const below = createRandomBelow(sequence([0xFF]))
    expect(below(MAX_OUTCOMES)).toBe(MAX_OUTCOMES - 1)
    // 2^32 + 1 outcomes need 33 bits: five bytes, the first masked to one bit.
    expect(createRandomBelow(sequence([0x01, 0, 0, 0, 0]))(2 ** 32 + 1)).toBe(2 ** 32)
  })

  it('refuses impossible ranges', () => {
    const below = createRandomBelow(sequence([0]))
    expect(() => below(0)).toThrow(RangeError)
    expect(() => below(1.5)).toThrow(RangeError)
    expect(() => below(MAX_OUTCOMES * 2)).toThrow(RangeError)
  })

  it('passes a chi-square test over a seeded source', () => {
    // 60,000 rolls of a d6 and 70,000 draws from 1–7. The critical value at
    // p = 0.001 is 20.52 for 5 degrees of freedom and 22.46 for 6.
    for (const [n, critical] of [[6, 20.52], [7, 22.46]] as const) {
      const below = createRandomBelow(seeded(0xC0FFEE + n))
      const draws = n * 10_000
      const counts = Array.from<number>({ length: n }).fill(0)
      for (let i = 0; i < draws; i++)
        counts[below(n)]!++
      const expected = draws / n
      const chi = counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0)
      expect(chi, `n = ${n}`).toBeLessThan(critical)
    }
  })
})

describe('generateNumbers', () => {
  const below = () => createRandomBelow(seeded(42))

  it('stays within an inclusive range and reaches both ends', () => {
    const { numbers } = generateNumbers({ ...options, min: 1, max: 3, count: 1000 }, below())
    expect(Math.min(...numbers)).toBe(1)
    expect(Math.max(...numbers)).toBe(3)
  })

  it('handles negative ranges', () => {
    const { numbers } = generateNumbers({ ...options, min: -5, max: -2, count: 500 }, below())
    expect(numbers.every(n => n >= -5 && n <= -2)).toBe(true)
  })

  it('draws without repeats when unique', () => {
    const { numbers } = generateNumbers({ ...options, min: 1, max: 50, count: 50, unique: true }, below())
    expect(new Set(numbers).size).toBe(50)
    expect([...numbers].sort((a, b) => a - b)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1))
  })

  it('draws unique numbers from an enormous range without allocating it', () => {
    const { numbers } = generateNumbers({ ...options, min: 0, max: 1e15, count: 1000, unique: true }, below())
    expect(new Set(numbers).size).toBe(1000)
  })

  it('explains when the range is too small for unique numbers', () => {
    expect(() => generateNumbers({ ...options, min: 1, max: 6, count: 7, unique: true }, below()))
      .toThrow(/only 6 whole numbers from 1 to 6/)
    expect(() => generateNumbers({ ...options, min: 0, max: 1, count: 12, unique: true, decimals: 1 }, below()))
      .toThrow(/only 11 values to 1 decimal place/)
  })

  it('sorts when asked', () => {
    const asc = generateNumbers({ ...options, count: 30, sort: 'asc' }, below()).numbers
    expect(asc).toEqual([...asc].sort((a, b) => a - b))
    const desc = generateNumbers({ ...options, count: 30, sort: 'desc' }, below()).numbers
    expect(desc).toEqual([...desc].sort((a, b) => b - a))
  })

  it('produces fixed decimal places on an even grid', () => {
    const { numbers, formatted, possible } = generateNumbers({ ...options, min: 0, max: 1, count: 500, decimals: 2 }, below())
    expect(possible).toBe(101)
    expect(formatted.every(text => /^[01]\.\d{2}$/.test(text))).toBe(true)
    expect(numbers.every(n => n >= 0 && n <= 1)).toBe(true)
    expect(generateNumbers({ ...options, min: 0.1, max: 0.3, decimals: 1 }, below()).possible).toBe(3)
  })

  it('accepts the full safe-integer range', () => {
    const max = Number.MAX_SAFE_INTEGER
    expect(numberGrid(-(2 ** 52), 2 ** 52 - 1, 0).possible).toBe(MAX_OUTCOMES)
    // One more value is a span of exactly 2^53, where span + 1 would round.
    expect(() => numberGrid(-(2 ** 52), 2 ** 52, 0)).toThrow(/too wide/)
    expect(() => numberGrid(-max, max, 0)).toThrow(/too wide/)
    const { numbers } = generateNumbers({ ...options, min: 0, max, count: 100 }, below())
    expect(numbers.every(n => Number.isSafeInteger(n) && n >= 0)).toBe(true)
  })

  it('validates its input', () => {
    expect(() => generateNumbers({ ...options, min: 10, max: 1 }, below())).toThrow(/larger than the maximum/)
    expect(() => generateNumbers({ ...options, count: 0 }, below())).toThrow(/Count/)
    expect(() => generateNumbers({ ...options, count: 1001 }, below())).toThrow(/Count/)
    expect(() => generateNumbers({ ...options, min: Number.NaN }, below())).toThrow(/must be numbers/)
    expect(() => generateNumbers({ ...options, decimals: 11 }, below())).toThrow(/Decimal places/)
    expect(() => generateNumbers({ ...options, max: 1e17 }, below())).toThrow(/between/)
    expect(() => generateNumbers({ ...options, max: 1e12, decimals: 6 }, below())).toThrow(/fewer places/)
  })

  it('is fair across the range, not just within it', () => {
    const { numbers } = generateNumbers({ ...options, min: 1, max: 10, count: 1000 }, createRandomBelow(seeded(7)))
    const more = generateNumbers({ ...options, min: 1, max: 10, count: 1000 }, createRandomBelow(seeded(8))).numbers
    const counts = Array.from<number>({ length: 10 }).fill(0)
    for (const n of [...numbers, ...more])
      counts[n - 1]!++
    const chi = counts.reduce((sum, c) => sum + (c - 200) ** 2 / 200, 0)
    expect(chi).toBeLessThan(27.88) // p = 0.001, 9 degrees of freedom
  })
})

describe('coins', () => {
  it('flips heads for an even bit and tails for an odd one', () => {
    const result = flipCoins(4, createRandomBelow(sequence([0, 1, 2, 3])))
    expect(result.flips).toEqual(['heads', 'tails', 'heads', 'tails'])
    expect(result.heads).toBe(2)
    expect(result.tails).toBe(2)
  })

  it('counts the longest streak, earliest on a tie', () => {
    expect(longestStreak([])).toBeNull()
    expect(longestStreak(['heads'])).toEqual({ side: 'heads', length: 1 })
    expect(longestStreak(['heads', 'tails', 'tails', 'heads', 'heads', 'heads', 'tails']))
      .toEqual({ side: 'heads', length: 3 })
    expect(longestStreak(['tails', 'tails', 'heads', 'heads'])).toEqual({ side: 'tails', length: 2 })
    expect(longestStreak(['tails', 'heads', 'heads', 'heads', 'heads'])).toEqual({ side: 'heads', length: 4 })
  })

  it('reports the run the sequence is currently on', () => {
    expect(currentStreak([])).toBeNull()
    expect(currentStreak(['heads', 'tails', 'tails'])).toEqual({ side: 'tails', length: 2 })
  })

  it('tallies a history', () => {
    expect(tally(['heads', 'heads', 'tails'])).toMatchObject({ heads: 2, tails: 1, longest: { side: 'heads', length: 2 } })
  })

  it('is close to even over many flips', () => {
    const { heads } = flipCoins(10_000, createRandomBelow(seeded(99)))
    // Five standard deviations either side of 5,000 is ±250.
    expect(Math.abs(heads - 5000)).toBeLessThan(250)
  })

  it('validates the count', () => {
    const below = createRandomBelow(seeded(1))
    expect(() => flipCoins(0, below)).toThrow(RangeError)
    expect(() => flipCoins(10_001, below)).toThrow(RangeError)
  })
})

describe('parseDice', () => {
  it.each([
    ['d20', 'd20'],
    ['D20', 'd20'],
    ['1d20', 'd20'],
    ['2d6+3', '2d6+3'],
    [' 2 d 6 + 3 ', '2d6+3'],
    ['4d6', '4d6'],
    ['d100', 'd100'],
    ['d%', 'd100'],
    ['3d%-2', '3d100-2'],
    ['4d6kh3', '4d6kh3'],
    ['4d6k3', '4d6kh3'],
    ['2d20kl1', '2d20kl1'],
    ['1d8+2d6-1', 'd8+2d6-1'],
    ['-d4+10', '-d4+10'],
    ['+5', '5'],
  ])('parses %s as %s', (input, notation) => {
    expect(parseDice(input).notation).toBe(notation)
  })

  it('reads the structure, not just the text', () => {
    expect(parseDice('4d6kh3-2').terms).toEqual([
      { kind: 'dice', sign: 1, count: 4, sides: 6, keep: { which: 'highest', count: 3 } },
      { kind: 'constant', sign: -1, value: 2 },
    ])
  })

  it.each([
    ['', /Enter some dice/],
    ['d', /number of sides/],
    ['2d', /number of sides/],
    ['2d6+', /after "\+"/],
    ['2d6x', /Expected \+ or −/],
    ['abc', /Unexpected "a"/],
    ['0d6', /between 1 and 100 dice/],
    ['101d6', /between 1 and 100 dice/],
    ['d1', /from 2 to 1,000 sides/],
    ['d1001', /from 2 to 1,000 sides/],
    ['4d6kh5', /keep between 1 and 4/],
    ['4d6kh0', /keep between 1 and 4/],
    ['4d6kh', /how many dice to keep/],
    ['d6+9999999999', /far too large/],
    ['d6+2000000', /at most 1,000,000/],
    [Array.from({ length: 13 }).fill('d6').join('+'), /At most 12/],
  ])('rejects %j', (input, message) => {
    expect(() => parseDice(input)).toThrow(message)
    expect(() => parseDice(input)).toThrow(DiceNotationError)
  })

  it('points at where the notation went wrong', () => {
    try {
      parseDice('2d6+3x')
      expect.unreachable()
    }
    catch (error) {
      expect((error as DiceNotationError).position).toBe(5)
    }
  })
})

describe('rollDice', () => {
  it('adds dice and modifiers', () => {
    // below(6) with masked bytes 3 and 1 → faces 4 and 2.
    const roll = rollDice('2d6+3', createRandomBelow(sequence([3, 1])))
    expect(roll.groups[0]!.rolls).toEqual([4, 2])
    expect(roll.total).toBe(9)
    expect(roll.range).toEqual({ min: 5, max: 15 })
    expect(describeRoll(roll)).toBe('2d6+3: [4, 2] + 3 = 9')
  })

  it('keeps the highest three of 4d6 and shows the dropped die', () => {
    const roll = rollDice('4d6kh3', createRandomBelow(sequence([0, 5, 2, 0])))
    expect(roll.groups[0]!.rolls).toEqual([1, 6, 3, 1])
    // Ties go to the earlier die: the first 1 is kept, the second dropped.
    expect(roll.groups[0]!.kept).toEqual([true, true, true, false])
    expect(roll.total).toBe(10)
    expect(roll.range).toEqual({ min: 3, max: 18 })
    expect(describeRoll(roll)).toBe('4d6kh3: [1, 6, 3, (1)] = 10')
  })

  it('rolls with advantage and disadvantage', () => {
    const faces = sequence([4, 16]) // 5 and 17
    expect(rollDice(ADVANTAGE, createRandomBelow(faces)).total).toBe(17)
    expect(rollDice(DISADVANTAGE, createRandomBelow(sequence([4, 16]))).total).toBe(5)
  })

  it('subtracts negative groups and reports the range correctly', () => {
    const roll = rollDice('d8-d4', createRandomBelow(sequence([7, 3])))
    expect(roll.total).toBe(8 - 4)
    expect(roll.range).toEqual({ min: 1 - 4, max: 8 - 1 })
    expect(describeRoll(roll)).toBe('d8-d4: [8] − [4] = 4')
  })

  it('rolls percentile dice from 1 to 100', () => {
    const below = createRandomBelow(seeded(5))
    const totals = Array.from({ length: 5000 }, () => rollDice('d%', below).total)
    expect(Math.min(...totals)).toBe(1)
    expect(Math.max(...totals)).toBe(100)
  })

  it('stays within the advertised range', () => {
    const below = createRandomBelow(seeded(11))
    for (const notation of ['3d6', '4d6kh3', '2d20kl1', 'd12-d4+2', '-2d6']) {
      for (let i = 0; i < 500; i++) {
        const roll = rollDice(notation, below)
        expect(roll.total).toBeGreaterThanOrEqual(roll.range.min)
        expect(roll.total).toBeLessThanOrEqual(roll.range.max)
      }
    }
  })
})

describe('runRandom', () => {
  const below = () => createRandomBelow(seeded(3))

  it('defaults to one number from 1 to 100', () => {
    const result = runRandom({}, below())
    expect(result.mode).toBe('numbers')
    if (result.mode === 'numbers') {
      expect(result.numbers).toHaveLength(1)
      expect(result.numbers[0]).toBeGreaterThanOrEqual(1)
      expect(result.numbers[0]).toBeLessThanOrEqual(100)
    }
  })

  it('reads query strings and JSON alike', () => {
    const fromQuery = runRandom({ min: '1', max: '10', count: '10', unique: 'true', sort: 'asc' }, below())
    const fromJson = runRandom({ min: 1, max: 10, count: 10, unique: true, sort: 'asc' }, below())
    expect(fromQuery).toMatchObject({ numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })
    expect(fromJson).toMatchObject({ numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })
  })

  it('flips coins and rolls dice', () => {
    expect(runRandom({ coin: '5' }, below())).toMatchObject({ mode: 'coin' })
    expect(runRandom({ coin: true }, below())).toMatchObject({ mode: 'coin', flips: [expect.any(String)] })
    const dice = runRandom({ dice: '2d6+3' }, below())
    expect(dice).toMatchObject({ mode: 'dice', notation: '2d6+3' })
    expect(summarise(dice)).toMatch(/^2d6\+3: \[\d, \d\] \+ 3 = \d+$/)
  })

  it('puts back a + that a query string turned into a space', () => {
    expect(restorePlus('2d6 3')).toBe('2d6+3')
    expect(restorePlus('d8 2d6 1')).toBe('d8+2d6+1')
    expect(restorePlus('2d6 - 1')).toBe('2d6 - 1')
    expect(runRandom({ dice: '2d6 3' }, below())).toMatchObject({ notation: '2d6+3' })
  })

  it('rejects contradictions and nonsense with a message', () => {
    expect(() => runRandom({ coin: '1', dice: 'd6' }, below())).toThrow(/not both/)
    expect(() => runRandom({ max: 'lots' }, below())).toThrow(/max must be a number/)
    expect(() => runRandom({ sort: 'random' }, below())).toThrow(/sort must be/)
    expect(() => runRandom({ dice: '2x6' }, below())).toThrow(DiceNotationError)
  })

  it('summarises for an agent', () => {
    expect(summarise(runRandom({ coin: 1 }, createRandomBelow(sequence([0]))))).toBe('heads')
    expect(summarise(runRandom({ min: 5, max: 5, count: 3 }, below()))).toBe('5, 5, 5')
  })
})
