/**
 * State-in-URL codec. Each tool declares a schema of shareable fields;
 * anything marked `secret` is NEVER serialized (excluded by schema, not by
 * memory — WiFi passwords cannot leak into share links by construction).
 */

export type FieldSpec =
  | { type: 'string', default: string, secret?: boolean }
  | { type: 'number', default: number, secret?: boolean }
  | { type: 'boolean', default: boolean, secret?: boolean }

export type StateSchema = Record<string, FieldSpec>

export type StateOf<S extends StateSchema> = {
  [K in keyof S]: S[K] extends { type: 'string' } ? string
    : S[K] extends { type: 'number' } ? number
      : boolean
}

export function defaultState<S extends StateSchema>(schema: S): StateOf<S> {
  const out: Record<string, unknown> = {}
  for (const [key, spec] of Object.entries(schema)) out[key] = spec.default
  return out as StateOf<S>
}

/** Serialize non-default, non-secret fields to a query string. */
export function encodeState<S extends StateSchema>(schema: S, state: StateOf<S>): string {
  const params = new URLSearchParams()
  for (const [key, spec] of Object.entries(schema)) {
    if (spec.secret) continue
    const value = state[key as keyof StateOf<S>]
    if (value === spec.default || value === undefined || value === '') continue
    params.set(key, String(value))
  }
  return params.toString()
}

/**
 * Decode only the fields actually present in the query — used to hydrate
 * state on mount without stomping values set programmatically (e.g. a
 * long-tail page presetting its tab). Secrets are never read from URLs.
 */
export function decodePresentState<S extends StateSchema>(schema: S, query: URLSearchParams): Partial<StateOf<S>> {
  const out: Record<string, unknown> = {}
  for (const [key, spec] of Object.entries(schema)) {
    if (spec.secret || !query.has(key)) continue
    const raw = query.get(key)!
    switch (spec.type) {
      case 'string': out[key] = raw; break
      case 'number': {
        const n = Number(raw)
        if (Number.isFinite(n)) out[key] = n
        break
      }
      case 'boolean': out[key] = raw === 'true' || raw === '1'; break
    }
  }
  return out as Partial<StateOf<S>>
}

/** Merge query params over schema defaults; secrets always reset to default. */
export function decodeState<S extends StateSchema>(schema: S, query: URLSearchParams | Record<string, string>): StateOf<S> {
  const get = query instanceof URLSearchParams
    ? (k: string) => query.get(k)
    : (k: string) => (k in query ? query[k] : null)
  const out: Record<string, unknown> = {}
  for (const [key, spec] of Object.entries(schema)) {
    const raw = spec.secret ? null : get(key)
    if (raw === null) { out[key] = spec.default; continue }
    switch (spec.type) {
      case 'string': out[key] = raw; break
      case 'number': {
        const n = Number(raw)
        out[key] = Number.isFinite(n) ? n : spec.default
        break
      }
      case 'boolean': out[key] = raw === 'true' || raw === '1'; break
    }
  }
  return out as StateOf<S>
}
