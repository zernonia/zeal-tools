/**
 * EPP status codes (RFC 5731), in the spelling RDAP uses (RFC 8056) and in
 * words a person can act on.
 *
 * "client transfer prohibited" reads like a fault and is the opposite: it is
 * the lock that stops a domain being stolen. Most lookups show a column of
 * these with no explanation, which is exactly how people end up worried about
 * the healthiest domain they own.
 */

export type StatusTone = 'ok' | 'lock' | 'warn' | 'info'

export interface StatusInfo {
  code: string
  label: string
  meaning: string
  tone: StatusTone
}

const STATUSES: Record<string, Omit<StatusInfo, 'code'>> = {
  'active': { label: 'Active', meaning: 'Registered and in normal use, with nothing holding it.', tone: 'ok' },
  'ok': { label: 'OK', meaning: 'Registered and in normal use, with nothing holding it.', tone: 'ok' },
  'client transfer prohibited': { label: 'Transfer lock', meaning: 'Set by the registrar so the domain cannot be moved to another registrar without the owner unlocking it first. This is the usual protection against hijacking — a good sign.', tone: 'lock' },
  'client update prohibited': { label: 'Update lock', meaning: 'Set by the registrar so the contacts and nameservers cannot be changed without the owner unlocking it.', tone: 'lock' },
  'client delete prohibited': { label: 'Delete lock', meaning: 'Set by the registrar so the domain cannot be deleted by mistake or by an attacker.', tone: 'lock' },
  'client renew prohibited': { label: 'Renewal blocked', meaning: 'The registrar has blocked renewal — usually during a dispute or a payment problem.', tone: 'warn' },
  'client hold': { label: 'On hold', meaning: 'The registrar has taken it out of DNS, so it does not resolve. Typically an unpaid bill, unverified contact details or an abuse report.', tone: 'warn' },
  'server transfer prohibited': { label: 'Registry transfer lock', meaning: 'Set by the registry itself. Common on high-value names under a registry lock service, and on domains in a dispute.', tone: 'lock' },
  'server update prohibited': { label: 'Registry update lock', meaning: 'The registry will not accept changes — the strongest protection a domain can have, usually requested deliberately.', tone: 'lock' },
  'server delete prohibited': { label: 'Registry delete lock', meaning: 'The registry will not delete it, whatever the registrar asks.', tone: 'lock' },
  'server renew prohibited': { label: 'Registry renewal block', meaning: 'The registry has blocked renewal, usually because of a legal or policy action.', tone: 'warn' },
  'server hold': { label: 'Registry hold', meaning: 'The registry has taken it out of DNS, so it does not resolve. Usually a legal order or a policy action.', tone: 'warn' },
  'inactive': { label: 'No nameservers', meaning: 'Registered, but with no nameservers, so it does not resolve.', tone: 'info' },
  'pending create': { label: 'Being created', meaning: 'Registration has been requested and is still being processed.', tone: 'info' },
  'pending renew': { label: 'Renewal pending', meaning: 'A renewal has been requested and is still being processed.', tone: 'info' },
  'pending transfer': { label: 'Transfer pending', meaning: 'It is moving to another registrar. If you own it and did not ask for this, contact your registrar now.', tone: 'warn' },
  'pending update': { label: 'Update pending', meaning: 'A change has been requested and is still being processed.', tone: 'info' },
  'pending delete': { label: 'Being deleted', meaning: 'Past every grace period and about to be released — typically within five days, after which anyone can register it.', tone: 'warn' },
  'pending restore': { label: 'Being restored', meaning: 'The owner is recovering it from redemption.', tone: 'info' },
  'redemption period': { label: 'Redemption', meaning: 'Expired and deleted, but the previous owner can still recover it for a fee — usually for 30 days.', tone: 'warn' },
  'renew period': { label: 'Recently renewed', meaning: 'Renewed within the last few days, during which the renewal can still be cancelled.', tone: 'info' },
  'auto renew period': { label: 'Auto-renew grace', meaning: 'It passed its expiry date and the registry renewed it automatically. The owner has about 45 days to pay or let it go.', tone: 'warn' },
  'add period': { label: 'Newly registered', meaning: 'Registered within the last five days, during which the registration can still be cancelled.', tone: 'info' },
  'transfer period': { label: 'Recently transferred', meaning: 'Moved to a new registrar within the last few days.', tone: 'info' },
  'locked': { label: 'Locked', meaning: 'The registry reports it as locked against changes.', tone: 'lock' },
  'associated': { label: 'In use', meaning: 'Linked to other registry objects — a status registries use internally.', tone: 'info' },
  'removed': { label: 'Removed', meaning: 'The registry has removed it.', tone: 'warn' },
}

/** RDAP says `client transfer prohibited`; older tools say `clientTransferProhibited`. */
export function normalizeStatus(code: string): string {
  return code
    .replace(/https?:\/\/\S+/g, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim()
}

export function describeStatus(code: string): StatusInfo {
  const normalized = normalizeStatus(code)
  const known = STATUSES[normalized]
  if (known)
    return { code: normalized, ...known }
  return { code: normalized, label: normalized.replace(/^\w/, c => c.toUpperCase()), meaning: 'A status this registry uses that is not in the standard set.', tone: 'info' }
}

// ───────────────────────────────────────────────────────────────── dates

const DAY = 86_400_000

/** Whole days from `now` to `date`; negative when it has passed. */
export function daysUntil(date: string | null, now: Date = new Date()): number | null {
  if (!date)
    return null
  const time = Date.parse(date)
  if (Number.isNaN(time))
    return null
  return Math.floor((time - now.getTime()) / DAY)
}

/**
 * Calendar age — "29 years, 1 month" — counted in months rather than divided
 * out of milliseconds, so a domain registered on 15 September is a year older
 * on 15 September and not a few hours either side of it.
 */
export function describeAge(date: string | null, now: Date = new Date()): string | null {
  if (!date)
    return null
  const from = new Date(date)
  if (Number.isNaN(from.getTime()) || from > now)
    return null

  let months = (now.getUTCFullYear() - from.getUTCFullYear()) * 12 + (now.getUTCMonth() - from.getUTCMonth())
  if (now.getUTCDate() < from.getUTCDate())
    months--
  const years = Math.floor(months / 12)
  const rest = months % 12
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

  if (years === 0 && rest === 0) {
    const days = Math.floor((now.getTime() - from.getTime()) / DAY)
    return days === 0 ? 'Today' : plural(days, 'day')
  }
  if (years === 0)
    return plural(rest, 'month')
  if (rest === 0)
    return plural(years, 'year')
  return `${plural(years, 'year')}, ${plural(rest, 'month')}`
}

export type ExpiryState = 'expired' | 'soon' | 'ok' | 'unknown'

/** Thirty days is when most registrars start sending renewal warnings. */
export const EXPIRY_WARNING_DAYS = 30

export function expiryState(expires: string | null, now: Date = new Date()): ExpiryState {
  const days = daysUntil(expires, now)
  if (days === null)
    return 'unknown'
  if (days < 0)
    return 'expired'
  if (days <= EXPIRY_WARNING_DAYS)
    return 'soon'
  return 'ok'
}
