/**
 * An independent decoder, written for this file only, and used to round-trip
 * the encoders over thousands of random inputs.
 *
 * "Independent" is meant literally wherever the specifications allow it. The
 * decoder reads bar *widths*, as a scanner does, not module strings, and it
 * builds its own tables:
 *
 * - EAN/UPC: the L-code table is written here as widths (space, bar, space,
 *   bar), not copied from the encoder's bit strings. G and R are derived from
 *   it by the specification's symmetry rules, and the parity tables are
 *   retyped in L/G form.
 * - Code 39: the table is *generated* from the symbology's structure — five
 *   bar patterns crossed with the position of the one wide space — so it
 *   shares nothing with the encoder's literal table.
 * - ITF: digits are read by the 1-2-4-7-0 weights that define 2 of 5.
 * - Code 128: the 107 patterns have no algebraic structure, so the decoder
 *   looks them up in the encoder's table. That table is pinned separately in
 *   code128.test.ts (golden start/stop patterns, eleven modules each, even
 *   bar parity, all distinct). Set logic, SHIFT and the checksum here are
 *   the decoder's own.
 *
 * Check digits are verified with a formulation different from the encoder's:
 * the weighted sum of every digit, check included, must be a multiple of ten.
 */
import { Resvg } from '@resvg/resvg-js'
import { describe, expect, it } from 'vitest'
import { CODE128_PATTERNS, planCode128 } from './code128'
import { encodeBarcode, renderSvg } from './index'

// ── Reading widths ─────────────────────────────────────────────────────────

function runs(modules: string): number[] {
  expect(modules[0]).toBe('1')
  expect(modules.at(-1)).toBe('1')
  const out: number[] = []
  let count = 1
  for (let i = 1; i < modules.length; i++) {
    if (modules[i] === modules[i - 1]) {
      count++
    }
    else {
      out.push(count)
      count = 1
    }
  }
  out.push(count)
  return out
}

function gs1Valid(code: string): boolean {
  let sum = 0
  for (let i = 0; i < code.length; i++)
    sum += Number(code[i]) * ((code.length - i) % 2 === 0 ? 3 : 1)
  return sum % 10 === 0
}

// ── EAN / UPC ──────────────────────────────────────────────────────────────

/** L codes as widths: space, bar, space, bar. */
const L_WIDTHS = ['3211', '2221', '2122', '1411', '1132', '1231', '1114', '1312', '1213', '3112']

/** Left-half digit (space first) → digit and parity. G is L's widths reversed. */
function leftDigit(w: number[]): { digit: number, parity: 'L' | 'G' } {
  const key = w.join('')
  const l = L_WIDTHS.indexOf(key)
  if (l >= 0)
    return { digit: l, parity: 'L' }
  const g = L_WIDTHS.indexOf([...key].reverse().join(''))
  if (g >= 0)
    return { digit: g, parity: 'G' }
  throw new Error(`unreadable left digit ${key}`)
}

/** Right-half digit (bar first). R is L complemented, so its widths read the same. */
function rightDigit(w: number[]): number {
  const r = L_WIDTHS.indexOf(w.join(''))
  if (r < 0)
    throw new Error(`unreadable right digit ${w.join('')}`)
  return r
}

const LEADING: Record<string, number> = {
  LLLLLL: 0,
  LLGLGG: 1,
  LLGGLG: 2,
  LLGGGL: 3,
  LGLLGG: 4,
  LGGLLG: 5,
  LGGGLL: 6,
  LGLGLG: 7,
  LGLGGL: 8,
  LGGLGL: 9,
}

function expectGuard(w: number[], at: number, count: number) {
  expect(w.slice(at, at + count), `guard at element ${at}`).toEqual(Array.from({ length: count }).fill(1))
}

function decodeEan13(modules: string): string {
  expect(modules).toHaveLength(95)
  const w = runs(modules)
  expect(w).toHaveLength(59)
  expectGuard(w, 0, 3)
  expectGuard(w, 27, 5)
  expectGuard(w, 56, 3)
  let parity = ''
  let digits = ''
  for (let i = 0; i < 6; i++) {
    const { digit, parity: p } = leftDigit(w.slice(3 + i * 4, 7 + i * 4))
    parity += p
    digits += digit
  }
  for (let i = 0; i < 6; i++)
    digits += rightDigit(w.slice(32 + i * 4, 36 + i * 4))
  const lead = LEADING[parity]
  expect(lead, `parity ${parity}`).toBeDefined()
  const code = `${lead}${digits}`
  expect(gs1Valid(code), `check digit of ${code}`).toBe(true)
  return code
}

