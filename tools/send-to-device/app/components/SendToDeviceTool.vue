<script setup lang="ts">
import { ArrowLeft, Camera, Check, Download, Smartphone, Upload, X } from 'lucide-vue-next'
import { formatBytes, qrSvg } from '../../core'
import { canScan, useQrScanner } from '../composables/useQrScanner'
import { useSendToDevice } from '../composables/useSendToDevice'

const route = useRoute()

const {
  role,
  phase,
  error,
  invite,
  reply,
  outgoing,
  incoming,
  progress,
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
} = useSendToDevice()

const pasted = ref('')
const showPaste = ref(false)
const scannable = ref(false)

const {
  scanning,
  error: scanError,
  video: scannerVideo,
  start: startScan,
  stop: stopScan,
} = useQrScanner((value) => {
  // A scan from the sending device's screen is a reply; a scan of an
  // invitation is a link, which we hand to the same entry point the URL uses.
  if (role.value === 'receiving')
    return void acceptReply(value)
  handleInviteLink(value)
})

const inviteQr = computed(() => (invite.value ? qrSvg(invite.value) : ''))
const replyQr = computed(() => (reply.value ? qrSvg(reply.value) : ''))

/**
 * One line describing where we are, read aloud on change.
 *
 * A handshake across two devices has no visible cause on this screen — the
 * other device is what moved — so every step says what just happened and what
 * to do next.
 */
const status = computed(() => {
  if (phase.value === 'failed')
    return error.value
  if (phase.value === 'done') {
    return role.value === 'receiving'
      ? `${incoming.value?.name ?? 'The file'} arrived. It is ready to save.`
      : 'The file was sent.'
  }
  if (phase.value === 'transferring')
    return `Transferring — ${Math.round(progress.value * 100)}% done, about ${remainingLabel.value} left.`
  if (phase.value === 'connected') {
    return role.value === 'receiving'
      ? 'Connected. Waiting for the other device to send.'
      : 'Connected.'
  }
  if (phase.value === 'linking')
    return 'Connecting to the other device.'
  if (phase.value === 'inviting') {
    return role.value === 'receiving'
      ? 'Ready. Scan this code with your other device.'
      : 'Ready. Show this code to the other device.'
  }
  return ''
})

function handleInviteLink(value: string) {
  const encoded = value.includes('#o=') ? value.split('#o=')[1]! : value.trim()
  answerInvite(encoded)
}

function onPasted() {
  const text = pasted.value.trim()
  if (!text)
    return
  showPaste.value = false
  pasted.value = ''
  if (role.value === 'receiving')
    return void acceptReply(text)
  handleInviteLink(text)
}

function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  chooseFile(file)
}

function startReceiving() {
  receive(window.location.origin)
}

function startSending() {
  role.value = 'sending'
}

function startOver() {
  stopScan()
  showPaste.value = false
  pasted.value = ''
  reset()
}

/**
 * A sending device usually arrives here by scanning the invitation with its
 * own camera app, which lands on this page with the offer in the fragment.
 * That is the whole reason the invitation is a link: the phone needs no
 * scanner of its own and is never asked for camera permission.
 */
onMounted(() => {
  scannable.value = canScan()
  const hash = route.hash
  if (hash.startsWith('#o='))
    handleInviteLink(hash.slice(3))
})

// Send as soon as both halves are ready — the file was already chosen and the
// code already shown, so there is nothing left to confirm.
watch([phase, outgoing], ([current, file]) => {
  if (current === 'connected' && role.value === 'sending' && file)
    send()
})

const cardClass = 'rounded-2xl border bg-background dark:bg-input/30 p-6'
</script>

