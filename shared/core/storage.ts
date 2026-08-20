/**
 * Device-local storage for a tool, declared as a definition rather than
 * written by hand at each call site.
 *
 * The sibling of `url-state.ts`, and for the same reason: fields that must
 * never be kept are excluded **by construction**, not by remembering to strip
 * them. A password generator's output and a photograph's coordinates cannot
 * end up in `localStorage` through an oversight if the definition never lets
 * them be written.
 *
 * Pure: this reads and writes strings. The reading and writing of
 * `localStorage` itself belongs to the composable, because a prerendered page
 * has no storage at render time and must not pretend otherwise.
 */

export interface StoreDefinition<T extends object> {
  /** Namespaced key, e.g. `zeal:invoice`. */
  key: string
  /**
   * Bumped when the stored shape changes incompatibly. Data written by an
   * older version is discarded rather than migrated: a tool's saved settings
   * are a convenience, and guessing at a half-understood old shape risks
   * showing someone the wrong tax rate on an invoice.
   */
  version: number
  defaults: T
  /** Never written, whatever the caller passes. */
  omit?: readonly (keyof T)[]
  /**
   * Turn parsed-but-untrusted JSON into a safe value.
   *
   * Stored data is input like any other — a user can edit it, another tab can
   * write it, and a browser extension can corrupt it. Without a revive step a
   * tool would happily render whatever shape it found.
   */
  revive?: (raw: Record<string, unknown>, defaults: T) => T
}

interface Envelope {
  v: number
  d: Record<string, unknown>
}

/** Everything the definition allows, wrapped with its version. */
export function serialize<T extends object>(value: T, definition: StoreDefinition<T>): string {
  const omit = new Set<string>((definition.omit ?? []).map(String))
  const data: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (!omit.has(key))
      data[key] = entry
  }
  return JSON.stringify({ v: definition.version, d: data } satisfies Envelope)
}

/**
 * Read a stored value, falling back to defaults on anything unexpected.
 *
 * Never throws. A tool that cannot start because its saved settings are
 * malformed is worse than one that quietly starts fresh.
 */
export function deserialize<T extends object>(text: string | null, definition: StoreDefinition<T>): T {
  // A DEEP copy. A spread shares every nested object with the definition, so a
  // tool that edits `state.business.name` silently rewrites its own defaults —
  // and "clear" then restores the very values it was asked to erase.
  const defaults = structuredClone(definition.defaults)
  if (!text)
    return defaults

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  }
  catch {
    return defaults
  }

  if (!parsed || typeof parsed !== 'object')
    return defaults

  const envelope = parsed as Partial<Envelope>
  if (envelope.v !== definition.version)
    return defaults
  if (!envelope.d || typeof envelope.d !== 'object' || Array.isArray(envelope.d))
    return defaults

  // Omitted fields always come from defaults, even if an old or hand-edited
  // payload contains them — the exclusion holds on read as well as on write.
  const omit = new Set<string>((definition.omit ?? []).map(String))
  const raw: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(envelope.d)) {
    if (!omit.has(key))
      raw[key] = entry
  }

  if (definition.revive) {
    try {
      return definition.revive(raw, defaults)
    }
    catch {
      return defaults
    }
  }

  return { ...defaults, ...raw } as T
}

// ------------------------------------------------------- revive helpers

/** A trimmed string of bounded length, or the fallback. */
export function safeText(value: unknown, fallback: string, max = 200): string {
  if (typeof value !== 'string')
    return fallback
  // Control characters would let stored text forge line breaks in a document.
  // eslint-disable-next-line no-control-regex -- stripping them is the point
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, '').slice(0, max)
  return cleaned
}

/** A finite number inside a range, or the fallback. */
export function safeNumber(value: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return fallback
  return Math.min(max, Math.max(min, value))
}

export function safeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/**
 * A bounded list of revived items.
 *
 * Bounded because storage is a shared, writable surface: without a cap a
 * corrupt or hostile payload can hand a tool a hundred thousand rows to
 * render.
 */
export function safeList<T>(value: unknown, revive: (raw: unknown) => T | null, max = 100): T[] {
  if (!Array.isArray(value))
    return []
  const out: T[] = []
  for (const entry of value.slice(0, max)) {
    const revived = revive(entry)
    if (revived !== null)
      out.push(revived)
  }
  return out
}
