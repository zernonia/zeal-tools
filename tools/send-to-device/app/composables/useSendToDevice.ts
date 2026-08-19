import type { DeviceKind, FileMeta } from '../../core'
import {
  averageRate,
  CHUNK_SIZE,
  chunkRanges,
  decodeSignal,
  deviceAlias,
  encodeSignal,
  estimateRemaining,
  formatBytes,
  formatRate,
  fromBase64Url,
  toBase64Url,
  transferProgress,
} from '../../core'

export type Role = 'unchosen' | 'receiving' | 'sending'

export type Phase
  = | 'idle'
    /** Offer built; the QR is up and waiting to be scanned. */
    | 'inviting'
    /** The other device answered; ICE is trying to find a path. */
    | 'linking'
    | 'connected'
    | 'transferring'
    | 'done'
    | 'failed'

export interface IncomingFile {
  name: string
  size: number
  type: string
  url: string
}

/**
 * No ICE servers, on purpose.
 *
 * With an empty list the browser gathers host candidates only — the addresses
 * of this machine on the local network. There is no STUN lookup, so no third
 * party ever learns either device's address, and no relay exists that the file
 * could travel through. That makes "the file never leaves your network" a
 * property of the configuration rather than a promise in the copy, and it is
 * also why this cannot reach a device on a different network.
 */
const RTC_CONFIG: RTCConfiguration = { iceServers: [] }

/** Keep this much queued in the data channel and no more. */
const BUFFER_HIGH = 4 * 1024 * 1024
const BUFFER_LOW = 1 * 1024 * 1024

/**
 * There is no signalling server to trickle candidates through, so the whole
 * offer has to be complete before it can go into a QR. Gathering usually ends
 * in well under a second on a LAN, but some browsers never fire `complete`;
 * the candidates found by then are enough for a local link.
 */
const GATHER_TIMEOUT = 3000

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

