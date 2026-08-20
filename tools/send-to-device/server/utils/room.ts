import { networkKey } from '../../core/pairing'

/**
 * Which devices count as "near each other".
 *
 * Two devices on the same network share the network part of their public
 * address, which is the grouping — a refinement of the rule ShareDrop uses,
 * because the whole address only identifies a network under IPv4's NAT. It is hashed
 * before it is ever used as a topic or handed to a client, so nothing that
 * passes through the switchboard or appears in a log is an IP address.
 *
 * The hash is not a secret and does not need to be: a client cannot join a
 * room by guessing its name, because the socket handler re-derives the room
 * from the connecting address and refuses anything that does not match.
 */
const SALT = 'zeal.tools/send-to-device/v1'

/** Local development has no edge header; one shared room is what we want there. */
export const LOCAL_ROOM = 'local'

export async function roomFor(ip: string | null | undefined): Promise<string> {
  if (!ip)
    return LOCAL_ROOM

  // The network the address belongs to, not the device — see networkKey.
  const bytes = new TextEncoder().encode(`${SALT}:${networkKey(ip)}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .slice(0, 12)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** The address Cloudflare saw, which is the only one we can trust. */
export function callerIp(headers: Headers): string | null {
  return headers.get('cf-connecting-ip')
}
