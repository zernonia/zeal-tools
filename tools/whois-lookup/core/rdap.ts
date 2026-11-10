/**
 * Reading an RDAP domain response (RFC 9083) into something a person can use.
 *
 * RDAP replaced port-43 WHOIS for gTLDs in 2025 and is JSON, which sounds like
 * the end of parsing. It is not: every registry fills it differently. Contacts
 * arrive as jCard (RFC 7095) arrays, redaction is spelled "REDACTED FOR
 * PRIVACY", "DATA REDACTED", an empty string or a placeholder address
 * depending on who you ask, nameservers sometimes carry a trailing dot, and
 * "expiration" can appear twice with different dates. Each of those is a real
 * response under `fixtures/`, and each has a test.
 */

export interface Contact {
  name: string | null
  organization: string | null
  email: string | null
  phone: string | null
  /** Street, city, region, postcode — whatever the registry chose to publish. */
  address: string | null
  /** ISO 3166 alpha-2, when published. */
  country: string | null
  /** A web form for reaching a contact whose details are withheld. */
  contactUrl: string | null
  url: string | null
}

export interface Registrar extends Contact {
  /** IANA registrar ID, for gTLD registrars. */
  ianaId: string | null
}

export interface DomainRecord {
  domain: string
  handle: string | null
  registered: string | null
  expires: string | null
  updated: string | null
  status: string[]
  nameservers: string[]
  dnssec: boolean | null
  registrar: Registrar | null
  abuse: Contact | null
  registrant: Contact | null
  /** True when the registry or registrar says the owner's details are withheld. */
  redacted: boolean
  /** True when the published registrant is a privacy or proxy service. */
  privacyService: boolean
  /** Where a fuller record lives — usually the registrar's own RDAP server. */
  related: string | null
}

type JCardProp = [string, Record<string, unknown>, string, unknown]

interface RdapEntity {
  roles?: string[]
  handle?: string
  vcardArray?: [string, JCardProp[]]
  publicIds?: { type?: string, identifier?: string }[]
  entities?: RdapEntity[]
  remarks?: { title?: string, description?: string[] }[]
  links?: { rel?: string, href?: string, type?: string }[]
}

export interface RdapDomain {
  objectClassName?: string
  ldhName?: string
  handle?: string
  status?: string[]
  events?: { eventAction?: string, eventDate?: string }[]
  nameservers?: { ldhName?: string }[]
  secureDNS?: { delegationSigned?: boolean }
  entities?: RdapEntity[]
  links?: { rel?: string, href?: string, type?: string }[]
  redacted?: unknown[]
  remarks?: { title?: string, description?: string[] }[]
}

/**
 * Placeholders registries put where a value used to be. Matching on these
 * rather than on "contains a letter" is what keeps `Selangor, MY` — which one
 * registrar does publish — while dropping `DATA REDACTED, DATA REDACTED`.
 */
const PLACEHOLDER = /redacted|withheld|not disclosed|data protected|gdpr|statutory masking|non-public|^\W*$/i

/**
 * Names that are a stand-in for the owner rather than the owner: the privacy
 * and proxy services that register a domain on someone's behalf. They are
 * real values and shown as such, but labelled, because "Domains By Proxy, LLC"
 * owns a great many domains in no meaningful sense.
 */
const PROXY = /privacy|proxy|whoisguard|whois ?protect|identity protect|withheld for|private by design|contact privacy/i

function clean(value: unknown): string | null {
  if (typeof value !== 'string')
    return null
  const text = value.trim()
  if (!text || PLACEHOLDER.test(text))
    return null
  return text
}

/** `redacted@nominet.uk` is an address, and also not one. */
function cleanEmail(value: unknown): string | null {
  const text = clean(value)
  if (!text || /^redacted@/i.test(text))
    return null
  return text.replace(/^mailto:/i, '')
}

function cleanPhone(value: unknown): string | null {
  const text = clean(value)
  return text ? text.replace(/^tel:/i, '') : null
}

function props(entity: RdapEntity, name: string): JCardProp[] {
  const card = entity.vcardArray?.[1]
  return Array.isArray(card) ? card.filter(p => Array.isArray(p) && p[0] === name) : []
}

function first(entity: RdapEntity, name: string): unknown {
  return props(entity, name)[0]?.[3]
}

/**
 * jCard addresses are a seven-part array — PO box, extended, street, city,
 * region, postcode, country name — and any part may itself be an array of
 * lines. The country often lives in the `cc` parameter instead.
 */
function readAddress(entity: RdapEntity): { address: string | null, country: string | null } {
  const prop = props(entity, 'adr')[0]
  if (!prop)
    return { address: null, country: null }
  const params = prop[1] ?? {}
  const parts = Array.isArray(prop[3]) ? prop[3] : []
  const lines = parts
    .slice(0, 6)
    .flatMap(part => (Array.isArray(part) ? part : [part]))
    .map(clean)
    .filter((part): part is string => !!part)
  const cc = typeof params.cc === 'string' ? params.cc.toUpperCase() : null
  const countryName = clean(parts[6])
  return {
    address: lines.length ? lines.join(', ') : null,
    country: cc ?? countryName,
  }
}

export function readContact(entity: RdapEntity): Contact {
  const { address, country } = readAddress(entity)
  return {
    name: clean(first(entity, 'fn')),
    organization: clean(first(entity, 'org')),
    email: cleanEmail(first(entity, 'email')),
    phone: cleanPhone(props(entity, 'tel').find(p => !JSON.stringify(p[1]?.type ?? '').includes('fax'))?.[3]),
    address,
    country,
    contactUrl: typeof first(entity, 'contact-uri') === 'string' ? first(entity, 'contact-uri') as string : null,
    url: clean(first(entity, 'url')),
  }
}

