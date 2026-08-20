import type { DeviceKind, FileMeta } from '../../core'
import type { PeerInfo, ServerMessage } from '../../core/pairing'
import {
  averageRate,
  CHUNK_SIZE,
  chunkRanges,
  deviceAlias,
  estimateRemaining,
  formatBytes,
  formatRate,
  transferProgress,
} from '../../core'
import { applyPresence, parseServerMessage } from '../../core/pairing'

export type Link = 'connecting' | 'online' | 'offline'

export type Phase
  = | 'idle'
  /** We asked a device to accept a file and are waiting for its answer. */
    | 'asking'
    | 'declined'
  /** Consent given; ICE is finding a path across the local network. */
    | 'linking'
    | 'transferring'
    | 'done'
    | 'failed'

export interface Incoming { name: string, size: number, type: string, url: string }
export interface Request { from: string, alias: string, name: string, size: number }

/**
 * Still no ICE servers, and that has not changed with the switchboard.
 *
 * The switchboard introduces two devices; it cannot carry anything between
 * them. With an empty ICE list the browser gathers host candidates only, so
 * the data path can only ever form across the local network — there is no
 * relay for a file to travel through, and no STUN lookup telling a third party
 * where anybody is. The file stays on your network even though the
 * introduction did not.
 */
const RTC_CONFIG: RTCConfiguration = { iceServers: [] }

const BUFFER_HIGH = 4 * 1024 * 1024
const BUFFER_LOW = 1 * 1024 * 1024
const GATHER_TIMEOUT = 3000

/** Long enough to ride out a sleeping laptop, short enough to feel alive. */
const RECONNECT_DELAY = 2000

function waitForGathering(pc: RTCPeerConnection) {
  if (pc.iceGatheringState === 'complete')
    return Promise.resolve()

  return new Promise<void>((resolve) => {
    let timer: ReturnType<typeof setTimeout>
    const onChange = () => {
      if (pc.iceGatheringState === 'complete')
        finish()
    }
    function finish() {
      pc.removeEventListener('icegatheringstatechange', onChange)
      clearTimeout(timer)
      resolve()
    }
    timer = setTimeout(finish, GATHER_TIMEOUT)
    pc.addEventListener('icegatheringstatechange', onChange)
  })
}

