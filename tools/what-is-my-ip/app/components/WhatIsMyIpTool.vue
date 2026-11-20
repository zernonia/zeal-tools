<script setup lang="ts">
import { Building2, Check, Clock, Copy, Loader2, MapPin, RefreshCw, Server, ShieldCheck } from 'lucide-vue-next'
import {
  describeResult,
  formatAsn,
  formatCoordinates,
  formatLocalTime,
  formatLocation,
  formatUtcOffset,
  kindLabel,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  worldDotsPath,
  worldPoint,
} from '../../core'
import { useMyIp } from '../composables/useMyIp'

const { info, loading, error, load } = useMyIp()
const { track } = useAnalytics()

/** First load only: a re-check keeps the old values on screen so nothing jumps. */
const pending = computed(() => loading.value && !info.value)

const summary = computed(() => {
  if (loading.value)
    return info.value ? 'Checking again…' : 'Reading your IP address…'
  if (error.value)
    return error.value
  return info.value ? describeResult(info.value) : ''
})

/*
 * The map is drawn here, from a few kilobytes of dots. Map tiles would be
 * prettier and would hand a tile server the very coordinates being shown.
 */
const DOTS = worldDotsPath()

const marker = computed(() => {
  const i = info.value
  if (i?.latitude == null || i.longitude == null)
    return null
  return worldPoint(i.latitude, i.longitude)
})

const place = computed(() => (info.value ? formatLocation(info.value) : null))
const coordinates = computed(() => (info.value ? formatCoordinates(info.value.latitude, info.value.longitude) : null))

// The clock ticks once a minute; the page renders without it on the server.
const now = ref<Date | null>(null)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  now.value = new Date()
  timer = setInterval(() => now.value = new Date(), 15_000)
})
onBeforeUnmount(() => clearInterval(timer))

const localTime = computed(() => (now.value ? formatLocalTime(info.value?.timezone ?? null, now.value) : null))
const utcOffset = computed(() => (now.value ? formatUtcOffset(info.value?.timezone ?? null, now.value) : null))

const tls = computed(() => info.value?.tlsVersion?.replace(/^TLSv/i, 'TLS ') ?? null)

const copied = ref(false)
async function copy() {
  const ip = info.value?.ip
  if (!ip)
    return
  try {
    await navigator.clipboard.writeText(ip)
    copied.value = true
    track('tool_completed', { tool: 'what-is-my-ip', format: 'copy' })
    setTimeout(() => copied.value = false, 1600)
  }
  catch {
    copied.value = false
  }
}

