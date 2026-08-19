<script setup lang="ts">
import { Check, FileUp, Laptop, Send, ShieldCheck, Smartphone, X } from 'lucide-vue-next'
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { formatBytes } from '../../core'
import { usePeerTransfer } from '../composables/usePeerTransfer'

const {
  link,
  myAlias,
  myKind,
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
} = usePeerTransfer()

const percent = computed(() => Math.round(progress.value * 100))
const busy = computed(() => phase.value !== 'idle')

const linkLabel = computed(() => ({
  connecting: 'Looking for devices…',
  online: 'Visible on this network',
  offline: 'Reconnecting…',
}[link.value]))

const status = computed(() => {
  if (phase.value === 'failed')
    return error.value
  if (phase.value === 'done') {
    return incoming.value
      ? `${transferName.value} arrived from ${partner.value?.alias}. It is ready to save.`
      : `${transferName.value} was sent to ${partner.value?.alias}.`
  }
  if (phase.value === 'transferring')
    return `${percent.value}% transferred, about ${remainingLabel.value} left.`
  if (phase.value === 'linking')
    return 'Connecting directly to the other device.'
  if (phase.value === 'declined')
    return `${partner.value?.alias} declined.`
  if (phase.value === 'asking')
    return `Waiting for ${partner.value?.alias} to accept.`
  return ''
})

function onFile(event: Event) {
  chooseFile((event.target as HTMLInputElement).files?.[0] ?? null)
}

function iconFor(kind: string) {
  return kind === 'phone' ? Smartphone : Laptop
}