export function useSendToDevice() {
  const role = ref<Role>('unchosen')
  const phase = ref<Phase>('idle')
  const error = ref('')

  /**
   * Names for the two ends. Ours is made fresh each visit and never stored —
   * it exists so the person can confirm the screen in their other hand, not so
   * anything can recognise this device later.
   */
  const myAlias = ref(deviceAlias())
  const peerAlias = ref('')

  /** What each end is, as reported by that end rather than inferred here. */
  const myKind = ref<DeviceKind>('computer')
  const peerKind = ref<DeviceKind>('computer')

  /**
   * The incoming file's details, known from the header the moment the transfer
   * starts — long before the bytes are all here and `incoming` can exist.
   */
  const expecting = ref<FileMeta | null>(null)

  /** The link a receiving device shows as a QR. */
  const invite = ref('')
  /** The answer a sending device shows back, as a QR. */
  const reply = ref('')

  const outgoing = ref<File | null>(null)
  const incoming = ref<IncomingFile | null>(null)

  const transferred = ref(0)
  const total = ref(0)
  const startedAt = ref(0)
  const elapsed = ref(0)

  let pc: RTCPeerConnection | null = null
  let channel: RTCDataChannel | null = null
  let ticker: ReturnType<typeof setInterval> | null = null

  const progress = computed(() => transferProgress(transferred.value, total.value))
  const rate = computed(() => averageRate(transferred.value, elapsed.value))
  const rateLabel = computed(() => formatRate(rate.value))
  const remainingLabel = computed(() => estimateRemaining(transferred.value, total.value, rate.value))
  const transferredLabel = computed(() => formatBytes(transferred.value))
  const totalLabel = computed(() => formatBytes(total.value))

  function startClock() {
    startedAt.value = Date.now()
    elapsed.value = 0
    ticker = setInterval(() => { elapsed.value = Date.now() - startedAt.value }, 200)
  }

  function stopClock() {
    if (ticker)
      clearInterval(ticker)
    ticker = null
  }

  function fail(message: string) {
    error.value = message
    phase.value = 'failed'
    stopClock()
  }

  function createPeer() {
    const peer = new RTCPeerConnection(RTC_CONFIG)

    peer.addEventListener('connectionstatechange', () => {
      // The receiving device reaches this from `linking`; the sending device is
      // still showing its reply code, so it arrives here from `inviting`.
      if (peer.connectionState === 'connected' && (phase.value === 'linking' || phase.value === 'inviting'))
        phase.value = 'connected'

      // `failed` after a link was live means the transfer was interrupted;
      // before that it means ICE never found a path between the two devices.
      if (peer.connectionState === 'failed') {
        fail(phase.value === 'transferring'
          ? 'The connection dropped before the file finished.'
          : 'The two devices could not reach each other. Some public and guest networks block devices from talking directly — try a home or phone hotspot network.')
      }
    })

    return peer
  }

  // ---------------------------------------------------------------- receiving

  /**
   * Build the invitation.
   *
   * The receiving device is the one that offers, because the offering side is
   * the side that can create the data channel — and doing it here means the
   * invitation already describes the channel, so the sender has nothing to
   * negotiate beyond answering.
   */
  async function receive(origin: string) {
    try {
      role.value = 'receiving'
      error.value = ''
      pc = createPeer()

      channel = pc.createDataChannel('file', { ordered: true })
      channel.binaryType = 'arraybuffer'
      listenAsReceiver(channel)

      await pc.setLocalDescription(await pc.createOffer())
      await waitForGathering(pc)

      const local = pc.localDescription
      if (!local)
        throw new Error('This browser would not describe the connection.')

      // A plain https link, so the phone's own camera app opens it — no second
      // scanner to install, and no camera permission on the sending device.
      invite.value = `${origin}/tools/send-to-device#o=${toBase64Url(encodeSignal({ type: local.type, sdp: local.sdp, alias: myAlias.value, kind: myKind.value }))}`
      phase.value = 'inviting'
    }
    catch (cause) {
      fail(cause instanceof Error ? cause.message : 'Could not start listening.')
    }
  }

  /** Feed in the answer the sending device showed back. */
  async function acceptReply(text: string) {
    try {
      if (!pc)
        throw new Error('Nothing is waiting for a reply.')
      const answer = decodeSignal(text)
      if (answer.type !== 'answer')
        throw new Error('That code is an invitation, not a reply.')

      peerAlias.value = answer.alias
      peerKind.value = answer.kind
      phase.value = 'linking'
      await pc.setRemoteDescription(answer as RTCSessionDescriptionInit)
    }
    catch (cause) {
      fail(cause instanceof Error ? cause.message : 'That reply could not be read.')
    }
  }

  function listenAsReceiver(dc: RTCDataChannel) {
    const parts: ArrayBuffer[] = []
    let meta: { name: string, size: number, type: string } | null = null

    dc.addEventListener('open', () => {
      if (phase.value !== 'transferring')
        phase.value = 'connected'
    })

    dc.addEventListener('message', (event) => {
      // The header is the one text message; everything after it is file bytes.
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
        elapsed.value = Date.now() - startedAt.value
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

  // ------------------------------------------------------------------ sending

  /** Answer an invitation that arrived in the page's URL fragment. */
  async function answerInvite(encodedOffer: string) {
    try {
      role.value = 'sending'
      error.value = ''
      const offer = decodeSignal(fromBase64Url(encodedOffer))
      if (offer.type !== 'offer')
        throw new Error('That link is a reply, not an invitation.')

      peerAlias.value = offer.alias
      peerKind.value = offer.kind

      pc = createPeer()
      pc.addEventListener('datachannel', (event) => {
        channel = event.channel
        channel.binaryType = 'arraybuffer'
        channel.bufferedAmountLowThreshold = BUFFER_LOW
        channel.addEventListener('open', () => {
          if (phase.value !== 'transferring')
            phase.value = 'connected'
        })
        channel.addEventListener('error', () => fail('The connection failed mid-transfer.'))
      })

      await pc.setRemoteDescription(offer as RTCSessionDescriptionInit)
      await pc.setLocalDescription(await pc.createAnswer())
      await waitForGathering(pc)

      const local = pc.localDescription
      if (!local)
        throw new Error('This browser would not describe the connection.')

      reply.value = encodeSignal({ type: local.type, sdp: local.sdp, alias: myAlias.value, kind: myKind.value })
      phase.value = 'inviting'
    }
    catch (cause) {
      fail(cause instanceof Error ? cause.message : 'That invitation could not be read.')
    }
  }

  function chooseFile(file: File | null) {
    outgoing.value = file
    total.value = file?.size ?? 0
  }

  /**
   * Push the file down the channel.
   *
   * Chunks are read and sent one at a time rather than queued all at once: a
   * data channel has a send buffer, and filling it faster than the network
   * drains it closes the channel outright in some browsers. Waiting for
   * `bufferedamountlow` keeps a healthy amount in flight without overrunning.
   */
  async function send() {
    const file = outgoing.value
    const dc = channel
    if (!file || !dc)
      return fail('There is no file to send yet.')

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
      elapsed.value = Date.now() - startedAt.value
      phase.value = 'done'
    }
    catch (cause) {
      fail(cause instanceof Error ? cause.message : 'The file could not be sent.')
    }
  }

  function reset() {
    stopClock()
    channel?.close()
    pc?.close()
    channel = null
    pc = null
    if (incoming.value)
      URL.revokeObjectURL(incoming.value.url)
    role.value = 'unchosen'
    phase.value = 'idle'
    peerAlias.value = ''
    peerKind.value = 'computer'
    expecting.value = null
    error.value = ''
    invite.value = ''
    reply.value = ''
    outgoing.value = null
    incoming.value = null
    transferred.value = 0
    total.value = 0
    elapsed.value = 0
  }

  onScopeDispose(() => {
    stopClock()
    channel?.close()
    pc?.close()
    if (incoming.value)
      URL.revokeObjectURL(incoming.value.url)
  })

  return {
    role,
    phase,
    error,
    myAlias,
    peerAlias,
    myKind,
    peerKind,
    expecting,
    invite,
    reply,
    outgoing,
    incoming,
    progress,
    transferred,
    total,
    rateLabel,
    remainingLabel,
    transferredLabel,
    totalLabel,
    receive,
    acceptReply,
    answerInvite,
    chooseFile,
    send,
    reset,
  }
}
