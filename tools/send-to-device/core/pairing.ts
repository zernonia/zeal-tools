/**
 * The wire protocol two devices use to find each other.
 *
 * A switchboard sits between them for exactly as long as it takes to swap
 * connection details. It relays these messages and holds nothing: everything
 * about who is present lives on the clients, which is why the server never
 * needs to remember a peer list. A device announces itself, and the devices
 * already there answer it directly.
 *
 * Pure and isomorphic, so the same parsing runs on both ends of the wire.
 */

import type { DeviceKind } from './index'

/** A device as its own owner describes it. Never inferred by anyone else. */
export interface PeerInfo {
  id: string
  alias: string
  kind: DeviceKind
}

export type ClientMessage
  /** "I am here", broadcast to everyone else on this network. */
  = | { t: 'hello', alias: string, kind: DeviceKind }
    /** "I am here too", answered privately to the device that just arrived. */
    | { t: 'hi', to: string, alias: string, kind: DeviceKind }
    /** "May I send you this?" — asked before a single byte moves. */
    | { t: 'ask', to: string, name: string, size: number }
    | { t: 'accept', to: string }
    | { t: 'decline', to: string }
    /** Connection details for one specific device. */
    | { t: 'signal', to: string, sdp: string, kind: 'offer' | 'answer' }

export type ServerMessage
  = | { t: 'welcome', id: string }
    | { t: 'hello', from: string, alias: string, kind: DeviceKind }
    | { t: 'hi', from: string, alias: string, kind: DeviceKind }
    | { t: 'ask', from: string, name: string, size: number }
    | { t: 'accept', from: string }
    | { t: 'decline', from: string }
    | { t: 'signal', from: string, sdp: string, kind: 'offer' | 'answer' }
    | { t: 'bye', from: string }

const KINDS = new Set(['phone', 'computer'])

/** Aliases are shown verbatim on someone else's screen, so they are bounded. */
export const MAX_ALIAS = 24

/** A filename arrives from another device and is shown before consent. */
export const MAX_NAME = 120

/** Control characters would let an alias forge line breaks in a UI. */
// eslint-disable-next-line no-control-regex -- matching them is the point
const CONTROL = /[\u0000-\u001F\u007F]/g

function cleanAlias(value: unknown): string | null {
  if (typeof value !== 'string')
    return null
  const trimmed = value.replace(CONTROL, '').trim()
  if (!trimmed || trimmed.length > MAX_ALIAS)
    return null
  return trimmed
}

/**
 * A filename someone else chose, made safe to display.
 *
 * This is shown on screen before the user has agreed to anything, so it is
 * the most attacker-controlled string in the tool. Path separators go too: the
 * name is only ever displayed, and one that reads like a path invites the
 * reader to believe it will be written somewhere.
 */
function cleanName(value: unknown): string | null {
  if (typeof value !== 'string')
    return null
  const trimmed = value.replace(CONTROL, '').replace(/[/\\]/g, '').trim()
  if (!trimmed || trimmed.length > MAX_NAME)
    return null
  return trimmed
}

function isSize(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 64
}

/**
 * Parse something a client sent.
 *
 * Returns null rather than throwing for anything unrecognised: this reads
 * input from the open internet, and a malformed frame is a thing to drop, not
 * an exception to handle.
 */
export function parseClientMessage(raw: string): ClientMessage | null {
  let value: Record<string, unknown>
  try {
    value = JSON.parse(raw)
  }
  catch {
    return null
  }
  if (!value || typeof value !== 'object')
    return null

  if (value.t === 'hello') {
    const alias = cleanAlias(value.alias)
    return alias && KINDS.has(value.kind as string)
      ? { t: 'hello', alias, kind: value.kind as DeviceKind }
      : null
  }

  if (value.t === 'hi') {
    const alias = cleanAlias(value.alias)
    return alias && KINDS.has(value.kind as string) && isId(value.to)
      ? { t: 'hi', to: value.to, alias, kind: value.kind as DeviceKind }
      : null
  }

  if (value.t === 'ask') {
    const name = cleanName(value.name)
    return name && isId(value.to) && isSize(value.size)
      ? { t: 'ask', to: value.to, name, size: value.size }
      : null
  }

  if (value.t === 'accept' || value.t === 'decline')
    return isId(value.to) ? { t: value.t, to: value.to } : null

  if (value.t === 'signal') {
    return isId(value.to) && typeof value.sdp === 'string' && value.sdp
      && (value.kind === 'offer' || value.kind === 'answer')
      ? { t: 'signal', to: value.to, sdp: value.sdp, kind: value.kind }
      : null
  }

  return null
}

