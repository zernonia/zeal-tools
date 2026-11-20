import type { UrlInfo, Warning } from './url'
import type { WifiInfo } from './wifi'

/**
 * Small, pure decisions the result card draws from, kept here so they are
 * tested rather than buried in a template.
 */

export type Verdict = 'danger' | 'caution' | 'clear'

/** One overall reading of a scan's warnings, for the badge at the top of the card. */
export function verdictOf(warnings: Warning[]): { tone: Verdict, label: string } {
  if (warnings.some(w => w.severity === 'danger'))
    return { tone: 'danger', label: 'Check before opening' }
  if (warnings.some(w => w.severity === 'caution'))
    return { tone: 'caution', label: 'Worth a second look' }
  return { tone: 'clear', label: 'No red flags found' }
}

/**
 * A link's host cut into what can be ignored and what decides who runs the
 * site: `shop.bbc.co.uk` → `shop.` + `bbc.co.uk`. The card dims the first part
 * and spells out the second, because a lookalike hides in exactly that split.
 */
export function hostParts(url: Pick<UrlInfo, 'displayHost' | 'site'>): { prefix: string, site: string } {
  const host = url.displayHost
  // An IP address has no registrable part: it is shown whole.
  if (host === url.site || host.startsWith('[') || /^[\d.]+$/.test(host))
    return { prefix: '', site: host }
  if (host.endsWith(`.${url.site}`))
    return { prefix: host.slice(0, host.length - url.site.length), site: url.site }
  return { prefix: '', site: host }
}

export type WifiStrength = 'open' | 'weak' | 'secure'

/** How well the network is protected, for the colour of its lock. */
export function wifiStrength(info: Pick<WifiInfo, 'open' | 'security'>): WifiStrength {
  if (info.open)
    return 'open'
  return info.security === 'WEP' ? 'weak' : 'secure'
}

/** Up to two initials for a contact's avatar: "Jane van Doe" → "JD". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(word => /[\p{L}\p{N}]/u.test(word))
  if (!words.length)
    return ''
  const firstChar = (word: string) => (Array.from(word).find(c => /[\p{L}\p{N}]/u.test(c)) ?? '').toUpperCase()
  return words.length === 1 ? firstChar(words[0]!) : firstChar(words[0]!) + firstChar(words.at(-1)!)
}
