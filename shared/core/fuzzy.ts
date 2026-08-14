/**
 * Fuzzy search over the tool registry — our own ~100-line scorer instead of a
 * dependency. Case-folded subsequence + prefix + word-boundary scoring with
 * per-field weights.
 */

export interface SearchDoc {
  slug: string
  name: string
  tagline: string
  category: string
  keywords: string[]
  /** Optional popularity signal for tie-breaking. */
  popularity?: number
}

export interface SearchResult<T extends SearchDoc = SearchDoc> {
  doc: T
  score: number
}

const FIELD_WEIGHTS = { name: 3, keywords: 2, tagline: 1, category: 1 } as const

/**
 * Score `query` against `text`. 0 = no match.
 * Exact > prefix > word-boundary > subsequence, with a length penalty so
 * tighter matches in shorter fields win.
 */
export function scoreText(query: string, text: string): number {
  const q = query.toLowerCase().trim()
  const t = text.toLowerCase()
  if (!q || !t) return 0
  if (t === q) return 100
  if (t.startsWith(q)) return 80 + Math.min(15, q.length)
  // word-boundary prefix ("wifi" matches "share wifi network")
  const words = t.split(/[\s\-_/]+/)
  for (const word of words) {
    if (word.startsWith(q)) return 60 + Math.min(15, q.length)
  }
  if (t.includes(q)) return 45
  // subsequence: every query char appears in order
  let ti = 0
  let gaps = 0
  for (const ch of q) {
    const found = t.indexOf(ch, ti)
    if (found === -1) return 0
    gaps += found - ti
    ti = found + 1
  }
  return Math.max(1, 30 - gaps)
}

export function scoreDoc(query: string, doc: SearchDoc): number {
  // Multi-word queries: every word must match somewhere; scores add up.
  const parts = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 0
  let total = 0
  for (const part of parts) {
    const fieldScores = [
      scoreText(part, doc.name) * FIELD_WEIGHTS.name,
      Math.max(0, ...doc.keywords.map(k => scoreText(part, k))) * FIELD_WEIGHTS.keywords,
      scoreText(part, doc.tagline) * FIELD_WEIGHTS.tagline,
      scoreText(part, doc.category) * FIELD_WEIGHTS.category,
    ]
    const best = Math.max(...fieldScores)
    if (best === 0) return 0
    total += best
  }
  return total
}

export function search<T extends SearchDoc>(query: string, docs: T[], limit = 10): SearchResult<T>[] {
  const results: SearchResult<T>[] = []
  for (const doc of docs) {
    const score = scoreDoc(query, doc)
    if (score > 0) results.push({ doc, score })
  }
  results.sort((a, b) => b.score - a.score || (b.doc.popularity ?? 0) - (a.doc.popularity ?? 0) || a.doc.name.localeCompare(b.doc.name))
  return results.slice(0, limit)
}