function decodeEan8(modules: string): string {
  expect(modules).toHaveLength(67)
  const w = runs(modules)
  expect(w).toHaveLength(43)
  expectGuard(w, 0, 3)
  expectGuard(w, 19, 5)
  expectGuard(w, 40, 3)
  let code = ''
  for (let i = 0; i < 4; i++) {
    const { digit, parity } = leftDigit(w.slice(3 + i * 4, 7 + i * 4))
    expect(parity).toBe('L')
    code += digit
  }
  for (let i = 0; i < 4; i++)
    code += rightDigit(w.slice(24 + i * 4, 28 + i * 4))
  expect(gs1Valid(code)).toBe(true)
  return code
}

/** UPC-E parity by check digit for number system 0; number system 1 is the inverse. */
const UPCE_NS0 = ['GGGLLL', 'GGLGLL', 'GGLLGL', 'GGLLLG', 'GLGGLL', 'GLLGGL', 'GLLLGG', 'GLGLGL', 'GLGLLG', 'GLLGLG']

/** Written from the spec's prose (manufacturer / item number), not from the encoder. */
function upcEToA(ns: string, e: string): string {
  const last = Number(e[5])
  let manufacturer: string
  let item: string
  if (last <= 2) {
    manufacturer = `${e.slice(0, 2) + e[5]}00`
    item = `00${e.slice(2, 5)}`
  }
  else if (last === 3) {
    manufacturer = `${e.slice(0, 3)}00`
    item = `000${e.slice(3, 5)}`
  }
  else if (last === 4) {
    manufacturer = `${e.slice(0, 4)}0`
    item = `0000${e[4]}`
  }
  else {
    manufacturer = e.slice(0, 5)
    item = `0000${e[5]}`
  }
  return ns + manufacturer + item
}

function decodeUpcE(modules: string): string {
  expect(modules).toHaveLength(51)
  const w = runs(modules)
  expect(w).toHaveLength(33)
  expectGuard(w, 0, 3)
  expectGuard(w, 27, 6)
  let parity = ''
  let six = ''
  for (let i = 0; i < 6; i++) {
    const { digit, parity: p } = leftDigit(w.slice(3 + i * 4, 7 + i * 4))
    parity += p
    six += digit
  }
  const inverse = [...parity].map(p => (p === 'L' ? 'G' : 'L')).join('')
  let ns: string
  let check = UPCE_NS0.indexOf(parity)
  if (check >= 0) {
    ns = '0'
  }
  else {
    check = UPCE_NS0.indexOf(inverse)
    ns = '1'
  }
  expect(check, `parity ${parity}`).toBeGreaterThanOrEqual(0)
  expect(gs1Valid(upcEToA(ns, six) + check)).toBe(true)
  return `${ns}${six}${check}`
}

// ── Code 128 ───────────────────────────────────────────────────────────────

function decodeCode128(modules: string): { text: string, values: number[] } {
  const w = runs(modules)
  // 6 elements per symbol, 7 for the stop.
  expect((w.length - 7) % 6).toBe(0)
  const values: number[] = []
  for (let i = 0; i < w.length - 7; i += 6) {
    const value = CODE128_PATTERNS.indexOf(w.slice(i, i + 6).join('') as never)
    expect(value, `symbol at element ${i}`).toBeGreaterThanOrEqual(0)
    values.push(value)
  }
  expect(w.slice(-7).join('')).toBe('2331112')

  const check = values.at(-1)!
  const body = values.slice(0, -1)
  let sum = body[0]!
  body.forEach((v, i) => {
    if (i > 0)
      sum += v * i
  })
  expect(sum % 103, 'mod-103 check').toBe(check)

  const startSet = { 103: 'A', 104: 'B', 105: 'C' }[body[0]!] as 'A' | 'B' | 'C' | undefined
  expect(startSet).toBeDefined()
  let set = startSet!
  let shifted: 'A' | 'B' | null = null
  let text = ''
  const charIn = (s: 'A' | 'B', v: number) => String.fromCharCode(s === 'A' ? (v < 64 ? v + 32 : v - 64) : v + 32)
  for (const v of body.slice(1)) {
    if (shifted) {
      text += charIn(shifted, v)
      shifted = null
      continue
    }
    if (set === 'C') {
      if (v < 100)
        text += String(v).padStart(2, '0')
      else if (v === 100)
        set = 'B'
      else if (v === 101)
        set = 'A'
      else throw new Error(`unexpected ${v} in set C`)
      continue
    }
    if (v < 96)
      text += charIn(set, v)
    else if (v === 98)
      shifted = set === 'A' ? 'B' : 'A'
    else if (v === 99)
      set = 'C'
    else if (v === 100 && set === 'A')
      set = 'B'
    else if (v === 101 && set === 'B')
      set = 'A'
    else throw new Error(`unexpected function value ${v} in set ${set}`)
  }
  return { text, values }
}

