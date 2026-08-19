<script setup lang="ts">
import { ArrowLeft, Camera, Check, Download, FileUp, Laptop, Smartphone, Upload, X } from 'lucide-vue-next'
import { formatBytes, qrSvg } from '../../core'
import { canScan, useQrScanner } from '../composables/useQrScanner'
import { useSendToDevice } from '../composables/useSendToDevice'

const route = useRoute()

const {
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

/**
 * Decided at setup, not in onMounted, and that matters: switching tab tears
 * down the half-built connection behind it, so setting it after mount fired
 * the watcher below and reset the answer we had just started building.
 */
const arrivingWithOffer = route.hash.startsWith('#o=')
const tab = ref<'receive' | 'send'>(arrivingWithOffer ? 'send' : 'receive')
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
  if (role.value === 'receiving')
    return void acceptReply(value)
  handleInviteLink(value)
})

const inviteQr = computed(() => (invite.value ? qrSvg(invite.value) : ''))
const replyQr = computed(() => (reply.value ? qrSvg(reply.value) : ''))

/** The handshake is over and the screen belongs to the transfer, not the tabs. */
const busy = computed(() => ['linking', 'connected', 'transferring', 'done', 'failed'].includes(phase.value))

const percent = computed(() => Math.round(progress.value * 100))
const transferName = computed(() => incoming.value?.name ?? expecting.value?.name ?? outgoing.value?.name ?? '')
const transferSize = computed(() => formatBytes(incoming.value?.size ?? expecting.value?.size ?? outgoing.value?.size ?? 0))

/**
 * One line describing where we are, read aloud on change.
 *
 * A handshake across two devices has no visible cause on this screen — the
 * other device is what moved — so every step says what just happened.
 */
