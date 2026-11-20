/**
 * Geometry for drawing results: which silhouette a die takes, where a d6's
 * pips sit, and where a value falls along its range. Pure, so the pictures
 * can be tested against the numbers they stand for.
 */

export type DieShape = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'other'

/** The polyhedron people picture for a die with this many sides. d100 is drawn as a d10, as the real one is. */
export function dieShape(sides: number): DieShape {
  switch (sides) {
    case 4: return 'd4'
    case 6: return 'd6'
    case 8: return 'd8'
    case 10:
    case 100: return 'd10'
    case 12: return 'd12'
    case 20: return 'd20'
    default: return 'other'
  }
}

/**
 * Polygon points for each silhouette in a 100 × 100 box, outline only.
 * d6 and `other` are rounded squares drawn by the component, so they have none.
 */
export function dieOutline(shape: DieShape): string {
  switch (shape) {
    case 'd4': return '50,5 96,90 4,90'
    case 'd8': return '50,2 96,50 50,98 4,50'
    case 'd10': return '50,2 96,42 50,98 4,42'
    case 'd12': return regularPolygon(5, 49, -90)
    case 'd20': return regularPolygon(6, 49, -90)
    default: return ''
  }
}

/**
 * The inner facet lines that make a silhouette read as a solid, as pairs of
 * points. Drawn faintly: they are decoration, the number is the content.
 */
export function dieFacets(shape: DieShape): string[] {
  switch (shape) {
    case 'd8': return ['4,50 96,50']
    case 'd10': return ['4,42 50,60 96,42', '50,60 50,98']
    // A d12's top face is a smaller pentagon; a d20's is a triangle on alternate corners.
    case 'd12': return [regularPolygon(5, 33, -90)]
    case 'd20': return [regularPolygon(3, 49, -90)]
    default: return []
  }
}

function regularPolygon(corners: number, radius: number, startDeg: number): string {
  const round = (value: number) => Math.round(value * 10) / 10
  return Array.from({ length: corners }, (_, i) => {
    const angle = ((startDeg + (360 / corners) * i) * Math.PI) / 180
    return `${round(50 + radius * Math.cos(angle))},${round(50 + radius * Math.sin(angle))}`
  }).join(' ')
}

/**
 * Where the number sits on each shape: a triangle's centre of mass is low,
 * a kite's is high. In the same 100 × 100 box.
 */
export function dieLabelY(shape: DieShape): number {
  switch (shape) {
    case 'd4': return 64
    case 'd10': return 40
    default: return 50
  }
}

/**
 * Pip positions on a d6 face as grid cells, 0–2 on each axis, in the
 * arrangement printed on real dice. Anything but 1–6 has no pips.
 */
export function d6Pips(value: number): [number, number][] {
  const c: [number, number] = [1, 1]
  const tl: [number, number] = [0, 0]
  const tr: [number, number] = [2, 0]
  const bl: [number, number] = [0, 2]
  const br: [number, number] = [2, 2]
  const ml: [number, number] = [0, 1]
  const mr: [number, number] = [2, 1]
  switch (value) {
    case 1: return [c]
    case 2: return [tr, bl]
    case 3: return [tr, c, bl]
    case 4: return [tl, tr, bl, br]
    case 5: return [tl, tr, c, bl, br]
    case 6: return [tl, tr, ml, mr, bl, br]
    default: return []
  }
}

/**
 * A value's position along [min, max] as a fraction 0–1, clamped. A range of
 * one value sits in the middle rather than dividing by zero.
 */
export function rangePosition(value: number, min: number, max: number): number {
  if (!(max > min))
    return 0.5
  return Math.min(1, Math.max(0, (value - min) / (max - min)))
}

/** Heads and tails as whole percentages that always add up to 100. Null before any flip. */
export function coinShares(heads: number, tails: number): { heads: number, tails: number } | null {
  const total = heads + tails
  if (total === 0)
    return null
  const share = Math.round((heads / total) * 100)
  return { heads: share, tails: 100 - share }
}
