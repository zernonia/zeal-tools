import { hostToUnicode } from './punycode'

/**
 * What a scanned link really points at, and what about it deserves a second
 * look before opening.
 *
 * "Quishing" — phishing by QR code — works because a code hides its
 * destination: a sticker over a parking meter's real code looks identical to
 * the original. So the scanner never opens anything by itself, and this module
 * works out what the visitor should see first: the registrable domain, spelt
 * out, and a short list of specific reasons for doubt. Each warning names the
 * thing it found rather than giving a vague score, because "this link is
 * 73% risky" is not something anyone can act on.
 */

export type Severity = 'danger' | 'caution' | 'info'

export interface Warning {
  code: 'lookalike' | 'idn' | 'http' | 'shortener' | 'ip' | 'userinfo' | 'port' | 'imitation' | 'redirect' | 'assumed-scheme' | 'script' | 'malformed' | 'weak'
  severity: Severity
  message: string
}

export interface UrlInfo {
  /** The normalised address the browser would load, punycode and all. */
  href: string
  scheme: 'http' | 'https'
  /** The hostname as the browser connects to it (ASCII, punycode). */
  host: string
  /** The hostname with international characters shown as they look. */
  displayHost: string
  /** The registrable domain — the part that actually decides who runs the site. */
  site: string
  /** Everything after the host, for display. */
  rest: string
  warnings: Warning[]
}

/**
 * Public suffixes with a second level, so `bbc.co.uk` is the site and not
 * `co.uk`. A full public-suffix list is 200 KB; these are the ones that come
 * up on real posters and menus, and getting an obscure one wrong only makes
 * the "site" line one label too long — it never hides a domain.
 */
const SECOND_LEVEL = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'ltd.uk',
  'me.uk',
  'nhs.uk',
  'com.au',
  'net.au',
  'org.au',
  'gov.au',
  'edu.au',
  'co.nz',
  'org.nz',
  'co.jp',
  'ne.jp',
  'or.jp',
  'co.kr',
  'co.in',
  'co.za',
  'co.id',
  'com.br',
  'com.cn',
  'com.hk',
  'com.mx',
  'com.my',
  'com.sg',
  'com.tr',
  'com.tw',
  'com.ar',
  'com.ph',
  'gov.my',
  'edu.my',
])

/**
 * Link shorteners and dynamic-QR redirectors. A link through one of these
 * shows you the shortener, not the destination, and the destination can be
 * changed after the code is printed — which is exactly what a quishing
 * sticker wants.
 */
export const SHORTENERS = new Set([
  'bit.ly',
  'bitly.com',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'is.gd',
  'v.gd',
  'buff.ly',
  'rebrand.ly',
  'cutt.ly',
  'shorturl.at',
  'tiny.cc',
  'rb.gy',
  'bit.do',
  's.id',
  't.ly',
  'tiny.one',
  'short.io',
  'bl.ink',
  'lnkd.in',
  'qrco.de',
  'qr.codes',
  'l.ead.me',
  'linktr.ee',
  'me-qr.com',
  'qrfy.io',
  'qr1.be',
  'q.me-qr.com',
])

/** Labels that only make sense at the end of a hostname. Seen earlier, they are imitating one. */
const TLD_LIKE = new Set(['com', 'net', 'org', 'gov', 'edu', 'co', 'uk', 'io', 'app'])

/** Letters in Cyrillic and Greek that are indistinguishable from Latin ones in most fonts. */
const CONFUSABLE = new Set([...'аеорсухіјѕԁԛԝһӏԌАВЕКМНОРСТХѴІЈЅοαενικτρυχΑΒΕΖΗΙΚΜΝΟΡΤΥΧ'])

type Script = 'ascii' | 'latin' | 'cyrillic' | 'greek' | 'other'

function scriptOf(ch: string): Script {
  const code = ch.codePointAt(0)!
  if (code < 0x80)
    return 'ascii'
  if ((code >= 0xC0 && code <= 0x24F) || (code >= 0x1E00 && code <= 0x1EFF))
    return 'latin'
  if (code >= 0x370 && code <= 0x3FF)
    return 'greek'
  if (code >= 0x400 && code <= 0x52F)
    return 'cyrillic'
  return 'other'
}

/**
 * Why an international label is suspicious, if it is.
 *
 * `münchen` is a real word in a Latin alphabet and gets a gentle note. A
 * label that mixes Cyrillic or Greek with Latin, or that is spelt entirely
 * from Cyrillic letters that look Latin (`раураl`), is the homograph attack
 * and gets a red one.
 */