const sectionClass = 'rounded-2xl border bg-background p-5 sm:p-6 dark:bg-input/30'
const cardClass = 'flex flex-col rounded-2xl border bg-background p-5 dark:bg-input/30'
const chipClass = 'flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'
const skeleton = 'block animate-pulse rounded bg-muted'
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ summary }}
    </p>

    <section :class="sectionClass" aria-labelledby="my-ip-label">
      <div class="flex flex-wrap items-center gap-2">
        <h2 id="my-ip-label" class="text-sm font-medium text-muted-foreground">
          Your public IP address
        </h2>
        <span
          v-if="info?.version"
          class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
        >IPv{{ info.version }}</span>
        <span
          v-if="info?.kind && info.kind !== 'public' && info.kind !== 'documentation'"
          class="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
        >{{ kindLabel(info.kind) }}</span>
      </div>

      <!-- Two lines of the largest size are reserved, so a long IPv6 address does not shift the page. -->
      <div class="mt-3 flex min-h-18 items-center">
        <span v-if="pending" class="block h-12 w-72 max-w-full animate-pulse rounded-lg bg-muted" aria-hidden="true" />
        <p
          v-else-if="info?.ip"
          class="break-all font-mono font-semibold tracking-tight"
          :class="info.version === 6 ? 'text-xl sm:text-3xl' : 'text-4xl sm:text-5xl'"
        >
          {{ info.ip }}
        </p>
        <p v-else class="text-sm text-muted-foreground">
          {{ error ? 'Not available' : 'This connection did not carry an address we could read.' }}
        </p>
      </div>

      <!-- The copy area. Nothing else ever goes here. -->
      <div class="mt-4 flex flex-wrap gap-2">
        <Button size="lg" class="min-h-11 flex-1 sm:flex-none" :disabled="!info?.ip" @click="copy()">
          <component :is="copied ? Check : Copy" class="size-4" />
          {{ copied ? 'Copied' : 'Copy IP address' }}
        </Button>
        <Button size="lg" variant="outline" class="min-h-11" :disabled="loading" @click="load()">
          <Loader2 v-if="loading" class="size-4 animate-spin" />
          <RefreshCw v-else class="size-4" />
          Check again
        </Button>
      </div>

      <p v-if="error" class="mt-3 text-sm text-destructive" role="alert">
        {{ error }}
      </p>

      <p class="mt-4 max-w-prose text-xs leading-relaxed text-muted-foreground">
        Every website you open sees this address — it is where the reply has to be sent. This page reads it
        from your request to zeal.tools and shows it back to you. Nothing is stored or logged.
      </p>
    </section>

    <section class="overflow-hidden rounded-2xl border bg-background dark:bg-input/30" aria-labelledby="my-ip-where">
      <div class="flex flex-wrap items-start justify-between gap-3 p-5 pb-0 sm:p-6 sm:pb-0">
        <div class="flex min-w-0 items-start gap-3">
          <span :class="chipClass" aria-hidden="true">
            <MapPin class="size-4" />
          </span>
          <div class="min-w-0">
            <h2 id="my-ip-where" class="text-xs font-medium text-muted-foreground">
              Where websites think you are
            </h2>
            <p class="mt-0.5 min-h-7 text-lg font-semibold leading-snug">
              <span v-if="pending" :class="skeleton" class="mt-1 h-6 w-56 max-w-full" aria-hidden="true" />
              <template v-else-if="place">
                {{ place }}
              </template>
              <span v-else class="text-base font-normal text-muted-foreground">Not available</span>
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-1.5 text-xs">
          <span v-if="info?.country" class="rounded-md border px-2 py-1 font-mono font-medium">{{ info.country }}</span>
          <span v-if="info?.postalCode" class="rounded-md border px-2 py-1 text-muted-foreground">Postcode {{ info.postalCode }}</span>
          <span v-if="coordinates" class="rounded-md border px-2 py-1 font-mono text-muted-foreground">{{ coordinates }}</span>
        </div>
      </div>

      <div class="relative px-3 pb-2 pt-4 sm:px-6">
        <svg
          :viewBox="`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`"
          class="block h-auto w-full"
          role="img"
          :aria-label="place ? `World map with a marker near ${place}` : 'World map'"
        >
          <path
            :d="DOTS"
            fill="none"
            stroke-width="0.55"
            stroke-linecap="round"
            stroke-dasharray="0 1"
            class="stroke-muted-foreground/45"
          />
          <g v-if="marker" :transform="`translate(${marker.x} ${marker.y})`">
            <circle r="6" class="fill-primary/15 ip-pulse" />
            <circle r="3" class="fill-primary/25" />
            <circle r="1.5" class="fill-primary stroke-background" stroke-width="0.5" />
          </g>
        </svg>
      </div>
      <p class="px-5 pb-5 text-xs leading-relaxed text-muted-foreground sm:px-6 sm:pb-6">
        The city your provider's addresses are registered to — usually right about the country, often right
        about the city, never your street. The map is drawn on this page; no map service is asked.
      </p>
    </section>

    <div class="grid gap-5 md:grid-cols-3">
      <section :class="cardClass" aria-labelledby="my-ip-time">
        <div class="flex items-center gap-3">
          <span :class="chipClass" aria-hidden="true">
            <Clock class="size-4" />
          </span>
          <h2 id="my-ip-time" class="text-xs font-medium text-muted-foreground">
            Local time there
          </h2>
        </div>
        <p class="mt-4 min-h-10 font-mono text-4xl font-semibold leading-none tabular-nums">
          <span v-if="pending || (info?.timezone && !localTime)" :class="skeleton" class="h-9 w-28" aria-hidden="true" />
          <template v-else-if="localTime">
            {{ localTime }}
          </template>
          <span v-else class="font-sans text-base font-normal text-muted-foreground">Not available</span>
        </p>
        <div class="mt-3 flex flex-wrap gap-1.5 text-xs">
          <span v-if="info?.timezone" class="rounded-md border px-2 py-1">{{ info.timezone }}</span>
          <span v-if="utcOffset" class="rounded-md border px-2 py-1 font-mono text-muted-foreground">{{ utcOffset }}</span>
        </div>
        <p class="mt-auto pt-3 text-xs leading-relaxed text-muted-foreground">
          Guessed from the location, not read from your device.
        </p>
      </section>

      <section :class="cardClass" aria-labelledby="my-ip-provider">
        <div class="flex items-center gap-3">
          <span :class="chipClass" aria-hidden="true">
            <Building2 class="size-4" />
          </span>
          <h2 id="my-ip-provider" class="text-xs font-medium text-muted-foreground">
            Provider
          </h2>
        </div>
        <p class="mt-4 min-h-10 text-lg font-semibold leading-snug break-words">
          <span v-if="pending" :class="skeleton" class="h-6 w-40" aria-hidden="true" />
          <template v-else-if="info?.organisation">
            {{ info.organisation }}
          </template>
          <span v-else class="text-base font-normal text-muted-foreground">Not available</span>
        </p>
        <div class="mt-3 flex flex-wrap gap-1.5 text-xs">
          <span v-if="info?.asn" class="rounded-md border px-2 py-1 font-mono">{{ formatAsn(info.asn) }}</span>
          <span v-if="info?.continent" class="rounded-md border px-2 py-1 text-muted-foreground">Continent {{ info.continent }}</span>
        </div>
        <p class="mt-auto pt-3 text-xs leading-relaxed text-muted-foreground">
          The organisation that holds this block of addresses, and its network number.
        </p>
      </section>

      <section :class="cardClass" aria-labelledby="my-ip-connection">
        <div class="flex items-center gap-3">
          <span :class="chipClass" aria-hidden="true">
            <ShieldCheck class="size-4" />
          </span>
          <h2 id="my-ip-connection" class="text-xs font-medium text-muted-foreground">
            Connection
          </h2>
        </div>
        <div class="mt-4 flex min-h-10 flex-wrap items-center gap-2">
          <span v-if="pending" :class="skeleton" class="h-8 w-40" aria-hidden="true" />
          <template v-else>
            <span v-if="info?.httpProtocol" class="rounded-lg bg-primary px-2.5 py-1.5 font-mono text-sm font-semibold text-primary-foreground">{{ info.httpProtocol }}</span>
            <span v-if="tls" class="rounded-lg bg-primary/10 px-2.5 py-1.5 font-mono text-sm font-semibold text-primary">{{ tls }}</span>
            <span v-if="!info?.httpProtocol && !tls" class="text-base text-muted-foreground">Not available</span>
          </template>
        </div>
        <div class="mt-3 flex flex-wrap gap-1.5 text-xs">
          <span v-if="info?.colo" class="inline-flex items-center gap-1 rounded-md border px-2 py-1">
            <Server class="size-3 text-muted-foreground" aria-hidden="true" />
            Answered from <span class="font-mono font-medium">{{ info.colo }}</span>
          </span>
        </div>
        <p class="mt-auto pt-3 text-xs leading-relaxed text-muted-foreground">
          How your browser talked to this page, and the Cloudflare site (an airport code) that answered.
        </p>
      </section>
    </div>

    <p class="max-w-prose text-xs leading-relaxed text-muted-foreground">
      Location comes from Cloudflare's IP geolocation. On a VPN, everything above describes the VPN's server,
      not you.
    </p>
  </div>
</template>

<style scoped>
.ip-pulse {
  transform-box: fill-box;
  transform-origin: center;
  animation: ip-pulse 2.4s ease-out infinite;
}

@keyframes ip-pulse {
  0% {
    opacity: 0.9;
    scale: 0.4;
  }
  100% {
    opacity: 0;
    scale: 1.6;
  }
}
</style>