/**
 * Fewest data symbols (start included) for `input`, by Dijkstra's algorithm
 * over (position, set) with a bucket queue — a different formulation from
 * the encoder's forward relaxation, used to confirm it is optimal.
 */
function fewestSymbols(input: string): number {
  const n = input.length
  const codes = [...input].map(c => c.charCodeAt(0))
  const okA = (c: number) => c <= 95
  const okB = (c: number) => c >= 32 && c <= 127
  const digit = (c: number) => c >= 48 && c <= 57
  type State = [pos: number, set: 'A' | 'B' | 'C']
  const buckets: State[][] = []
  const done = new Set<string>()
  const push = (cost: number, state: State) => (buckets[cost] ??= []).push(state)
  for (const set of ['A', 'B', 'C'] as const)
    push(1, [0, set])
  for (let cost = 1; cost < buckets.length; cost++) {
    for (const [pos, set] of buckets[cost] ?? []) {
      const key = `${pos}${set}`
      if (done.has(key))
        continue
      done.add(key)
      if (pos === n)
        return cost
      for (const other of ['A', 'B', 'C'] as const) {
        if (other !== set)
          push(cost + 1, [pos, other])
      }
      const c = codes[pos]!
      if (set === 'C') {
        if (pos + 1 < n && digit(c) && digit(codes[pos + 1]!))
          push(cost + 1, [pos + 2, 'C'])
        continue
      }
      const here = set === 'A' ? okA(c) : okB(c)
      const there = set === 'A' ? okB(c) : okA(c)
      if (here)
        push(cost + 1, [pos + 1, set])
      else if (there)
        push(cost + 2, [pos + 1, set]) // SHIFT + the character
    }
  }
  throw new Error(`no encoding for ${JSON.stringify(input)}`)
}

// ── Code 39 ────────────────────────────────────────────────────────────────

/** Generated from structure: which two of five bars are wide, and which of four spaces. */
function buildCode39Table(): Map<string, string> {
  const barPairs = [[0, 4], [1, 4], [0, 1], [2, 4], [0, 2], [1, 2], [3, 4], [0, 3], [1, 3], [2, 3]]
  const groups: [number, string][] = [[1, '1234567890'], [2, 'ABCDEFGHIJ'], [3, 'KLMNOPQRST'], [0, 'UVWXYZ-. *']]
  const table = new Map<string, string>()
  const key = (wideBars: number[], wideSpaces: number[]) => {
    let k = ''
    for (let e = 0; e < 9; e++) {
      const wide = e % 2 === 0 ? wideBars.includes(e / 2) : wideSpaces.includes((e - 1) / 2)
      k += wide ? 'w' : 'n'
    }
    return k
  }
  for (const [space, chars] of groups) {
    barPairs.forEach((bars, i) => table.set(key(bars, [space]), chars[i]!))
  }
  // All bars narrow, three of four spaces wide: the narrow one picks the character.
  const specials: [number, string][] = [[3, '$'], [2, '/'], [1, '+'], [0, '%']]
  for (const [narrow, ch] of specials)
    table.set(key([], [0, 1, 2, 3].filter(s => s !== narrow)), ch)
  return table
}
const CODE39_TABLE = buildCode39Table()
const CODE39_VALUES = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%'

