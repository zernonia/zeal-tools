/**
 * Byte sizes, written the way a person reads them.
 *
 * Shared because three tools now show file sizes and they must agree: a
 * compressor claiming "1.4 MB saved" against a metadata viewer calling the
 * same file "1.5 MB" reads as a bug even when both roundings are defensible.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0)
    return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  const rounded = unit === 0 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${units[unit]}`
}