// Dismissing the prompt any other way is a refusal, so the asking device is
// told rather than left waiting.
function onRequestOpenChange(open: boolean) {
  if (!open && request.value)
    decline()
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ status }}
    </p>

    <!-- What actually happens, stated before anything is sent. -->
    <details class="rounded-2xl border bg-muted/40 px-4 py-3 text-sm">
      <summary class="flex cursor-pointer items-center gap-2 font-medium">
        <ShieldCheck class="size-4 shrink-0 text-primary" />
        Your file goes device to device — but the introduction does not
      </summary>
      <div class="mt-3 space-y-2 text-muted-foreground">
        <p>
          To show you the devices on your network, each one tells our server it is here. What that server
          sees is a <strong class="text-foreground">scrambled form of your network's public address</strong>,
          the nickname below, and the technical details two browsers need to find each other. It uses the
          address only to work out which devices are on the same network as you, and keeps no record of any
          of it.
        </p>
        <p>
          <strong class="text-foreground">Your file never touches it.</strong> Once the two devices have
          been introduced they connect directly and the file crosses your own network, encrypted end to
          end. We could not read it, store it or resume it even if we wanted to — there is no copy anywhere
          but on your two devices.
        </p>
      </div>
    </details>

    <!-- This device. -->
    <div class="flex flex-col gap-2 rounded-2xl border bg-background px-4 py-3 dark:bg-input/30 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <span class="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <component :is="iconFor(myKind)" class="size-4" />
        </span>
        <span class="min-w-0">
          <span class="block text-xs text-muted-foreground">This device</span>
          <span class="block truncate font-medium" data-testid="my-alias">{{ myAlias }}</span>
        </span>
      </div>
      <span class="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
        <span
          class="size-2 rounded-full"
          :class="link === 'online' ? 'bg-primary' : 'bg-muted-foreground/40'"
          aria-hidden="true"
        />
        {{ linkLabel }}
      </span>
    </div>

    <template v-if="!busy">
      <!-- Step one: what to send. -->
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

      <!-- Step two: who to send it to. -->
      <div class="rounded-2xl border bg-background p-5 dark:bg-input/30">
        <div class="flex items-baseline justify-between gap-3">
          <p class="text-sm font-medium">
            Devices on your network
          </p>
          <p v-if="peers.length && !outgoing" class="text-xs text-muted-foreground">
            Choose a file first
          </p>
        </div>

        <!--
          Nobody here yet: the radar says we are genuinely listening.

          The rings must sit in a box of their own. They are centred on their
          container, so a container that also held the caption would centre
          them on the caption too and draw straight through the words. The box
          is sized to the widest the animation reaches.
        -->
        <div v-if="!peers.length" class="flex flex-col items-center py-4">
          <div class="relative grid size-48 shrink-0 place-items-center">
            <span
              v-for="i in 3"
              :key="i"
              class="radar-ring absolute size-28 rounded-full border-2 border-primary/50"
              :style="{ '--i': i - 1 }"
              aria-hidden="true"
            />
            <span class="relative grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
              <component :is="iconFor(myKind)" class="size-6" />
            </span>
          </div>
          <p class="max-w-sm text-balance text-center text-sm text-muted-foreground">
            Open this page on your other device and it will appear here. Both need to be on the same
            network.
          </p>
        </div>

        <ul v-else class="mt-3 grid gap-2 sm:grid-cols-2">
          <li v-for="peer in peers" :key="peer.id">
            <button
              type="button"
              :disabled="!outgoing"
              class="flex w-full min-h-16 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors enabled:hover:border-primary/60 enabled:hover:bg-muted/40 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              @click="sendTo(peer)"
            >
              <span class="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <component :is="iconFor(peer.kind)" class="size-4" />
              </span>
              <span class="min-w-0 grow">
                <span class="block truncate font-medium">{{ peer.alias }}</span>
                <span class="block text-xs text-muted-foreground">
                  {{ outgoing ? 'Tap to send' : 'Waiting for a file' }}
                </span>
              </span>
              <Send v-if="outgoing" class="size-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        </ul>
      </div>
    </template>

    <!-- Asking, linking, moving, and the endings. -->
    <div v-else class="rounded-2xl border bg-background p-6 dark:bg-input/30">
      <template v-if="phase === 'asking' || phase === 'linking'">
        <div class="relative isolate grid place-items-center overflow-hidden py-8">
          <span
            v-for="i in 3"
            :key="i"
            class="radar-ring absolute -z-10 size-24 rounded-full border-2 border-primary/60"
            :style="{ '--i': i - 1 }"
            aria-hidden="true"
          />
          <span class="grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
            <component :is="iconFor(partner?.kind ?? 'computer')" class="size-7" />
          </span>
        </div>
        <p class="text-center font-medium">
          {{ phase === 'asking' ? `Waiting for ${partner?.alias} to accept` : `Connecting to ${partner?.alias}` }}
        </p>
        <p class="mt-1 text-center text-sm text-muted-foreground">
          {{ phase === 'asking' ? 'Nothing is sent until they agree.' : 'Finding a path across your network.' }}
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

      <template v-else>
        <div class="flex flex-col items-center gap-3 text-center">
          <span
            class="grid size-14 place-items-center rounded-full"
            :class="phase === 'done' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'"
          >
            <component :is="phase === 'done' ? Check : X" class="size-7" />
          </span>
          <p class="font-medium">
            <template v-if="phase === 'done'">
              {{ incoming ? `Received from ${partner?.alias}` : `Sent to ${partner?.alias}` }}
            </template>
            <template v-else-if="phase === 'declined'">
              {{ partner?.alias }} declined
            </template>
            <template v-else>
              It didn't connect
            </template>
          </p>
          <p v-if="phase === 'done'" class="text-sm text-muted-foreground">
            {{ transferName }}
          </p>
          <p v-else-if="phase === 'failed'" class="max-w-md text-sm text-muted-foreground">
            {{ error }}
          </p>
          <div class="mt-1 flex flex-wrap justify-center gap-2">
            <Button v-if="incoming" as-child>
              <a :href="incoming.url" :download="incoming.name">
                <Check class="size-4" /> Save file
              </a>
            </Button>
            <Button variant="outline" @click="reset">
              Done
            </Button>
          </div>
        </div>
      </template>
    </div>

    <!--
      Consent. Anyone on this network can ask, so nothing is ever accepted for
      you — and closing this any other way counts as a refusal.
    -->
    <DialogRoot :open="!!request" @update:open="onRequestOpenChange">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-50 bg-neutral-950/40 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in" />
        <DialogContent
          class="fixed left-1/2 top-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-6 shadow-2xl"
          :aria-describedby="undefined"
        >
          <DialogTitle class="text-base font-semibold">
            {{ request?.alias }} wants to send you a file
          </DialogTitle>
          <p class="mt-3 break-all rounded-xl bg-muted/60 px-3 py-2 text-sm">
            {{ request?.name }}
          </p>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ formatBytes(request?.size ?? 0) }}
          </p>
          <div class="mt-5 flex justify-end gap-2">
            <Button variant="outline" @click="decline">
              Decline
            </Button>
            <Button @click="accept">
              <Check class="size-4" /> Accept
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