export function usePeerTransfer() {
  const link = ref<Link>('connecting')
  const myId = ref('')
  const myAlias = ref(deviceAlias())
  const myKind = ref<DeviceKind>('computer')
  const peers = ref<PeerInfo[]>([])
  const room = ref('')

  /**
   * A short, shareable form of the room.
   *
   * Grouping is inferred from the address the edge sees, so when two devices
   * fail to find each other there is otherwise nothing to look at. Showing it
   * turns "it just does not work" into a comparison the user can make in two
   * seconds — and different ids are a real answer, not a shrug.
   */
  const networkId = computed(() => room.value.slice(0, 6))

  const phase = ref<Phase>('idle')
  const error = ref('')
  const partner = ref<PeerInfo | null>(null)
  const request = ref<Request | null>(null)

  const outgoing = ref<File | null>(null)
  const incoming = ref<Incoming | null>(null)
  const expecting = ref<FileMeta | null>(null)

  const transferred = ref(0)
  const total = ref(0)
  const elapsed = ref(0)

  let socket: WebSocket | null = null
  let pc: RTCPeerConnection | null = null
  let channel: RTCDataChannel | null = null
  let ticker: ReturnType<typeof setInterval> | null = null
  let retry: ReturnType<typeof setTimeout> | null = null
  let startedAt = 0
  let closing = false

  const progress = computed(() => transferProgress(transferred.value, total.value))
  const rate = computed(() => averageRate(transferred.value, elapsed.value))
  const rateLabel = computed(() => formatRate(rate.value))
  const remainingLabel = computed(() => estimateRemaining(transferred.value, total.value, rate.value))
  const transferredLabel = computed(() => formatBytes(transferred.value))
  const totalLabel = computed(() => formatBytes(total.value))

  const transferName = computed(() =>
    incoming.value?.name ?? expecting.value?.name ?? outgoing.value?.name ?? '')

  function startClock() {
    startedAt = Date.now()
    elapsed.value = 0
    ticker = setInterval(() => { elapsed.value = Date.now() - startedAt }, 200)
  }

  function stopClock() {
    if (ticker)
      clearInterval(ticker)
    ticker = null
    if (startedAt)
      elapsed.value = Date.now() - startedAt
  }

  function fail(message: string) {
    error.value = message
    phase.value = 'failed'
    stopClock()
  }

  function post(message: object) {
    if (socket?.readyState === WebSocket.OPEN)
      socket.send(JSON.stringify(message))
  }

  // ----------------------------------------------------------------- presence

  async function connect() {
    try {
      link.value = 'connecting'
      // The room is decided by the network we are on, not by us — the socket
      // handler re-derives it and refuses anything that does not match.
      const { room: id } = await $fetch<{ room: string }>('/_pair/room')
      room.value = id
      const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:'
      socket = new WebSocket(`${scheme}//${location.host}/_ws/pair?room=${id}`)

      socket.addEventListener('open', () => {
        link.value = 'online'
        post({ t: 'hello', alias: myAlias.value, kind: myKind.value })
      })

      socket.addEventListener('message', (event) => {
        const parsed = parseServerMessage(String(event.data))
        if (parsed)
          handle(parsed)
      })

      socket.addEventListener('close', () => {
        link.value = 'offline'
        peers.value = []
        if (!closing)
          retry = setTimeout(connect, RECONNECT_DELAY)
      })
    }
    catch {
      link.value = 'offline'
      if (!closing)
        retry = setTimeout(connect, RECONNECT_DELAY)
    }
  }

  function handle(message: ServerMessage) {
    const before = peers.value
    peers.value = applyPresence(before, message)

    switch (message.t) {
      case 'welcome':
        myId.value = message.id
        break

      case 'hello':
        // Someone arrived. Answer directly so they see us too — this is why
        // the switchboard never has to remember who is present.
        post({ t: 'hi', to: message.from, alias: myAlias.value, kind: myKind.value })
        break

      case 'ask':
        // Never accepted automatically. Anyone on this network can ask.
        if (!request.value && phase.value === 'idle') {
          request.value = {
            from: message.from,
            alias: peers.value.find(p => p.id === message.from)?.alias ?? 'A nearby device',
            name: message.name,
            size: message.size,
          }
        }
        else {
          post({ t: 'decline', to: message.from })
        }
        break

      case 'accept':
        if (phase.value === 'asking' && partner.value?.id === message.from)
          void offerTo(message.from)
        break

      case 'decline':
        if (phase.value === 'asking' && partner.value?.id === message.from)
          phase.value = 'declined'
        break

      case 'signal':
        void onSignal(message)
        break

      case 'bye':
        if (request.value?.from === message.from)
          request.value = null
        if (partner.value?.id === message.from && ['asking', 'linking', 'transferring'].includes(phase.value))
          fail('That device disappeared before the transfer finished.')
        break
    }
  }

  // ------------------------------------------------------------------ webrtc

  function createPeer(to: string) {
    const peer = new RTCPeerConnection(RTC_CONFIG)
    peer.addEventListener('connectionstatechange', () => {
      if (peer.connectionState !== 'failed')
        return
      fail(phase.value === 'transferring'
        ? 'The connection dropped before the file finished.'
        : 'The two devices could not reach each other. Some guest and public networks stop devices talking directly — a home network or a phone hotspot will work.')
    })
    void to
    return peer
  }

  /** Sender: consent given, so describe how to reach us. */
  async function offerTo(to: string) {
    try {
      phase.value = 'linking'
      pc = createPeer(to)
      channel = pc.createDataChannel('file', { ordered: true })
      channel.binaryType = 'arraybuffer'
      channel.bufferedAmountLowThreshold = BUFFER_LOW
      channel.addEventListener('open', () => void sendFile())
      channel.addEventListener('error', () => fail('The connection failed mid-transfer.'))

      await pc.setLocalDescription(await pc.createOffer())
      await waitForGathering(pc)
      post({ t: 'signal', to, sdp: pc.localDescription!.sdp, kind: 'offer' })
    }
    catch (cause) {
      fail(cause instanceof Error ? cause.message : 'Could not start the transfer.')
    }
  }

  async function onSignal(message: Extract<ServerMessage, { t: 'signal' }>) {
    try {
      if (message.kind === 'answer') {
        if (pc && pc.signalingState !== 'stable')
          await pc.setRemoteDescription({ type: 'answer', sdp: message.sdp })
        return
      }

      // An offer only ever follows an accept we just gave.
      if (phase.value !== 'linking' || partner.value?.id !== message.from)
        return

      pc = createPeer(message.from)
      pc.addEventListener('datachannel', (event) => {
        channel = event.channel
        channel.binaryType = 'arraybuffer'
        listenForFile(channel)
      })

      await pc.setRemoteDescription({ type: 'offer', sdp: message.sdp })
      await pc.setLocalDescription(await pc.createAnswer())
      await waitForGathering(pc)
      post({ t: 'signal', to: message.from, sdp: pc.localDescription!.sdp, kind: 'answer' })
    }
    catch (cause) {
      fail(cause instanceof Error ? cause.message : 'The connection could not be set up.')
    }
  }

  function listenForFile(dc: RTCDataChannel) {
    const parts: ArrayBuffer[] = []
    let meta: FileMeta | null = null

    dc.addEventListener('message', (event) => {
      if (typeof event.data === 'string') {
        try {
          meta = JSON.parse(event.data)
          expecting.value = meta
          total.value = meta!.size
          transferred.value = 0
          phase.value = 'transferring'
          startClock()
        }
        catch {
          fail('The sending device announced something unreadable.')
        }
        return
      }

      const chunk = event.data as ArrayBuffer
      parts.push(chunk)
      transferred.value += chunk.byteLength

      if (meta && transferred.value >= meta.size) {
        stopClock()
        incoming.value = {
          name: meta.name,
          size: meta.size,
          type: meta.type,
          url: URL.createObjectURL(new Blob(parts, { type: meta.type || 'application/octet-stream' })),
        }
        phase.value = 'done'
      }
    })

    dc.addEventListener('error', () => fail('The connection failed mid-transfer.'))
  }

  /**
   * Push the file down the channel.
   *
   * One chunk at a time rather than queued all at once: a data channel has a
   * send buffer, and filling it faster than the network drains it closes the
   * channel outright in some browsers.
   */
  async function sendFile() {
    const file = outgoing.value
    const dc = channel
    if (!file || !dc)
      return fail('There is no file to send.')

    try {
      phase.value = 'transferring'
      transferred.value = 0
      total.value = file.size
      startClock()

      dc.send(JSON.stringify({ name: file.name, size: file.size, type: file.type }))

      for (const range of chunkRanges(file.size, CHUNK_SIZE)) {
        if (dc.readyState !== 'open')
          throw new Error('The connection closed before the file finished.')

        if (dc.bufferedAmount > BUFFER_HIGH) {
          await new Promise<void>((resolve) => {
            dc.addEventListener('bufferedamountlow', () => resolve(), { once: true })
          })
        }

        dc.send(await file.slice(range.start, range.end).arrayBuffer())
        transferred.value = range.end
      }

      stopClock()
      phase.value = 'done'
    }
    catch (cause) {
      fail(cause instanceof Error ? cause.message : 'The file could not be sent.')
    }
  }

  // ------------------------------------------------------------------ actions

  function chooseFile(file: File | null) {
    outgoing.value = file
  }

  /** Ask a device to accept the chosen file. Nothing moves until it answers. */
  function sendTo(peer: PeerInfo) {
    const file = outgoing.value
    if (!file)
      return
    resetTransfer()
    partner.value = peer
    phase.value = 'asking'
    post({ t: 'ask', to: peer.id, name: file.name, size: file.size })
  }

  function accept() {
    const asked = request.value
    if (!asked)
      return
    partner.value = peers.value.find(p => p.id === asked.from)
      ?? { id: asked.from, alias: asked.alias, kind: 'computer' }
    expecting.value = { name: asked.name, size: asked.size, type: '' }
    total.value = asked.size
    request.value = null
    phase.value = 'linking'
    post({ t: 'accept', to: asked.from })
  }

  function decline() {
    if (!request.value)
      return
    post({ t: 'decline', to: request.value.from })
    request.value = null
  }

  function teardown() {
    channel?.close()
    pc?.close()
    channel = null
    pc = null
  }

  function resetTransfer() {
    stopClock()
    teardown()
    if (incoming.value)
      URL.revokeObjectURL(incoming.value.url)
    incoming.value = null
    expecting.value = null
    partner.value = null
    error.value = ''
    transferred.value = 0
    total.value = 0
    elapsed.value = 0
    startedAt = 0
    phase.value = 'idle'
  }

  function reset() {
    resetTransfer()
    outgoing.value = null
  }

  onMounted(() => {
    myKind.value = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? 'phone' : 'computer'
    void connect()
  })

  onScopeDispose(() => {
    closing = true
    if (retry)
      clearTimeout(retry)
    stopClock()
    teardown()
    socket?.close()
    if (incoming.value)
      URL.revokeObjectURL(incoming.value.url)
  })

  return {
    link,
    myId,
    myAlias,
    myKind,
    networkId,
    peers,
    phase,
    error,
    partner,
    request,
    outgoing,
    incoming,
    progress,
    transferName,
    rateLabel,
    remainingLabel,
    transferredLabel,
    totalLabel,
    chooseFile,
    sendTo,
    accept,
    decline,
    reset,
  }
}
