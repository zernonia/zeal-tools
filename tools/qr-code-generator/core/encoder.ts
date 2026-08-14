/**
 * QR Code encoder — a from-scratch, zero-dependency implementation of
 * ISO/IEC 18004 (model 2, versions 1–40).
 *
 * Pipeline: text → segments (numeric / alphanumeric / byte) → data codewords
 * → Reed–Solomon error correction over GF(256) → interleaved codewords
 * → module matrix (function patterns + data placement) → best of 8 masks
 * by penalty score.
 *
 * Pure functions, no DOM, no imports — runs identically in the browser,
 * in Nitro server routes, and behind the MCP endpoint.
 */

export type EcLevel = 'L' | 'M' | 'Q' | 'H'

export interface QrMatrix {
  /** Side length in modules (17 + 4·version). */
  size: number
  /** Row-major module data; 1 = dark. */
  modules: Uint8Array
  version: number
  ecLevel: EcLevel
  mask: number
}

export interface EncodeOptions {
  /** Minimum error-correction level (may be boosted if space allows). */
  ecLevel?: EcLevel
  /** Force a version (1–40); by default the smallest that fits is chosen. */
  minVersion?: number
  maxVersion?: number
  /** When true (default), bump EC level up if the chosen version has room. */
  boostEc?: boolean
  /** Force a mask 0–7; by default all 8 are scored and the best wins. */
  mask?: number
}

// ─── GF(256) arithmetic (polynomial 0x11D) ────────────────────────────────

const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)
{
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255]
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

/**
 * Generator polynomial ∏(x − α^i) for i = 0..degree−1, as descending
 * coefficients with the (always-1) leading term dropped.
 */
function rsDivisor(degree: number): Uint8Array {
  const result = new Uint8Array(degree)
  result[degree - 1] = 1 // start with the monic polynomial "1"
  let root = 1
  for (let i = 0; i < degree; i++) {
    // multiply by (x − α^i): shift left one degree and subtract root·self
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root)
      if (j + 1 < degree) result[j] ^= result[j + 1]
    }
    root = gfMul(root, 2)
  }
  return result
}

/** Reed–Solomon remainder of data · x^degree mod generator. */
function rsRemainder(data: Uint8Array, degree: number): Uint8Array {
  const divisor = rsDivisor(degree)
  const rem = new Uint8Array(degree)
  for (const byte of data) {
    const factor = byte ^ rem[0]
    rem.copyWithin(0, 1)
    rem[degree - 1] = 0
    for (let i = 0; i < degree; i++) rem[i] ^= gfMul(divisor[i], factor)
  }
  return rem
}

// ─── Tables ───────────────────────────────────────────────────────────────

const EC_INDEX: Record<EcLevel, number> = { L: 0, M: 1, Q: 2, H: 3 }
const EC_FORMAT_BITS: Record<EcLevel, number> = { L: 1, M: 0, Q: 3, H: 2 }

// [ecIndex][version] — version index 1..40 (index 0 unused)
const ECC_PER_BLOCK: number[][] = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
]

const NUM_EC_BLOCKS: number[][] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
]

/** Total number of data modules available at a version (before EC split). */
function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2
    result -= (25 * numAlign - 10) * numAlign - 55
    if (version >= 7) result -= 36
  }
  return result
}

function totalCodewords(version: number): number {
  return Math.floor(rawDataModules(version) / 8)
}

function dataCodewords(version: number, ec: EcLevel): number {
  const i = EC_INDEX[ec]
  return totalCodewords(version) - ECC_PER_BLOCK[i][version] * NUM_EC_BLOCKS[i][version]
}

// ─── Segments ─────────────────────────────────────────────────────────────

const ALPHANUMERIC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'

type Mode = 'numeric' | 'alphanumeric' | 'byte'
const MODE_INDICATOR: Record<Mode, number> = { numeric: 1, alphanumeric: 2, byte: 4 }

function charCountBits(mode: Mode, version: number): number {
  const row = version <= 9 ? 0 : version <= 26 ? 1 : 2
  return { numeric: [10, 12, 14], alphanumeric: [9, 11, 13], byte: [8, 16, 16] }[mode][row]
}

function pickMode(text: string): Mode {
  if (/^[0-9]+$/.test(text)) return 'numeric'
  let alnum = true
  for (const ch of text) {
    if (!ALPHANUMERIC.includes(ch)) { alnum = false; break }
  }
  return alnum && text.length > 0 ? 'alphanumeric' : 'byte'
}