function decodeCode39(modules: string, withCheck: boolean): string {
  const w = runs(modules)
  expect((w.length + 1) % 10).toBe(0)
  const narrow = Math.min(...w)
  let out = ''
  for (let i = 0; i < w.length; i += 10) {
    const k = w.slice(i, i + 9).map(x => (x > narrow * 1.5 ? 'w' : 'n')).join('')
    const ch = CODE39_TABLE.get(k)
    expect(ch, `character ${k}`).toBeDefined()
    out += ch
    if (i + 9 < w.length)
      expect(w[i + 9], 'inter-character gap').toBe(narrow)
  }
  expect(out[0]).toBe('*')
  expect(out.at(-1)).toBe('*')
  let data = out.slice(1, -1)
  if (withCheck) {
    const check = data.at(-1)!
    data = data.slice(0, -1)
    const sum = [...data].reduce((s, c) => s + CODE39_VALUES.indexOf(c), 0)
    expect(CODE39_VALUES[sum % 43]).toBe(check)
  }
  return data
}

// ── ITF ────────────────────────────────────────────────────────────────────

function itfDigit(wides: boolean[]): number {
  expect(wides.filter(Boolean)).toHaveLength(2)
  const weights = [1, 2, 4, 7, 0]
  const sum = wides.reduce((s, wide, i) => s + (wide ? weights[i]! : 0), 0)
  return sum === 11 ? 0 : sum
}

function decodeItf(modules: string): string {
  const w = runs(modules)
  const narrow = Math.min(...w)
  expect(w.slice(0, 4)).toEqual([narrow, narrow, narrow, narrow])
  const stop = w.slice(-3)
  expect(stop[0]).toBeGreaterThan(narrow * 1.5)
  expect(stop.slice(1)).toEqual([narrow, narrow])
  const body = w.slice(4, -3)
  expect(body.length % 10).toBe(0)
  let out = ''
  for (let i = 0; i < body.length; i += 10) {
    const pair = body.slice(i, i + 10).map(x => x > narrow * 1.5)
    out += itfDigit(pair.filter((_, k) => k % 2 === 0))
    out += itfDigit(pair.filter((_, k) => k % 2 === 1))
  }
  expect(gs1Valid(out)).toBe(true)
  return out
}

// ── Random inputs ──────────────────────────────────────────────────────────

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const random = rng(20261120)
const pick = (chars: string) => chars[Math.floor(random() * chars.length)]!
const digits = (n: number) => Array.from({ length: n }, () => pick('0123456789')).join('')

