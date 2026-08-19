import { callerIp, roomFor } from '../../utils/room'

/**
 * Tell a device which room it is in, so it can name it when opening the socket.
 *
 * The room has to travel in the socket URL rather than being worked out once on
 * the server, because a hibernated Durable Object keeps only a socket's id and
 * URL — the request headers, and therefore the address, are long gone by the
 * time a later message arrives.
 */
export default defineEventHandler(async (event) => {
  const room = await roomFor(callerIp(event.headers))
  setResponseHeader(event, 'cache-control', 'no-store')
  return { room }
})