function judgeLabel(label: string): 'lookalike' | 'international' | null {
  const chars = [...label]
  const scripts = new Set(chars.map(scriptOf))
  if (scripts.size === 1 && scripts.has('ascii'))
    return null
  const latinish = scripts.has('ascii') || scripts.has('latin')
  const foreign = scripts.has('cyrillic') || scripts.has('greek')
  if (latinish && foreign && chars.some(c => /[a-z]/i.test(c)))
    return 'lookalike'
  const letters = chars.filter(c => scriptOf(c) === 'cyrillic' || scriptOf(c) === 'greek')
  if (letters.length && letters.every(c => CONFUSABLE.has(c)))
    return 'lookalike'
  return 'international'
}

/** The registrable domain of an ASCII hostname: `www.shop.bbc.co.uk` → `bbc.co.uk`. */
export function siteOf(host: string): string {
  const labels = host.toLowerCase().replace(/\.$/, '').split('.')
  if (labels.length <= 2)
    return labels.join('.')
  const lastTwo = labels.slice(-2).join('.')
  return SECOND_LEVEL.has(lastTwo) ? labels.slice(-3).join('.') : lastTwo
}

function isIpHost(host: string): boolean {
  return host.startsWith('[') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
}

/** Shorten a long path for display without hiding where it starts. */
function shorten(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/**
 * Read an http(s) link. Returns null for anything that is not one, so the
 * caller can fall through to other payload types.
 *
 * A bare `www.example.com` is accepted too, because printed codes often
 * leave the scheme off and phone cameras open them anyway; that case says so.
 */
export function analyseUrl(raw: string): UrlInfo | null {
  const text = raw.trim()
  if (/\s/.test(text))
    return null

  let candidate = text
  let assumed = false
  if (!/^https?:\/\//i.test(text)) {
    if (!/^www\.[^./]+\.[^/]+/i.test(text))
      return null
    candidate = `https://${text}`
    assumed = true
  }

  let url: URL
  try {
    url = new URL(candidate)
  }
  catch {
    return null
  }
  if (!url.hostname)
    return null

  const host = url.hostname.toLowerCase()
  const displayHost = hostToUnicode(host)
  const site = siteOf(host)
  const displaySite = hostToUnicode(site)
  const warnings: Warning[] = []

  if (url.username || url.password) {
    warnings.push({
      code: 'userinfo',
      severity: 'danger',
      message: `The text before the “@” is not the website. This link really goes to ${displayHost}.`,
    })
  }

  if (isIpHost(host)) {
    warnings.push({
      code: 'ip',
      severity: 'danger',
      message: 'This link points at a bare IP address instead of a named website. Legitimate businesses almost never print one.',
    })
  }
  else {
    const verdicts = host.split('.').map(label => label.startsWith('xn--') ? judgeLabel(hostToUnicode(label)) : null)
    if (verdicts.includes('lookalike')) {
      warnings.push({
        code: 'lookalike',
        severity: 'danger',
        message: `“${displayHost}” uses letters from another alphabet that look like ordinary ones. Your browser will really connect to ${host}.`,
      })
    }
    else if (verdicts.includes('international')) {
      warnings.push({
        code: 'idn',
        severity: 'caution',
        message: `This address uses international characters. It is written ${host} underneath — check it is the site you expect.`,
      })
    }

    const before = host.split('.').slice(0, -site.split('.').length)
    if (before.some(label => TLD_LIKE.has(label))) {
      warnings.push({
        code: 'imitation',
        severity: 'danger',
        message: `The start of this address imitates another website. The site that actually answers is ${displaySite}.`,
      })
    }
  }

  if (SHORTENERS.has(host) || SHORTENERS.has(site)) {
    warnings.push({
      code: 'shortener',
      severity: 'caution',
      message: `${displayHost} is a link shortener or QR redirect service. It decides where you end up, and the destination can be changed after the code was printed.`,
    })
  }

  if (url.protocol === 'http:') {
    warnings.push({
      code: 'http',
      severity: 'caution',
      message: 'This link is not encrypted (http, not https). Do not type a password or card number into the page it opens.',
    })
  }

  if (url.port) {
    warnings.push({
      code: 'port',
      severity: 'caution',
      message: `This link uses an unusual port (${url.port}). Ordinary websites do not need one.`,
    })
  }

  for (const value of url.searchParams.values()) {
    const inner = /^https?:\/\/([^/?#\s]+)/i.exec(value.trim())
    if (inner) {
      warnings.push({
        code: 'redirect',
        severity: 'caution',
        message: `This link carries another address inside it and may forward you on to ${hostToUnicode(inner[1]!.toLowerCase())}.`,
      })
      break
    }
  }

  if (assumed) {
    warnings.push({
      code: 'assumed-scheme',
      severity: 'info',
      message: 'The code leaves out http:// or https://, so this opens it over https.',
    })
  }

  return {
    href: url.href,
    scheme: url.protocol === 'http:' ? 'http' : 'https',
    host,
    displayHost,
    site: displaySite,
    rest: shorten(`${url.pathname === '/' ? '' : url.pathname}${url.search}${url.hash}`),
    warnings,
  }
}