describe('round trip through the independent decoder', () => {
  it('ean-13 — 2,000 random numbers', () => {
    for (let i = 0; i < 2000; i++) {
      const input = digits(12)
      const code = encodeBarcode('ean13', input)
      expect(decodeEan13(code.modules)).toBe(code.data)
      expect(code.data.slice(0, 12)).toBe(input)
    }
  })

  it('upc-a — 1,000 random numbers, decoded as EAN-13 with a leading 0', () => {
    for (let i = 0; i < 1000; i++) {
      const input = digits(11)
      const code = encodeBarcode('upca', input)
      expect(decodeEan13(code.modules)).toBe(`0${code.data}`)
    }
  })

  it('ean-8 — 1,000 random numbers', () => {
    for (let i = 0; i < 1000; i++) {
      const input = digits(7)
      const code = encodeBarcode('ean8', input)
      expect(decodeEan8(code.modules)).toBe(code.data)
    }
  })

  it('upc-e — 1,000 random numbers, both number systems', () => {
    for (let i = 0; i < 1000; i++) {
      const input = pick('01') + digits(6)
      const code = encodeBarcode('upce', input)
      expect(decodeUpcE(code.modules)).toBe(code.data)
      expect(code.data.slice(0, 7)).toBe(input)
    }
  })

  it('upc-e — shortening a UPC-A gives the same bars as typing the short form', () => {
    for (let i = 0; i < 300; i++) {
      const ns = pick('01')
      const six = digits(6)
      const long = upcEToA(ns, six)
      const viaA = encodeBarcode('upce', long)
      expect(upcEToA(viaA.data[0]!, viaA.data.slice(1, 7))).toBe(long)
      expect(decodeUpcE(viaA.modules)).toBe(viaA.data)
    }
  })

  it('itf-14 — 1,000 random numbers', () => {
    for (let i = 0; i < 1000; i++) {
      const code = encodeBarcode('itf14', digits(13))
      expect(code.modules).toHaveLength(135)
      expect(decodeItf(code.modules)).toBe(code.data)
    }
  })

  it('code 39 — 1,000 random strings, with and without the mod-43 check', () => {
    for (let i = 0; i < 1000; i++) {
      const input = Array.from({ length: 1 + Math.floor(random() * 20) }, () => pick(CODE39_VALUES)).join('')
      const withCheck = i % 2 === 0
      const code = encodeBarcode('code39', input, { checkChar: withCheck })
      expect(decodeCode39(code.modules, withCheck)).toBe(input)
    }
  })

  const pools = {
    'digits': '0123456789',
    'digit-heavy': '0123456789012345678901234567890123456789ABC-',
    'printable': Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32)).join(''),
    'full ASCII': Array.from({ length: 128 }, (_, i) => String.fromCharCode(i)).join(''),
    'lower + control': 'abcxyz\t\n\r\u0001',
  }

  for (const [name, pool] of Object.entries(pools)) {
    it(`code 128 — 500 random ${name} strings decode exactly, in the fewest symbols`, () => {
      for (let i = 0; i < 500; i++) {
        const input = Array.from({ length: 1 + Math.floor(random() * 24) }, () => pick(pool)).join('')
        const code = encodeBarcode('code128', input)
        const { text, values } = decodeCode128(code.modules)
        expect(text).toBe(input)
        // values = data symbols + check; the optimum counts data symbols only.
        expect(values.length - 1, JSON.stringify(input)).toBe(fewestSymbols(input))
      }
    })
  }

  it('the plan and the bars agree on what was chosen', () => {
    const steps = planCode128('AB123456')
    expect(steps.map(s => s.kind === 'start' || s.kind === 'switch' ? `${s.kind}:${s.set}` : s.set)).toEqual(
      ['start:B', 'B', 'B', 'switch:C', 'C', 'C', 'C'],
    )
  })
})

// ── Through pixels ─────────────────────────────────────────────────────────

/**
 * Render the SVG, rasterise it with resvg (a separate SVG engine), and read
 * one row of pixels the way a scanner's beam would. This checks the renderer
 * as well as the encoder: bar positions, widths and the quiet zones.
 */
function scanRow(svg: string, moduleWidth: number) {
  const image = new Resvg(svg, { font: { loadSystemFonts: false } }).render()
  const { width, height } = image
  const px = image.pixels
  const y = Math.floor(height * 0.3)
  const dark: boolean[] = []
  for (let x = 0; x < width; x++)
    dark.push(px[(y * width + x) * 4]! < 128)
  const first = dark.indexOf(true)
  const last = dark.lastIndexOf(true)
  const modules = dark.slice(first, last + 1)
    .filter((_, i) => i % moduleWidth === 0)
    .map(d => (d ? '1' : '0'))
    .join('')
  return { modules, leftLight: first, rightLight: width - 1 - last }
}

describe('round trip through rendered pixels', () => {
  const cases = [
    ['ean13', '590123412345'],
    ['upca', '03600029145'],
    ['ean8', '9638507'],
    ['upce', '0425261'],
    ['code128', 'Zeal 2026-11-20 #42'],
    ['code39', 'ZEAL-39'],
  ] as const

  for (const [symbology, data] of cases) {
    it(`${symbology} ${data}: pixels decode, with the specified quiet zones`, () => {
      const w = 3
      const margin = 2
      const code = encodeBarcode(symbology, data)
      const { modules, leftLight, rightLight } = scanRow(renderSvg(code, { moduleWidth: w, margin, showText: false }), w)
      expect(modules).toBe(code.modules)
      expect(leftLight).toBe((margin + code.quietLeft) * w)
      expect(rightLight).toBe((margin + code.quietRight) * w)
    })
  }

  it('itf14: the bearer bars leave the scan line through the bars untouched', () => {
    const code = encodeBarcode('itf14', '1540014128876')
    const { modules } = scanRow(renderSvg(code, { moduleWidth: 2, showText: false }), 2)
    expect(decodeItf(modules)).toBe('15400141288763')
  })
})