function utf8Bytes(text: string): Uint8Array {
  // Hand-rolled UTF-8 so the core stays runtime-agnostic (TextEncoder is
  // universal today, but this keeps the module dependency-free even of globals).
  const out: number[] = []
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    if (cp < 0x80) out.push(cp)
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f))
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f))
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f))
  }
  return new Uint8Array(out)
}

class BitBuffer {
  bits: number[] = []
  push(value: number, length: number) {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1)
  }
  get length() { return this.bits.length }
  toBytes(): Uint8Array {
    const out = new Uint8Array(Math.ceil(this.bits.length / 8))
    this.bits.forEach((bit, i) => { if (bit) out[i >> 3] |= 0x80 >> (i & 7) })
    return out
  }
}

interface Segment { mode: Mode, charCount: number, write: (bb: BitBuffer) => void }

function makeSegment(text: string): Segment {
  const mode = pickMode(text)
  if (mode === 'numeric') {
    return {
      mode, charCount: text.length,
      write(bb) {
        for (let i = 0; i < text.length; i += 3) {
          const chunk = text.slice(i, i + 3)
          bb.push(parseInt(chunk, 10), chunk.length * 3 + 1)
        }
      },
    }
  }
  if (mode === 'alphanumeric') {
    return {
      mode, charCount: text.length,
      write(bb) {
        for (let i = 0; i + 1 < text.length; i += 2)
          bb.push(ALPHANUMERIC.indexOf(text[i]) * 45 + ALPHANUMERIC.indexOf(text[i + 1]), 11)
        if (text.length % 2) bb.push(ALPHANUMERIC.indexOf(text[text.length - 1]), 6)
      },
    }
  }
  const bytes = utf8Bytes(text)
  return {
    mode, charCount: bytes.length,
    write(bb) { for (const b of bytes) bb.push(b, 8) },
  }
}

function segmentBitLength(seg: Segment, version: number): number {
  const cc = charCountBits(seg.mode, version)
  const n = seg.charCount
  let dataBits: number
  if (seg.mode === 'numeric') dataBits = Math.floor(n / 3) * 10 + [0, 4, 7][n % 3]
  else if (seg.mode === 'alphanumeric') dataBits = Math.floor(n / 2) * 11 + (n % 2) * 6
  else dataBits = n * 8
  return 4 + cc + dataBits
}

// ─── Matrix construction ──────────────────────────────────────────────────

const PENALTY_N1 = 3
const PENALTY_N2 = 3
const PENALTY_N3 = 40
const PENALTY_N4 = 10

function alignmentPositions(version: number): number[] {
  if (version === 1) return []
  const numAlign = Math.floor(version / 7) + 2
  const size = version * 4 + 17
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2
  const result = [6]
  for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos)
  return result
}

class Matrix {
  version: number
  size: number
  modules: Uint8Array
  isFunction: Uint8Array

  constructor(version: number) {
    this.version = version
    this.size = version * 4 + 17
    this.modules = new Uint8Array(this.size * this.size)
    this.isFunction = new Uint8Array(this.size * this.size)
  }

  get(x: number, y: number) { return this.modules[y * this.size + x] }
  setFunction(x: number, y: number, dark: number) {
    this.modules[y * this.size + x] = dark
    this.isFunction[y * this.size + x] = 1
  }

