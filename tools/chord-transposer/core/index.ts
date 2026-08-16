import type { Accidental } from '../../../shared/core/music'
import { accidentalForKey, noteToPitchClass, pitchClassToNote, semitonesBetween } from '../../../shared/core/music'

/**
 * Chord chart transposition. Pure: text in, text out, with column alignment
 * preserved so a chords-over-lyrics chart still lines up after transposing.
 */

export interface ParsedChord {
  root: string
  /** Everything after the root: `m7`, `sus4`, `add9`, `dim`… */
  quality: string
  /** Slash-chord bass note, if any. */
  bass?: string
}

/**
 * A quality must decompose entirely into known atoms — `maj7` is maj + 7,
 * `m7b5` is m + 7 + b5. A loose character class is not enough: it happily
 * reads "And" as A + "nd", and rewriting lyrics that begin with A–G is the
 * failure mode of every naive transposer. Longest alternatives come first so
 * `maj` wins over `m`.
 */
const QUALITY = /^(?:maj|min|sus|add|dim|aug|alt|no|[MmΔø°+\-()]|[#b♯♭]?\d{1,2})*$/

const CHORD_RE = /^([A-G][#b♯♭]?)([^/\s]*)(?:\/([A-G][#b♯♭]?))?$/

export function parseChord(token: string): ParsedChord | null {
  const match = CHORD_RE.exec(token.trim())
  if (!match)
    return null

  const [, root, quality, bass] = match
  if (noteToPitchClass(root) === null)
    return null
  // A trailing slash with no bass note is not a chord.
  if (token.endsWith('/'))
    return null
  if (quality && !QUALITY.test(quality))
    return null
  if (bass && noteToPitchClass(bass) === null)
    return null

  return { root, quality, bass }
}

export function transposeChord(token: string, semitones: number, accidental: Accidental): string | null {
  const parsed = parseChord(token)
  if (!parsed)
    return null

  const rootPc = noteToPitchClass(parsed.root)!
  const root = pitchClassToNote(rootPc + semitones, accidental)
  const bass = parsed.bass
    ? pitchClassToNote(noteToPitchClass(parsed.bass)! + semitones, accidental)
    : undefined

  return `${root}${parsed.quality}${bass ? `/${bass}` : ''}`
}

interface Token {
  text: string
  start: number
}

function tokenize(line: string): Token[] {
  const tokens: Token[] = []
  const re = /\S+/g
  let match = re.exec(line)
  while (match) {
    tokens.push({ text: match[0], start: match.index })
    match = re.exec(line)
  }
  return tokens
}

/**
 * A line is treated as chords when every token parses as one and there is at
 * least one. Lyric lines pass through untouched, which is what keeps "A" as a
 * word and "Am" as a chord on the line below it.
 */
export function isChordLine(line: string): boolean {
  const tokens = tokenize(line)
  if (tokens.length === 0)
    return false
  return tokens.every(token => parseChord(token.text) !== null)
}

/**
 * Rebuild a chord line, keeping each chord at its original column where the
 * spacing allows. A chord that grows (C → C#) pushes the rest right by the
 * minimum needed rather than collapsing the layout.
 */
function rebuildLine(tokens: Token[], replacements: string[]): string {
  let out = ''
  for (const [index, token] of tokens.entries()) {
    const target = token.start
    if (out.length < target)
      out += ' '.repeat(target - out.length)
    else if (out.length > 0)
      out += ' '
    out += replacements[index]
  }
  return out
}

export function transposeLine(line: string, semitones: number, accidental: Accidental): string {
  if (!isChordLine(line))
    return line

  const tokens = tokenize(line)
  const replacements = tokens.map(token => transposeChord(token.text, semitones, accidental) ?? token.text)
  return rebuildLine(tokens, replacements)
}

export interface TransposeOptions {
  /** Semitones to move, or derive them from `fromKey`/`toKey`. */
  semitones?: number
  fromKey?: string
  toKey?: string
  /** Override the spelling; defaults to what the destination key implies. */
  accidental?: Accidental
}

export interface TransposeResult {
  text: string
  semitones: number
  accidental: Accidental
  /** How many chord lines were rewritten — 0 means nothing was recognised. */
  chordLines: number
}

export function transposeChart(chart: string, options: TransposeOptions): TransposeResult {
  let semitones = options.semitones ?? 0
  if (options.semitones === undefined && options.fromKey && options.toKey)
    semitones = semitonesBetween(options.fromKey, options.toKey) ?? 0

  const accidental = options.accidental
    ?? (options.toKey ? accidentalForKey(options.toKey) : 'sharp')

  const lines = chart.split('\n')
  let chordLines = 0
  const out = lines.map((line) => {
    if (!isChordLine(line))
      return line
    chordLines++
    return transposeLine(line, semitones, accidental)
  })

  return { text: out.join('\n'), semitones, accidental, chordLines }
}

/**
 * Detect the key of a chart from its first and last chord — the crude
 * heuristic every musician uses, and right often enough to prefill the form.
 */
export function detectKey(chart: string): string | null {
  const chords: ParsedChord[] = []
  for (const line of chart.split('\n')) {
    if (!isChordLine(line))
      continue
    for (const token of tokenize(line)) {
      const parsed = parseChord(token.text)
      if (parsed)
        chords.push(parsed)
    }
  }
  if (chords.length === 0)
    return null

  // A chart usually resolves to its key, so the last chord beats the first.
  const last = chords[chords.length - 1]
  const minor = /^(?:m|min)(?![a-z])/i.test(last.quality)
  return `${last.root}${minor ? 'm' : ''}`
}

/**
 * Which shapes to play with a capo: the sounding key minus the capo fret.
 * Capo 2 with a chart in D means playing C shapes.
 */
export function capoShapeKey(soundingKey: string, capoFret: number): string | null {
  const pitchClass = noteToPitchClass(soundingKey)
  if (pitchClass === null || capoFret < 0 || capoFret > 11)
    return null
  return pitchClassToNote(pitchClass - capoFret, accidentalForKey(soundingKey))
}
