import { parseClientMessage } from '../../../core/pairing'
import { callerIp, roomFor } from '../../utils/room'

/**
 * The switchboard.
 *
 * It introduces two devices on the same network and then gets out of the way.
 * It never sees a file, never sees a filename, and keeps no record of anyone:
 * there is no storage call anywhere in this file, and the Durable Object's
 * memory is wiped whenever it hibernates. What a device knows about its
 * neighbours it learned from those neighbours directly, relayed through here.
 *
 * Everything is scoped by topic rather than by object instance, because Nitro
 * routes every socket on the site to a single Durable Object. `peer.peers` is
 * therefore every connected device everywhere, and publishing to a room topic
 * is what keeps one network's devices invisible to another's.
 */

/** Topic every device on one network is subscribed to. */
const room = (id: string) => `room:${id}`
/** Topic only one device is subscribed to, used to answer it privately. */
const direct = (id: string) => `peer:${id}`

function send(peer: { publish: (topic: string, data: string) => void }, to: string, payload: object) {
  peer.publish(direct(to), JSON.stringify(payload))
}

export default defineWebSocketHandler({
  async upgrade(request) {
    // The room is checked here, while the headers still exist, and carried in
    // the URL from now on. Naming someone else's room gets you your own.
    const url = new URL(request.url)
    const claimed = url.searchParams.get('room')
    const actual = await roomFor(callerIp(request.headers))
    if (claimed !== actual)
      return new Response('Wrong room for this network.', { status: 403 })
  },

  open(peer) {
    const id = new URL(peer.request!.url).searchParams.get('room')
    if (!id)
      return peer.close(1008, 'No room')

    peer.subscribe(room(id))
    peer.subscribe(direct(peer.id))
    peer.send(JSON.stringify({ t: 'welcome', id: peer.id }))
  },

  message(peer, message) {
    const id = new URL(peer.request!.url).searchParams.get('room')
    if (!id)
      return

    const parsed = parseClientMessage(message.text())
    if (!parsed)
      return

    // "I am here" goes to the network; everything else is addressed to one
    // device, and is relayed without being read beyond checking its shape.
    if (parsed.t === 'hello') {
      peer.publish(room(id), JSON.stringify({
        t: 'hello',
        from: peer.id,
        alias: parsed.alias,
        kind: parsed.kind,
      }))
      return
    }

    if (parsed.t === 'hi') {
      send(peer, parsed.to, { t: 'hi', from: peer.id, alias: parsed.alias, kind: parsed.kind })
      return
    }

    if (parsed.t === 'ask') {
      send(peer, parsed.to, { t: 'ask', from: peer.id, name: parsed.name, size: parsed.size })
      return
    }

    if (parsed.t === 'accept' || parsed.t === 'decline') {
      send(peer, parsed.to, { t: parsed.t, from: peer.id })
      return
    }

    send(peer, parsed.to, { t: 'signal', from: peer.id, sdp: parsed.sdp, kind: parsed.kind })
  },

  close(peer) {
    const id = new URL(peer.request!.url).searchParams.get('room')
    if (id)
      peer.publish(room(id), JSON.stringify({ t: 'bye', from: peer.id }))
  },
})