export function parseServerMessage(raw: string): ServerMessage | null {
  let value: Record<string, unknown>
  try {
    value = JSON.parse(raw)
  }
  catch {
    return null
  }
  if (!value || typeof value !== 'object' || typeof value.t !== 'string')
    return null

  switch (value.t) {
    case 'welcome':
      return isId(value.id) ? { t: 'welcome', id: value.id } : null
    case 'hello':
    case 'hi': {
      const alias = cleanAlias(value.alias)
      return alias && KINDS.has(value.kind as string) && isId(value.from)
        ? { t: value.t, from: value.from, alias, kind: value.kind as DeviceKind }
        : null
    }
    case 'signal':
      return isId(value.from) && typeof value.sdp === 'string' && value.sdp
        && (value.kind === 'offer' || value.kind === 'answer')
        ? { t: 'signal', from: value.from, sdp: value.sdp, kind: value.kind }
        : null
    case 'ask': {
      const name = cleanName(value.name)
      return name && isId(value.from) && isSize(value.size)
        ? { t: 'ask', from: value.from, name, size: value.size }
        : null
    }
    case 'accept':
    case 'decline':
      return isId(value.from) ? { t: value.t, from: value.from } : null
    case 'bye':
      return isId(value.from) ? { t: 'bye', from: value.from } : null
    default:
      return null
  }
}

/**
 * Apply what just arrived to the list of devices on screen.
 *
 * Returns a new list rather than mutating, and is deliberately the only place
 * that decides presence, so "who can I see" is one tested function instead of
 * scattered handlers.
 */
export function applyPresence(peers: PeerInfo[], message: ServerMessage): PeerInfo[] {
  if (message.t === 'hello' || message.t === 'hi') {
    const next = peers.filter(p => p.id !== message.from)
    next.push({ id: message.from, alias: message.alias, kind: message.kind })
    // Stable order, so a device does not jump about as others come and go.
    return next.sort((a, b) => a.alias.localeCompare(b.alias) || a.id.localeCompare(b.id))
  }
  if (message.t === 'bye')
    return peers.filter(p => p.id !== message.from)
  return peers
}

/**
 * The part of an address that identifies a network rather than a device.
 *
 * The grouping assumed NAT — that everything behind one router leaves through
 * a single public address. That holds for IPv4 and is simply false for IPv6,
 * where every device has its own globally routable address and no translation
 * happens at all. Hashing the whole address therefore put each device in a
 * room of its own, and two phones on the same sofa never saw each other.
 *
 * So IPv4 keeps the full address, which is shared by the whole house, and IPv6
 * is cut to its /64 prefix, which is the block a LAN is delegated and which
 * every device on it shares. Privacy extensions rotate the half we discard.
 */
export function networkKey(ip: string): string {
  const address = ip.trim().toLowerCase()

  // ::ffff:203.0.113.5 is IPv4 wearing an IPv6 coat.
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped)
    return mapped[1]!

  if (!address.includes(':'))
    return address

  // Expand `::` so the first four hextets can be taken positionally.
  const [head = '', tail = ''] = address.split('::', 2)
  const headParts = head ? head.split(':') : []
  const tailParts = address.includes('::') ? (tail ? tail.split(':') : []) : []
  const missing = 8 - headParts.length - tailParts.length
  const groups = address.includes('::')
    ? [...headParts, ...Array.from({ length: Math.max(0, missing) }).fill('0'), ...tailParts]
    : address.split(':')

  return groups
    .slice(0, 4)
    .map(group => (group || '0').padStart(4, '0'))
    .join(':')
}