const status = computed(() => {
  if (phase.value === 'failed')
    return error.value
  if (phase.value === 'done') {
    return role.value === 'receiving'
      ? `${transferName.value} arrived from ${peerAlias.value}. It is ready to save.`
      : `${transferName.value} was sent to ${peerAlias.value}.`
  }
  if (phase.value === 'transferring')
    return `${percent.value}% transferred, about ${remainingLabel.value} left.`
  if (phase.value === 'connected')
    return `Connected to ${peerAlias.value}.`
  if (phase.value === 'linking')
    return 'Connecting.'
  if (phase.value === 'inviting') {
    return role.value === 'sending'
      ? 'Ready. Show this code to the other device.'
      : 'Ready and waiting to be scanned.'
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
  chooseFile((event.target as HTMLInputElement).files?.[0] ?? null)
}

function startOver() {
  stopScan()
  showPaste.value = false
  pasted.value = ''
  reset()
  if (tab.value === 'receive')
    receive(window.location.origin)
  else
    role.value = 'sending'
}

/**
 * Switching tab is switching which end of the transfer this device is, so the
 * half-finished handshake behind it has to go. Landing on Receive publishes a
 * code straight away, the way LocalSend is simply visible once it is open.
 */
watch(tab, (next) => {
  stopScan()
  showPaste.value = false
  reset()
  if (next === 'receive')
    receive(window.location.origin)
  else
    role.value = 'sending'
})

/**
 * A sending device usually arrives by scanning the invitation with its own
 * camera app, which lands here with the offer in the fragment — the whole
 * reason the invitation is a link rather than a bare code.
 */
onMounted(() => {
  scannable.value = canScan()
  myKind.value = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? 'phone' : 'computer'

  if (arrivingWithOffer) {
    role.value = 'sending'
    handleInviteLink(route.hash.slice(3))
    return
  }
  receive(window.location.origin)
})

// Both halves are ready — the file was chosen and the code shown, so there is
// nothing left to confirm.
watch([phase, outgoing], ([current, file]) => {
  if (current === 'connected' && role.value === 'sending' && file)
    send()
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ status }}
    </p>

    <!--
      Who this device is calling itself, and who it found. The two names are
      the only thing a person can check to see they paired with the screen in
      their other hand, so they stack rather than truncate on a narrow one.
    -->
    <div class="flex flex-col gap-3 rounded-2xl border bg-background px-4 py-3 dark:bg-input/30 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 items-center gap-3">
        <span class="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <component :is="myKind === 'phone' ? Smartphone : Laptop" class="size-4" />
        </span>
        <span class="min-w-0">
          <span class="block text-xs text-muted-foreground">This device</span>
          <span class="block truncate font-medium" data-testid="my-alias">{{ myAlias }}</span>
        </span>
      </div>

      <div v-if="peerAlias" class="flex min-w-0 items-center gap-3 sm:flex-row-reverse">
        <span class="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <component :is="peerKind === 'phone' ? Smartphone : Laptop" class="size-4" />
        </span>
        <span class="min-w-0 sm:text-right">
          <span class="block text-xs text-muted-foreground">Other device</span>
          <span class="block truncate font-medium" data-testid="peer-alias">{{ peerAlias }}</span>
        </span>
      </div>
    </div>

    <!-- Tabs are the whole navigation, until a transfer takes the screen. -->
    <Tabs v-if="!busy" v-model="tab" class="flex flex-col gap-5">
      <TabsList class="self-center">
        <TabsTrigger value="receive" class="min-w-32 gap-2">
          <Download class="size-4" /> Receive
        </TabsTrigger>
        <TabsTrigger value="send" class="min-w-32 gap-2">
          <Upload class="size-4" /> Send
        </TabsTrigger>
      </TabsList>

      <TabsContent value="receive" class="flex flex-col gap-5 focus-visible:outline-none">
        <div class="rounded-2xl border bg-background dark:bg-input/30">
          <div class="relative isolate grid place-items-center overflow-hidden px-6 py-10">
            <span
              v-for="i in 3"
              :key="i"
              class="radar-ring absolute -z-10 size-52 rounded-full border-2 border-primary/60 sm:size-60"
              :style="{ '--i': i - 1 }"
              aria-hidden="true"
            />

            <div v-if="inviteQr" class="rounded-2xl bg-white p-3 shadow-lg ring-1 ring-black/5">
              <div class="size-52 sm:size-60" v-html="inviteQr" />
            </div>
            <div v-else class="grid size-52 place-items-center rounded-2xl border border-dashed text-sm text-muted-foreground sm:size-60">
              Preparing…
            </div>
          </div>

          <div class="border-t px-6 py-4 text-center">
            <p class="font-medium">
              Waiting for your other device
            </p>
            <p class="mt-1 text-sm text-muted-foreground">
              Open the camera on the device holding the file and point it at this code. It is an ordinary
              link — nothing to install.
            </p>

            <details class="mt-3 text-left text-sm">
              <summary class="cursor-pointer text-muted-foreground">
                Can't scan it?
              </summary>
              <p class="mt-2 text-muted-foreground">
                Send this link to your other device however you already can, and open it there.
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
        </div>

        <div class="rounded-2xl border bg-background p-5 dark:bg-input/30">
          <p class="text-sm font-medium">
            Then read the code it shows back
          </p>
          <p class="mt-1 text-sm text-muted-foreground">
            That second code is the reply that finishes the introduction.
          </p>

          <video
            v-show="scanning"
            ref="scannerVideo"
            class="mt-3 w-full max-w-sm rounded-xl border"
            playsinline
            muted
          />

          <div class="mt-3 flex flex-wrap gap-2">
            <Button v-if="scannable && !scanning" @click="startScan()">
              <Camera class="size-4" /> Use this camera
            </Button>
            <Button v-if="scanning" variant="outline" @click="stopScan()">
              <X class="size-4" /> Stop camera
            </Button>
            <Button variant="outline" @click="showPaste = !showPaste">
              Paste the code
            </Button>
          </div>

          <p v-if="scanError" class="mt-2 text-sm text-destructive">
            {{ scanError }}
          </p>
          <p v-else-if="!scannable" class="mt-2 text-sm text-muted-foreground">
            This browser can't read codes with the camera, so paste the code across instead.
          </p>

          <div v-if="showPaste" class="mt-3 flex flex-col gap-2">
            <Label for="reply-code">Code from the other device</Label>
            <Textarea id="reply-code" v-model="pasted" rows="3" placeholder="Paste the code here" />
            <Button class="self-start" :disabled="!pasted.trim()" @click="onPasted">
              Connect
            </Button>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="send" class="flex flex-col gap-5 focus-visible:outline-none">
        <div class="rounded-2xl border bg-background p-5 dark:bg-input/30">
          <p class="text-sm font-medium">
            What to send
          </p>
          <input id="send-file" type="file" class="sr-only" @change="onFile">
          <label
            for="send-file"
            class="mt-3 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-5 text-center text-sm transition-colors hover:border-primary/60 hover:bg-muted/40"
          >
            <FileUp class="size-6 text-muted-foreground" />
            <span v-if="outgoing" class="max-w-full truncate font-medium">{{ outgoing.name }}</span>
            <span v-else class="font-medium">Choose a file</span>
            <span class="text-xs text-muted-foreground">
              {{ outgoing ? formatBytes(outgoing.size) : 'It never leaves your network' }}
            </span>
          </label>
        </div>

        <div v-if="phase === 'inviting'" class="rounded-2xl border bg-background dark:bg-input/30">
          <div class="relative isolate grid place-items-center overflow-hidden px-6 py-10">
            <span
              v-for="i in 3"
              :key="i"
              class="radar-ring absolute -z-10 size-52 rounded-full border-2 border-primary/60 sm:size-60"
              :style="{ '--i': i - 1 }"
              aria-hidden="true"
            />
            <div class="rounded-2xl bg-white p-3 shadow-lg ring-1 ring-black/5">
              <div class="size-52 sm:size-60" v-html="replyQr" />
            </div>
          </div>

          <div class="border-t px-6 py-4 text-center">
            <p class="font-medium">
              Show this to {{ peerAlias || 'the other device' }}
            </p>
            <p class="mt-1 text-sm text-muted-foreground">
              Hold this screen up to its camera. The transfer starts by itself once you are connected.
            </p>
            <details class="mt-3 text-left text-sm">
              <summary class="cursor-pointer text-muted-foreground">
                That device can't use a camera
              </summary>
              <p class="mt-2 text-muted-foreground">
                Copy this code across to it and paste it there.
              </p>
              <Textarea
                :model-value="reply"
                readonly
                rows="3"
                class="mt-2 font-mono text-xs"
                aria-label="Connection code"
                data-testid="reply-code"
              />
            </details>
          </div>
        </div>

        <div v-else class="rounded-2xl border bg-background p-5 dark:bg-input/30">
          <p class="text-sm font-medium">
            Where to send it
          </p>
          <p class="mt-1 text-sm text-muted-foreground">
            Point this device's camera at the code on the one that will receive it.
          </p>

          <video
            v-show="scanning"
            ref="scannerVideo"
            class="mt-3 w-full max-w-sm rounded-xl border"
            playsinline
            muted
          />

          <div class="mt-3 flex flex-wrap gap-2">
            <Button v-if="scannable && !scanning" @click="startScan()">
              <Camera class="size-4" /> Use this camera
            </Button>
            <Button v-if="scanning" variant="outline" @click="stopScan()">
              <X class="size-4" /> Stop camera
            </Button>
            <Button variant="outline" @click="showPaste = !showPaste">
              Paste the code
            </Button>
          </div>

          <p v-if="scanError" class="mt-2 text-sm text-destructive">
            {{ scanError }}
          </p>

          <div v-if="showPaste" class="mt-3 flex flex-col gap-2">
            <Label for="invite-code">Code from the other device</Label>
            <Textarea id="invite-code" v-model="pasted" rows="3" placeholder="Paste the code or link here" />
            <Button class="self-start" :disabled="!pasted.trim()" @click="onPasted">
              Connect
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>

    <div v-else class="rounded-2xl border bg-background p-6 dark:bg-input/30">
      <template v-if="phase === 'linking' || phase === 'connected'">
        <div class="relative isolate grid place-items-center overflow-hidden py-8">
          <span
            v-for="i in 3"
            :key="i"
            class="radar-ring absolute -z-10 size-24 rounded-full border-2 border-primary/60"
            :style="{ '--i': i - 1 }"
            aria-hidden="true"
          />
          <span class="grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
            <component :is="peerKind === 'phone' ? Smartphone : Laptop" class="size-7" />
          </span>
        </div>
        <p class="text-center font-medium">
          {{ phase === 'linking' ? 'Connecting…' : `Connected to ${peerAlias}` }}
        </p>
        <p class="mt-1 text-center text-sm text-muted-foreground">
          {{ role === 'receiving' ? 'Waiting for the file to start arriving.' : 'Starting the transfer.' }}
        </p>
      </template>

      <template v-else-if="phase === 'transferring'">
        <div class="flex items-baseline justify-between gap-3">
          <p class="min-w-0 truncate font-medium">
            {{ transferName }}
          </p>
          <p class="shrink-0 text-2xl font-semibold tabular-nums">
            {{ percent }}%
          </p>
        </div>
        <div
          class="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          :aria-valuenow="percent"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Transfer progress"
        >
          <div class="h-full rounded-full bg-primary transition-[width] duration-200" :style="{ width: `${percent}%` }" />
        </div>
        <p class="mt-2 text-sm tabular-nums text-muted-foreground">
          {{ transferredLabel }} of {{ totalLabel }} · {{ rateLabel }} · {{ remainingLabel }} left
        </p>
      </template>

      <template v-else-if="phase === 'done'">
        <div class="flex flex-col items-center gap-3 text-center">
          <span class="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
            <Check class="size-7" />
          </span>
          <p class="font-medium">
            {{ role === 'receiving' ? `Received from ${peerAlias}` : `Sent to ${peerAlias}` }}
          </p>
          <p class="text-sm text-muted-foreground">
            {{ transferName }} — {{ transferSize }}
          </p>
          <div class="mt-1 flex flex-wrap justify-center gap-2">
            <Button v-if="incoming" as-child>
              <a :href="incoming.url" :download="incoming.name">
                <Download class="size-4" /> Save file
              </a>
            </Button>
            <Button variant="outline" @click="startOver">
              Send another
            </Button>
          </div>
        </div>
      </template>

      <template v-else-if="phase === 'failed'">
        <div class="flex flex-col items-center gap-3 text-center">
          <span class="grid size-14 place-items-center rounded-full bg-destructive/10 text-destructive">
            <X class="size-7" />
          </span>
          <p class="font-medium">
            It didn't connect
          </p>
          <p class="max-w-md text-sm text-muted-foreground">
            {{ error }}
          </p>
          <Button variant="outline" @click="startOver">
            <ArrowLeft class="size-4" /> Start again
          </Button>
        </div>
      </template>
    </div>
  </div>
</template>