<template>
  <div class="flex flex-col gap-6">
    <p class="sr-only" aria-live="polite">
      {{ status }}
    </p>

    <!-- Step 1 — which end of the transfer is this device? -->
    <div v-if="role === 'unchosen'" class="grid gap-4 sm:grid-cols-2">
      <button
        type="button"
        :class="cardClass"
        class="flex min-h-[7rem] flex-col items-start gap-2 text-left transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="startReceiving"
      >
        <Download class="size-5 text-primary" />
        <span class="font-medium">Receive a file</span>
        <span class="text-sm text-muted-foreground">
          Show a code for your other device to scan.
        </span>
      </button>

      <button
        type="button"
        :class="cardClass"
        class="flex min-h-[7rem] flex-col items-start gap-2 text-left transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="startSending"
      >
        <Upload class="size-5 text-primary" />
        <span class="font-medium">Send a file</span>
        <span class="text-sm text-muted-foreground">
          Read the code shown on your other device.
        </span>
      </button>
    </div>

    <!-- Receiving: the invitation, then the reply that completes the link. -->
    <template v-else-if="role === 'receiving' && (phase === 'inviting' || phase === 'idle')">
      <div :class="cardClass" class="flex flex-col items-center gap-4 text-center">
        <p class="text-sm text-muted-foreground">
          Step 1 — on the device holding the file, open the camera and point it at this code.
        </p>
        <div
          v-if="inviteQr"
          class="w-full max-w-[24rem] rounded-xl bg-white p-3 shadow-sm"
          role="img"
          aria-label="Scan this code with your other device to start the transfer"
          v-html="inviteQr"
        />
        <p v-else class="py-16 text-sm text-muted-foreground">
          Preparing…
        </p>
        <p class="text-xs text-muted-foreground">
          It opens this page on that device — no app to install.
        </p>

        <details class="w-full text-left text-sm">
          <summary class="cursor-pointer text-muted-foreground">
            Can't scan it?
          </summary>
          <p class="mt-2 text-muted-foreground">
            The code is an ordinary link. Send it to your other device however you already can — a
            message to yourself works — and open it there.
          </p>
          <Textarea
            :model-value="invite"
            readonly
            rows="3"
            class="mt-2 font-mono text-xs"
            aria-label="Invitation link"
            data-testid="invite-link"
          />
        </details>
      </div>

      <div :class="cardClass" class="flex flex-col gap-3">
        <p class="text-sm text-muted-foreground">
          Step 2 — that device will show a code back. Read it here to finish connecting.
        </p>

        <video
          v-show="scanning"
          ref="scannerVideo"
          class="w-full max-w-[24rem] self-center rounded-xl border"
          playsinline
          muted
        />

        <div class="flex flex-wrap gap-2">
          <Button v-if="scannable && !scanning" @click="startScan()">
            <Camera class="size-4" /> Use this camera
          </Button>
          <Button v-if="scanning" variant="outline" @click="stopScan()">
            <X class="size-4" /> Stop camera
          </Button>
          <Button variant="outline" @click="showPaste = !showPaste">
            Paste the code instead
          </Button>
        </div>

        <p v-if="scanError" class="text-sm text-destructive">
          {{ scanError }}
        </p>
        <p v-else-if="!scannable" class="text-sm text-muted-foreground">
          This browser cannot read codes with the camera. Copy the code from the other device and paste it here.
        </p>

        <div v-if="showPaste" class="flex flex-col gap-2">
          <Label for="reply-code">Code from the other device</Label>
          <Textarea id="reply-code" v-model="pasted" rows="3" placeholder="Paste the code here" />
          <Button class="self-start" :disabled="!pasted.trim()" @click="onPasted">
            Connect
          </Button>
        </div>
      </div>
    </template>

    <!-- Sending: choose the file, then show the reply code. -->
    <template v-else-if="role === 'sending' && (phase === 'idle' || phase === 'inviting')">
      <div :class="cardClass" class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <Label for="send-file">Choose the file to send</Label>
          <input id="send-file" type="file" class="sr-only" @change="onFile">
          <label
            for="send-file"
            class="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm transition-colors hover:border-primary/60"
          >
            <Upload class="size-4 shrink-0 text-muted-foreground" />
            <span v-if="outgoing" class="truncate">{{ outgoing.name }} — {{ formatBytes(outgoing.size) }}</span>
            <span v-else class="text-muted-foreground">Pick a file from this device</span>
          </label>
        </div>

        <template v-if="phase === 'inviting'">
          <p class="text-sm text-muted-foreground">
            Now hold this screen up to the other device's camera to finish connecting.
          </p>
          <div
            v-if="replyQr"
            class="w-full max-w-[24rem] self-center rounded-xl bg-white p-3 shadow-sm"
            role="img"
            aria-label="Show this code to the device that will receive the file"
            v-html="replyQr"
          />
          <details class="text-sm">
            <summary class="cursor-pointer text-muted-foreground">
              That device can't use a camera
            </summary>
            <p class="mt-2 text-muted-foreground">
              Copy this code and get it to the other device any way you already can, then paste it there.
            </p>
            <Textarea :model-value="reply" readonly rows="3" class="mt-2 font-mono text-xs" aria-label="Connection code" data-testid="reply-code" />
          </details>
        </template>

        <div v-else-if="!scanning" class="flex flex-col gap-3 border-t pt-4">
          <p class="text-sm text-muted-foreground">
            Then read the code shown on the device that will receive it.
          </p>
          <div class="flex flex-wrap gap-2">
            <Button v-if="scannable" @click="startScan()">
              <Camera class="size-4" /> Use this camera
            </Button>
            <Button variant="outline" @click="showPaste = !showPaste">
              Paste the code instead
            </Button>
          </div>
          <div v-if="showPaste" class="flex flex-col gap-2">
            <Label for="invite-code">Code from the other device</Label>
            <Textarea id="invite-code" v-model="pasted" rows="3" placeholder="Paste the code or link here" />
            <Button class="self-start" :disabled="!pasted.trim()" @click="onPasted">
              Connect
            </Button>
          </div>
        </div>

        <video
          v-show="scanning"
          ref="scannerVideo"
          class="w-full max-w-[24rem] self-center rounded-xl border"
          playsinline
          muted
        />
      </div>
    </template>

    <!-- Linking, transferring, and the two endings. -->
    <div v-else :class="cardClass" class="flex flex-col items-center gap-4 text-center">
      <template v-if="phase === 'linking' || phase === 'connected'">
        <Smartphone class="size-8 text-primary" />
        <p class="font-medium">
          {{ phase === 'linking' ? 'Connecting…' : 'Connected' }}
        </p>
        <p class="text-sm text-muted-foreground">
          {{ role === 'receiving' ? 'Waiting for the file to start arriving.' : 'Starting the transfer.' }}
        </p>
      </template>

      <template v-else-if="phase === 'transferring'">
        <p class="font-medium">
          {{ role === 'receiving' ? 'Receiving' : 'Sending' }}
        </p>
        <div
          class="h-2 w-full max-w-md overflow-hidden rounded-full bg-muted"
          role="progressbar"
          :aria-valuenow="Math.round(progress * 100)"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Transfer progress"
        >
          <div class="h-full rounded-full bg-primary transition-[width] duration-200" :style="{ width: `${progress * 100}%` }" />
        </div>
        <p class="text-sm tabular-nums text-muted-foreground">
          {{ transferredLabel }} of {{ totalLabel }} · {{ rateLabel }} · {{ remainingLabel }} left
        </p>
      </template>

      <template v-else-if="phase === 'done'">
        <Check class="size-8 text-primary" />
        <p class="font-medium">
          {{ role === 'receiving' ? 'File received' : 'File sent' }}
        </p>
        <template v-if="incoming">
          <p class="text-sm text-muted-foreground">
            {{ incoming.name }} — {{ formatBytes(incoming.size) }}
          </p>
          <Button as-child>
            <a :href="incoming.url" :download="incoming.name">
              <Download class="size-4" /> Save file
            </a>
          </Button>
        </template>
        <Button variant="outline" @click="startOver">
          Send another
        </Button>
      </template>

      <template v-else-if="phase === 'failed'">
        <X class="size-8 text-destructive" />
        <p class="font-medium">
          It didn't connect
        </p>
        <p class="max-w-md text-sm text-muted-foreground">
          {{ error }}
        </p>
        <Button variant="outline" @click="startOver">
          <ArrowLeft class="size-4" /> Start again
        </Button>
      </template>
    </div>

    <button
      v-if="role !== 'unchosen' && phase !== 'done' && phase !== 'failed'"
      type="button"
      class="self-start text-sm text-muted-foreground underline-offset-4 hover:underline"
      @click="startOver"
    >
      Start again
    </button>
  </div>
</template>
