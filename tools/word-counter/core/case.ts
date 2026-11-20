/**
 * Case conversion.
 *
 * Two families with different jobs. Prose cases (Title, Sentence, UPPER…)
 * change letters and leave every space, line break and punctuation mark where
 * it was. Code cases (camelCase, snake_case…) rebuild each line from its
 * words, because an identifier has no room for spaces or punctuation — lines
 * stay separate so a pasted list of names converts as a list.
 *
 * Case mapping is locale-independent (`toUpperCase`, not `toLocaleUpperCase`)
 * so the page, the API and MCP agree; the one visible consequence is Turkish,
 * where a dotless ı needs its own locale's rules.
 */

export type CaseId
  = | 'upper' | 'lower' | 'title' | 'sentence'
    | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant'
    | 'alternating' | 'inverse'

export interface CaseOption {
  id: CaseId
  label: string
  /** "The quick brown fox" in this case — doubles as the button's hint. */
  example: string
}

export const CASES: readonly CaseOption[] = [
  { id: 'upper', label: 'UPPER CASE', example: 'THE QUICK BROWN FOX' },
  { id: 'lower', label: 'lower case', example: 'the quick brown fox' },
  { id: 'title', label: 'Title Case', example: 'The Quick Brown Fox' },
  { id: 'sentence', label: 'Sentence case', example: 'The quick brown fox' },
  { id: 'camel', label: 'camelCase', example: 'theQuickBrownFox' },
  { id: 'pascal', label: 'PascalCase', example: 'TheQuickBrownFox' },
  { id: 'snake', label: 'snake_case', example: 'the_quick_brown_fox' },
  { id: 'kebab', label: 'kebab-case', example: 'the-quick-brown-fox' },
  { id: 'constant', label: 'CONSTANT_CASE', example: 'THE_QUICK_BROWN_FOX' },
  { id: 'alternating', label: 'aLtErNaTiNg', example: 'tHe QuIcK bRoWn FoX' },
  { id: 'inverse', label: 'iNVERSE', example: 'tHE QUICK BROWN FOX' },
]

export const CASE_IDS: readonly CaseId[] = CASES.map(option => option.id)

export function isCaseId(value: unknown): value is CaseId {
  return typeof value === 'string' && (CASE_IDS as readonly string[]).includes(value)
}

/**
 * Lowercased in Title Case unless they open the text or a sentence, or follow
 * a colon. Prepositions longer than three letters ("with", "from") are
 * capitalised, which is what AP and Chicago agree on.
 */
export const SMALL_WORDS: ReadonlySet<string> = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'by'])

/** A run of letters, marks and digits, with apostrophes kept inside it. */
const WORD = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu

function hasCase(char: string): boolean {
  return char.toLowerCase() !== char.toUpperCase()
}

function capitalise(word: string): string {
  const [first = '', ...rest] = word
  return first.toUpperCase() + rest.join('').toLowerCase()
}

/**
 * Words that already carry capitals after their first letter — NASA, iPhone,
 * McDonald — are left alone, unless the whole text is shouting in capitals,
 * in which case nothing it contains can be trusted as an acronym.
 */
function shouldKeep(word: string, trustCapitals: boolean): boolean {
  return trustCapitals && /\p{Lu}/u.test([...word].slice(1).join(''))
}

function trustsCapitals(text: string): boolean {
  return /\p{Ll}/u.test(text)
}

export function titleCase(text: string): string {
  const trust = trustsCapitals(text)
  let lastEnd = -1
  return text.replace(WORD, (word: string, offset: number) => {
    const gap = lastEnd < 0 ? '' : text.slice(lastEnd, offset)
    const opens = lastEnd < 0 || /[.!?:\n]/.test(gap)
    lastEnd = offset + word.length
    if (shouldKeep(word, trust))
      return word
    if (!opens && SMALL_WORDS.has(word.toLowerCase()))
      return word.toLowerCase()
    return capitalise(word)
  })
}

export function sentenceCase(text: string): string {
  const trust = trustsCapitals(text)
  let lastEnd = -1
  return text.replace(WORD, (word: string, offset: number) => {
    const gap = lastEnd < 0 ? '' : text.slice(lastEnd, offset)
    const opens = lastEnd < 0 || /[.!?\n]/.test(gap)
    lastEnd = offset + word.length
    if (shouldKeep(word, trust))
      return word
    // The pronoun, and its contractions: I, I'm, I've, I'll, I'd.
    if (/^i(?:['’](?:m|ve|ll|d))?$/i.test(word))
      return `I${word.slice(1).toLowerCase()}`
    return opens ? capitalise(word) : word.toLowerCase()
  })
}

/** The words of one line, split at spaces, punctuation and camelCase humps. */
export function identifierWords(line: string): string[] {
  const spaced = line
    .replace(/['’]/g, '')
    // fooBar → foo Bar, version2Beta → version2 Beta
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2')
    // XMLHttp → XML Http
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1 $2')
  return spaced.match(/[\p{L}\p{M}\p{N}]+/gu) ?? []
}

function perLine(text: string, join: (words: string[]) => string): string {
  return text.split(/(\r\n|\r|\n)/).map((part, index) => (index % 2 ? part : join(identifierWords(part)))).join('')
}

export function alternatingCase(text: string): string {
  let index = 0
  let out = ''
  for (const char of text) {
    if (!hasCase(char)) {
      out += char
      continue
    }
    out += index++ % 2 ? char.toUpperCase() : char.toLowerCase()
  }
  return out
}

export function inverseCase(text: string): string {
  let out = ''
  for (const char of text) {
    const upper = char.toUpperCase()
    out += char === upper ? char.toLowerCase() : upper
  }
  return out
}

export function convertCase(text: string, id: CaseId): string {
  switch (id) {
    case 'upper': return text.toUpperCase()
    case 'lower': return text.toLowerCase()
    case 'title': return titleCase(text)
    case 'sentence': return sentenceCase(text)
    case 'camel': return perLine(text, words => words.map((word, i) => (i ? capitalise(word) : word.toLowerCase())).join(''))
    case 'pascal': return perLine(text, words => words.map(capitalise).join(''))
    case 'snake': return perLine(text, words => words.map(word => word.toLowerCase()).join('_'))
    case 'kebab': return perLine(text, words => words.map(word => word.toLowerCase()).join('-'))
    case 'constant': return perLine(text, words => words.map(word => word.toUpperCase()).join('_'))
    case 'alternating': return alternatingCase(text)
    case 'inverse': return inverseCase(text)
  }
}
