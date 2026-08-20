import type { RandomInt } from '../../../shared/core/random'

/**
 * Name picker — the pure part.
 *
 * The wheel is a picture of a decision that has already been made. The winner
 * is drawn first, from a proper unbiased source, and the wheel is then spun to
 * land on it. Doing it the other way round — letting an animation coast to a
 * stop and reading off whatever is under the pointer — makes the fairness a
 * property of easing curves and frame timing, which is not a thing anyone can
 * check.
 *
 * That makes the geometry testable, and the pair that matters is
 * `rotationFor` and `entryAt`: one computes where to stop so a chosen entry
 * wins, the other reads which entry a given rotation selects. They must be
 * exact inverses, and an off-by-one or a flipped direction between them is the
 * bug that silently awards the wrong name.
 */

export interface Entry {
  id: number
  label: string
  /** Whole number of slices. `Ada x3` fills three of them. */
  weight: number
}

export const MAX_ENTRIES = 500
const MAX_LABEL = 60

/**
 * Read a list of names, one per line.
 *
 * A trailing `x3` (or `×3`) sets a weight, because "put Ada in three times" is
 * how people actually express a bigger chance and typing the name three times
 * makes the wheel unreadable.
 */
export function parseEntries(text: string): Entry[] {
  const out: Entry[] = []
  let id = 0
  for (const line of String(text).split('\n')) {
    const trimmed = line.trim()
    if (!trimmed)
      continue

    const multiplier = readMultiplier(trimmed)
    const label = (multiplier ? multiplier.label : trimmed).trim().slice(0, MAX_LABEL)
    if (!label)
      continue

    out.push({ id: id++, label, weight: multiplier ? multiplier.weight : 1 })
    if (out.length >= MAX_ENTRIES)
      break
  }
  return out
}

const isSpace = (char: string | undefined) => char !== undefined && char.trim() === ''
const isDigit = (char: string | undefined) => char !== undefined && char >= '0' && char <= '9'

/**
 * Read a trailing `×3` off a line, walking backwards.
 *
 * Scanned rather than matched, for the same reason the invoice numbering is:
 * the obvious pattern is /^(.*?)\s+[x×]\s*(\d+)$/, whose lazy prefix and
 * whitespace run can exchange characters and backtrack super-linearly on a
 * pasted line of a few thousand spaces. Walking from the end is unambiguous
 * and linear.
 */
function readMultiplier(line: string): { label: string, weight: number } | null {
  let cursor = line.length
  while (cursor > 0 && isDigit(line[cursor - 1]))
    cursor--

  const digits = line.slice(cursor)
  if (digits.length === 0 || digits.length > 3)
    return null

  while (cursor > 0 && isSpace(line[cursor - 1]))
    cursor--

  const marker = line[cursor - 1]
  if (marker !== 'x' && marker !== 'X' && marker !== '×')
    return null
  cursor--

  // The marker has to be a token of its own, or `Room x2` reads as a weight on
  // `Room` and `Ax3` as a weight on `A`.
  const label = line.slice(0, cursor)
  if (!isSpace(label[label.length - 1]))
    return null

  const trimmed = label.trim()
  return trimmed ? { label: trimmed, weight: Math.max(1, Number(digits)) } : null
}

/**
 * Back to text, so removing a winner can rewrite the box the names came from.
 *
 * The list stays the thing the user typed rather than becoming hidden state
 * behind it — remove-after-picking is visible as a line disappearing, and an
 * accidental removal can be undone with the browser's own undo.
 */
export function formatEntries(entries: Entry[]): string {
  return entries.map(e => (e.weight > 1 ? `${e.label} ×${e.weight}` : e.label)).join('\n')
}

export function totalWeight(entries: Entry[]): number {
  return entries.reduce((sum, entry) => sum + Math.max(1, Math.round(entry.weight)), 0)
}

// ------------------------------------------------------------------ geometry

export interface Segment {
  entry: Entry
  index: number
  /** Degrees clockwise from the top, where the pointer sits. */
  start: number
  end: number
  mid: number
}

/**
 * Where each entry sits on the wheel.
 *
 * Zero degrees is the top and angles increase clockwise, which matches both
 * the pointer's position and the direction a wheel is expected to turn.
 */