  drawPatterns(ecLevel: EcLevel) {
    // Timing patterns
    for (let i = 0; i < this.size; i++) {
      this.setFunction(6, i, (i + 1) % 2)
      this.setFunction(i, 6, (i + 1) % 2)
    }
    // Finder patterns + separators
    this.drawFinder(3, 3)
    this.drawFinder(this.size - 4, 3)
    this.drawFinder(3, this.size - 4)
    // Alignment patterns
    const align = alignmentPositions(this.version)
    for (let i = 0; i < align.length; i++) {
      for (let j = 0; j < align.length; j++) {
        // skip the three corners occupied by finder patterns
        if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) continue
        this.drawAlignment(align[i], align[j])
      }
    }
    // Format info (reserved with dummy mask 0 for now)
    this.drawFormatBits(ecLevel, 0)
    this.drawVersionInfo()
    // Dark module is drawn by drawFormatBits
  }

  private drawFinder(cx: number, cy: number) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy
        if (x < 0 || x >= this.size || y < 0 || y >= this.size) continue
        const dist = Math.max(Math.abs(dx), Math.abs(dy))
        this.setFunction(x, y, dist !== 2 && dist !== 4 ? 1 : 0)
      }
    }
  }

  private drawAlignment(cx: number, cy: number) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunction(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1 ? 1 : 0)
      }
    }
  }

  drawFormatBits(ecLevel: EcLevel, mask: number) {
    const data = (EC_FORMAT_BITS[ecLevel] << 3) | mask
    let rem = data
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    const bits = ((data << 10) | rem) ^ 0x5412

    // around the top-left finder
    for (let i = 0; i <= 5; i++) this.setFunction(8, i, (bits >>> i) & 1)
    this.setFunction(8, 7, (bits >>> 6) & 1)
    this.setFunction(8, 8, (bits >>> 7) & 1)
    this.setFunction(7, 8, (bits >>> 8) & 1)
    for (let i = 9; i < 15; i++) this.setFunction(14 - i, 8, (bits >>> i) & 1)

    // second copy: below top-right and beside bottom-left finders
    for (let i = 0; i < 8; i++) this.setFunction(this.size - 1 - i, 8, (bits >>> i) & 1)
    for (let i = 8; i < 15; i++) this.setFunction(8, this.size - 15 + i, (bits >>> i) & 1)
    this.setFunction(8, this.size - 8, 1) // dark module
  }

  private drawVersionInfo() {
    if (this.version < 7) return
    let rem = this.version
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
    const bits = (this.version << 12) | rem
    for (let i = 0; i < 18; i++) {
      const bit = (bits >>> i) & 1
      const a = this.size - 11 + (i % 3)
      const b = Math.floor(i / 3)
      this.setFunction(a, b, bit)
      this.setFunction(b, a, bit)
    }
  }

  placeData(codewords: Uint8Array) {
    let i = 0
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5
      for (let vert = 0; vert < this.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j
          const upward = ((right + 1) & 2) === 0
          const y = upward ? this.size - 1 - vert : vert
          if (this.isFunction[y * this.size + x]) continue
          if (i < codewords.length * 8) {
            this.modules[y * this.size + x] = (codewords[i >> 3] >>> (7 - (i & 7))) & 1
            i++
          }
          // remainder bits stay light
        }
      }
    }
  }

  applyMask(mask: number) {
    const size = this.size
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (this.isFunction[y * size + x]) continue
        let invert = false
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break
          case 1: invert = y % 2 === 0; break
          case 2: invert = x % 3 === 0; break
          case 3: invert = (x + y) % 3 === 0; break
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break
          case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break
        }
        if (invert) this.modules[y * size + x] ^= 1
      }
    }
  }

  penalty(): number {
    const size = this.size
    let score = 0

    // Rule 1: runs of same color ≥5 in row/column
    for (let y = 0; y < size; y++) {
      let runColor = -1, runLen = 0
      for (let x = 0; x < size; x++) {
        const c = this.get(x, y)
        if (c === runColor) {
          runLen++
          if (runLen === 5) score += PENALTY_N1
          else if (runLen > 5) score++
        } else { runColor = c; runLen = 1 }
      }
    }
    for (let x = 0; x < size; x++) {
      let runColor = -1, runLen = 0
      for (let y = 0; y < size; y++) {
        const c = this.get(x, y)
        if (c === runColor) {
          runLen++
          if (runLen === 5) score += PENALTY_N1
          else if (runLen > 5) score++
        } else { runColor = c; runLen = 1 }
      }
    }

    // Rule 2: 2×2 blocks of same color
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = this.get(x, y)
        if (c === this.get(x + 1, y) && c === this.get(x, y + 1) && c === this.get(x + 1, y + 1))
          score += PENALTY_N2
      }
    }

    // Rule 3: finder-like pattern 1:1:3:1:1 with 4 light modules on one side
    const checkLine = (line: Uint8Array) => {
      const pat1 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1]
      const pat2 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]
      for (let i = 0; i + 11 <= line.length; i++) {
        let m1 = true, m2 = true
        for (let j = 0; j < 11; j++) {
          if (line[i + j] !== pat1[j]) m1 = false
          if (line[i + j] !== pat2[j]) m2 = false
          if (!m1 && !m2) break
        }
        if (m1 || m2) score += PENALTY_N3
      }
    }
    const col = new Uint8Array(size)
    for (let y = 0; y < size; y++) checkLine(this.modules.subarray(y * size, (y + 1) * size))
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) col[y] = this.get(x, y)
      checkLine(col)
    }

    // Rule 4: dark module proportion
    let dark = 0
    for (const m of this.modules) dark += m
    const total = size * size
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1
    score += k * PENALTY_N4

    return score
  }
}

