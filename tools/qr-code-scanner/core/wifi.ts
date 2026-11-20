import { first, readFields } from './fields'

/**
 * `WIFI:T:WPA;S:My Network;P:pa\;ss;H:false;;` — the format every phone camera
 * understands, from ZXing's original description of it.
 *
 * Fields come in any order. `\ ; , : "` are escaped with a backslash, and some
 * generators wrap a value in double quotes (the spec's way of marking an SSID
 * that would otherwise read as hex), so a matched pair of quotes is dropped.
 */

export interface WifiInfo {
  ssid: string
  password: string
  /** As written in the code: WPA, WEP, SAE, WPA2-EAP… or 'nopass'. */
  security: string
  /** True when the network has no password at all. */
  open: boolean
  hidden: boolean
  /** Enterprise networks need a username too, which the code may carry. */
  identity: string
  eapMethod: string
}

function unquote(value: string): string {
  return value.length >= 2 && value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value
}

export function parseWifi(raw: string): WifiInfo | null {
  const text = raw.trim()
  if (!/^WIFI:/i.test(text))
    return null
  const fields = readFields(text.slice(5))
  const ssid = unquote(first(fields, 'S'))
  if (!ssid)
    return null

  const password = unquote(first(fields, 'P'))
  const type = first(fields, 'T').trim()
  // An omitted T means no password, per the original description; a code that
  // omits T but still carries a password is trusted on the password.
  const open = /^nopass$/i.test(type) || (!type && !password)
  const security = open ? 'nopass' : (type || 'WPA').toUpperCase()

  return {
    ssid,
    password: open ? '' : password,
    security,
    open,
    hidden: /^true$/i.test(first(fields, 'H').trim()),
    identity: unquote(first(fields, 'I')),
    eapMethod: first(fields, 'E').toUpperCase(),
  }
}

/** A human name for the security type. */
export function securityLabel(info: WifiInfo): string {
  if (info.open)
    return 'Open network — no password'
  switch (info.security) {
    case 'WEP': return 'WEP (old and easily broken)'
    case 'SAE': return 'WPA3'
    case 'WPA': return 'WPA / WPA2 / WPA3'
    default: return info.security
  }
}
