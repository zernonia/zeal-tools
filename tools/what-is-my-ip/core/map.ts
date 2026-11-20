import { WORLD_NORTH, WORLD_ROWS, WORLD_SOUTH, WORLD_STEP } from './world-dots'

/**
 * The dotted world map, in grid units: one unit per dot, so the map is
 * `WORLD_WIDTH` × `WORLD_HEIGHT` and the dot in column c, row r sits at
 * (c + 0.5, r + 0.5). Drawn locally — fetching map tiles would tell a tile
 * server the visitor's location, which is the thing being shown.
 */
export const WORLD_WIDTH = 360 / WORLD_STEP
export const WORLD_HEIGHT = WORLD_ROWS.length

/**
 * One SVG path for every land dot. Each run of land is a horizontal line that
 * the page strokes with `stroke-dasharray="0 1"` and round caps, which draws
 * a dot at every grid point along it — a few kilobytes for the whole world.
 */
export function worldDotsPath(): string {
  let path = ''
  WORLD_ROWS.forEach((runs, row) => {
    for (let i = 0; i < runs.length; i += 2)
      path += `M${runs[i]! + 0.5} ${row + 0.5}h${runs[i + 1]! - 1}`
  })
  return path
}

/** Where a latitude and longitude land on the map, clamped to its edges. */
export function worldPoint(latitude: number, longitude: number): { x: number, y: number } {
  const lat = Math.min(WORLD_NORTH + WORLD_STEP / 2, Math.max(WORLD_SOUTH - WORLD_STEP / 2, latitude))
  const lon = ((((longitude + 180) % 360) + 360) % 360) - 180
  return {
    x: (lon + 180) / WORLD_STEP,
    y: (WORLD_NORTH - lat) / WORLD_STEP + 0.5,
  }
}

/** True when the map has a land dot at that point — used by tests to check the projection. */
export function isLandAt(latitude: number, longitude: number): boolean {
  const { x, y } = worldPoint(latitude, longitude)
  const col = Math.floor(x)
  const runs = WORLD_ROWS[Math.floor(y)] ?? []
  for (let i = 0; i < runs.length; i += 2) {
    if (col >= runs[i]! && col < runs[i]! + runs[i + 1]!)
      return true
  }
  return false
}