// ─── Top-level encode ─────────────────────────────────────────────────────

export function encodeQr(text: string, options: EncodeOptions = {}): QrMatrix {
  if (text.length === 0) throw new Error('Cannot encode empty input')
  const minVersion = options.minVersion ?? 1
  const maxVersion = options.maxVersion ?? 40
  let ecLevel: EcLevel = options.ecLevel ?? 'M'
  const boostEc = options.boostEc ?? true

  const seg = makeSegment(text)

  // Pick smallest version that fits
  let version = -1
  let usedBits = 0
  for (let v = minVersion; v <= maxVersion; v++) {
    const capacity = dataCodewords(v, ecLevel) * 8
    const needed = segmentBitLength(seg, v)
    if (needed <= capacity) { version = v; usedBits = needed; break }
  }
  if (version === -1) throw new Error('Data too long to fit in a QR code at this error-correction level')

  // Boost EC level if the same version still fits
  if (boostEc) {
    for (const candidate of ['M', 'Q', 'H'] as EcLevel[]) {
      if (EC_INDEX[candidate] > EC_INDEX[ecLevel] || (ecLevel === 'L' && candidate === 'M')) {
        if (segmentBitLength(seg, version) <= dataCodewords(version, candidate) * 8) ecLevel = candidate
      }
    }
  }

  // Build the data bit stream
  const bb = new BitBuffer()
  bb.push(MODE_INDICATOR[seg.mode], 4)
  bb.push(seg.charCount, charCountBits(seg.mode, version))
  seg.write(bb)

  const capacityBits = dataCodewords(version, ecLevel) * 8
  bb.push(0, Math.min(4, capacityBits - bb.length)) // terminator
  bb.push(0, (8 - (bb.length % 8)) % 8) // byte-align
  for (let pad = 0xec; bb.length < capacityBits; pad ^= 0xec ^ 0x11) bb.push(pad, 8)

  const data = bb.toBytes()

  // Split into blocks, compute EC, interleave
  const ecIdx = EC_INDEX[ecLevel]
  const numBlocks = NUM_EC_BLOCKS[ecIdx][version]
  const eccLen = ECC_PER_BLOCK[ecIdx][version]
  const rawCw = totalCodewords(version)
  const numShortBlocks = numBlocks - (rawCw % numBlocks)
  const shortBlockLen = Math.floor(rawCw / numBlocks) - eccLen

  const blocks: { data: Uint8Array, ecc: Uint8Array }[] = []
  let off = 0
  for (let b = 0; b < numBlocks; b++) {
    const len = shortBlockLen + (b < numShortBlocks ? 0 : 1)
    const blockData = data.slice(off, off + len)
    off += len
    blocks.push({ data: blockData, ecc: rsRemainder(blockData, eccLen) })
  }

  const result = new Uint8Array(rawCw)
  let ri = 0
  for (let i = 0; i <= shortBlockLen; i++) {
    for (const block of blocks) {
      if (i < block.data.length) result[ri++] = block.data[i]
    }
  }
  for (let i = 0; i < eccLen; i++) {
    for (const block of blocks) result[ri++] = block.ecc[i]
  }

  // Build matrix
  const matrix = new Matrix(version)
  matrix.drawPatterns(ecLevel)
  matrix.placeData(result)

  // Choose mask
  let mask = options.mask ?? -1
  if (mask === -1) {
    let best = Infinity
    for (let m = 0; m < 8; m++) {
      matrix.applyMask(m)
      matrix.drawFormatBits(ecLevel, m)
      const p = matrix.penalty()
      if (p < best) { best = p; mask = m }
      matrix.applyMask(m) // XOR is its own inverse
    }
  }
  matrix.applyMask(mask)
  matrix.drawFormatBits(ecLevel, mask)

  return { size: matrix.size, modules: matrix.modules, version, ecLevel, mask }
}