/** True when a contact carries nothing a person could act on. */
export function isEmptyContact(contact: Contact | null): boolean {
  if (!contact)
    return true
  return !contact.name && !contact.organization && !contact.email && !contact.phone
    && !contact.address && !contact.country && !contact.contactUrl
}

function isProxy(contact: Contact | null): boolean {
  return !!contact && PROXY.test(`${contact.name ?? ''} ${contact.organization ?? ''}`)
}

function withRole(entities: RdapEntity[] | undefined, role: string): RdapEntity | undefined {
  for (const entity of entities ?? []) {
    if (entity.roles?.includes(role))
      return entity
  }
  return undefined
}

/**
 * The one event that matters, by name. Where a registrar reports both
 * `expiration` and `registrar expiration`, the plain one is the registry's
 * date and wins — it is when the domain actually lapses.
 */
function eventDate(record: RdapDomain, action: string): string | null {
  const found = record.events?.find(e => e.eventAction?.toLowerCase() === action)
  return found?.eventDate ?? null
}

function relatedLink(record: RdapDomain): string | null {
  for (const link of record.links ?? []) {
    if (link.rel !== 'related' || !link.href)
      continue
    // Registries also link to HTML pages; only another RDAP record is worth following.
    if (link.type && !/rdap\+json|application\/json/i.test(link.type))
      continue
    if (/^https:\/\//i.test(link.href) && /\/domain\//i.test(link.href))
      return link.href
  }
  return null
}

function mentionsRedaction(entity: RdapEntity | undefined): boolean {
  return !!entity?.remarks?.some(r => /redact|privacy|withheld/i.test(`${r.title ?? ''} ${(r.description ?? []).join(' ')}`))
}

export function readDomain(record: RdapDomain): DomainRecord {
  const registrarEntity = withRole(record.entities, 'registrar')
  const registrantEntity = withRole(record.entities, 'registrant')
  // Abuse contacts hang off the registrar entity in gTLD responses, and off
  // the domain itself in some ccTLD ones.
  const abuseEntity = withRole(registrarEntity?.entities, 'abuse') ?? withRole(record.entities, 'abuse')

  let registrar: Registrar | null = null
  if (registrarEntity) {
    const contact = readContact(registrarEntity)
    const ianaId = registrarEntity.publicIds?.find(id => /iana/i.test(id.type ?? ''))?.identifier ?? null
    registrar = {
      ...contact,
      // A registrar's display name sits in `fn` for some and `org` for others.
      name: contact.name ?? contact.organization,
      ianaId,
      url: contact.url ?? registrarEntity.links?.find(l => l.rel === 'about' && l.type === 'text/html')?.href ?? null,
    }
  }

  const registrant = registrantEntity ? readContact(registrantEntity) : null
  const abuse = abuseEntity ? readContact(abuseEntity) : null

  const redactionDeclared = Array.isArray(record.redacted) && record.redacted.some(item =>
    /registrant/i.test(JSON.stringify(item)))
  const redacted = redactionDeclared || mentionsRedaction(registrantEntity)
    || (!!registrantEntity && !registrant?.name && !registrant?.organization)

  return {
    domain: (record.ldhName ?? '').toLowerCase(),
    handle: record.handle ?? null,
    registered: eventDate(record, 'registration'),
    expires: eventDate(record, 'expiration') ?? eventDate(record, 'registrar expiration'),
    updated: eventDate(record, 'last changed'),
    status: (record.status ?? []).map(s => s.toLowerCase().trim()),
    nameservers: (record.nameservers ?? [])
      .map(ns => (ns.ldhName ?? '').toLowerCase().replace(/\.$/, ''))
      .filter(Boolean),
    dnssec: typeof record.secureDNS?.delegationSigned === 'boolean' ? record.secureDNS.delegationSigned : null,
    registrar,
    abuse: isEmptyContact(abuse) ? null : abuse,
    registrant: isEmptyContact(registrant) ? null : registrant,
    redacted,
    privacyService: isProxy(registrant),
    related: relatedLink(record),
  }
}

/**
 * The registry's record with the registrar's filled in where the registry had
 * nothing.
 *
 * Thin registries (.com, .net) hold no contacts at all, and the registrar is
 * where the owner lives. The registry stays authoritative for everything it
 * does publish — dates, status, nameservers — because the registry is what
 * actually decides whether the domain resolves and when it lapses.
 */
export function mergeRecords(registry: DomainRecord, registrar: DomainRecord | null): DomainRecord {
  if (!registrar)
    return registry
  const pick = <T>(a: T | null, b: T | null) => a ?? b
  const mergeContact = <T extends Contact>(a: T | null, b: T | null): T | null => {
    if (!a)
      return b
    if (!b)
      return a
    const out = { ...a }
    for (const key of Object.keys(b) as (keyof T)[]) {
      out[key] ??= b[key]
    }
    return out
  }
  return {
    ...registry,
    registered: pick(registry.registered, registrar.registered),
    expires: pick(registry.expires, registrar.expires),
    updated: pick(registry.updated, registrar.updated),
    nameservers: registry.nameservers.length ? registry.nameservers : registrar.nameservers,
    dnssec: pick(registry.dnssec, registrar.dnssec),
    registrar: mergeContact(registry.registrar, registrar.registrar),
    abuse: mergeContact(registry.abuse, registrar.abuse),
    registrant: mergeContact(registry.registrant, registrar.registrant),
    redacted: registry.redacted || registrar.redacted,
    privacyService: registry.privacyService || registrar.privacyService,
  }
}