export function segments(entries: Entry[]): Segment[] {
  const total = totalWeight(entries)
  if (total === 0)
    return []

  const out: Segment[] = []
  let cursor = 0
  entries.forEach((entry, index) => {
    const span = (Math.max(1, Math.round(entry.weight)) / total) * 360
    const start = cursor
    const end = cursor + span
    out.push({ entry, index, start, end, mid: (start + end) / 2 })
    cursor = end
  })
  return out
}

const norm = (deg: number) => ((deg % 360) + 360) % 360

/**
 * Which entry the pointer is over, for a given wheel rotation.
 *
 * The pointer does not move; the wheel does. So the slice under the pointer is
 * the one whose own angle is `-rotation` — turning the wheel clockwise brings
 * earlier slices round to the top.
 */
export function entryAt(rotation: number, entries: Entry[]): Segment | null {
  const list = segments(entries)
  if (list.length === 0)
    return null

  const angle = norm(-rotation)
  for (const segment of list) {
    if (angle >= segment.start && angle < segment.end)
      return segment
  }
  // Only reachable through floating-point drift at exactly 360°.
  return list[list.length - 1]!
}

/**
 * How far to spin so a chosen entry ends under the pointer.
 *
 * `position` picks where within the slice to stop, 0 being its leading edge
 * and 1 its trailing one. Landing dead centre every time looks mechanical, so
 * the caller passes a random position — but it is kept away from the very
 * edges, where a rounding error would show the wrong name beside a pointer
 * that appears to be over a boundary.
 */
export function rotationFor(index: number, entries: Entry[], turns = 6, position = 0.5): number {
  const list = segments(entries)
  const segment = list[index]
  if (!segment)
    return 0

  const clamped = Math.min(0.9, Math.max(0.1, position))
  const target = segment.start + (segment.end - segment.start) * clamped
  return turns * 360 + norm(-target)
}

/** An SVG arc for one slice, drawn from the centre. */
export function slicePath(radius: number, startDeg: number, endDeg: number): string {
  const point = (deg: number) => {
    // -90 because SVG's zero is at three o'clock and ours is at twelve.
    const rad = ((deg - 90) * Math.PI) / 180
    return [radius + radius * Math.cos(rad), radius + radius * Math.sin(rad)]
  }

  // A single slice cannot be drawn as an arc: an arc from a point back to
  // itself has no defined sweep, so a one-entry wheel needs two half circles.
  if (endDeg - startDeg >= 359.999) {
    const [ax, ay] = point(0)
    const [bx, by] = point(180)
    return `M ${ax} ${ay} A ${radius} ${radius} 0 1 1 ${bx} ${by} A ${radius} ${radius} 0 1 1 ${ax} ${ay} Z`
  }

  const [sx, sy] = point(startDeg)
  const [ex, ey] = point(endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${radius} ${radius} L ${sx} ${sy} A ${radius} ${radius} 0 ${large} 1 ${ex} ${ey} Z`
}

/**
 * A colour per slice.
 *
 * One lightness and one chroma throughout, varying only hue — the same rule
 * the rest of the site follows, and the reason a wheel of twelve names reads
 * as one set rather than a bag of clashing colours. Lightness is fixed high
 * enough that dark text sits on every slice at full contrast in either theme.
 */
export function sliceColor(index: number, total: number): string {
  // The golden angle spreads neighbouring hues furthest apart, so adjacent
  // slices never look like the same colour on a crowded wheel.
  const hue = total <= 12 ? (index * 360) / Math.max(1, total) : (index * 137.508) % 360
  return `oklch(0.86 0.09 ${hue.toFixed(1)})`
}

// ----------------------------------------------------------------- selection

/**
 * Draw a winner, honouring weights.
 *
 * Uses the shared unbiased draw rather than `Math.random`, for the same reason
 * the password generator does: taking a modulo of a uniform value is not
 * uniform, and on a wheel that quietly favours whoever is first in the list.
 */
export function pickIndex(entries: Entry[], randomInt: RandomInt): number {
  const total = totalWeight(entries)
  if (total <= 0)
    return -1

  let ticket = randomInt(total)
  for (let i = 0; i < entries.length; i++) {
    ticket -= Math.max(1, Math.round(entries[i]!.weight))
    if (ticket < 0)
      return i
  }
  return entries.length - 1
}

/** Everything except the winner, for "remove after picking". */
export function without(entries: Entry[], index: number): Entry[] {
  return entries.filter((_, i) => i !== index)
}
