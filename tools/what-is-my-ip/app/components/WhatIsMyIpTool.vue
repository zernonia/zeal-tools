<script setup lang="ts">
import { Building2, Check, Clock, Copy, Loader2, MapPin, Navigation, Network, RefreshCw, Server, ShieldCheck, Waypoints } from 'lucide-vue-next'
import {
  describeResult,
  formatAsn,
  formatConnection,
  formatCoordinates,
  formatLocalTime,
  formatLocation,
  kindLabel,
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

const localTime = computed(() => formatLocalTime(info.value?.timezone ?? null))

/*
 * A fixed set of rows, rendered on the server with placeholders, so filling
 * them in changes text and never height. A field Cloudflare did not send says
 * so rather than disappearing.
 */
const rows = computed(() => {
  const i = info.value
  return [
    {
      icon: MapPin,
      label: 'Location',
      value: i ? formatLocation(i) : null,
      hint: 'Approximate — the city your provider\'s addresses are registered to.',
    },
    {
      icon: Navigation,
      label: 'Coordinates',
      value: i ? formatCoordinates(i.latitude, i.longitude) : null,
      hint: 'The centre of that estimate, not your home.',
    },
    {
      icon: Clock,
      label: 'Time zone',
      value: i?.timezone ? (localTime.value ? `${i.timezone} · ${localTime.value} now` : i.timezone) : null,
      hint: 'Guessed from the location, not read from your device.',
    },
    {
      icon: Building2,
      label: 'Provider',
      value: i?.organisation ?? null,
      hint: 'The organisation that holds this block of addresses.',
    },
    {
      icon: Network,
      label: 'Network (ASN)',
      value: i ? formatAsn(i.asn) : null,
      hint: 'The provider\'s autonomous system number.',
    },
    {
      icon: Waypoints,
      label: 'Postcode area',
      value: i?.postalCode ?? null,
      hint: 'Often only the first part, and often wrong.',
    },
    {
      icon: Server,
      label: 'Data centre',
      value: i?.colo ?? null,
      hint: 'The airport code of the Cloudflare site that answered.',
    },
    {
      icon: ShieldCheck,
      label: 'Connection',
      value: i ? formatConnection(i.httpProtocol, i.tlsVersion) : null,
      hint: 'How your browser talked to this page.',
    },
  ]
})

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

const sectionClass = 'rounded-2xl border bg-background p-5 dark:bg-input/30'
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
        <span v-if="pending" class="block h-10 w-64 max-w-full animate-pulse rounded-lg bg-muted" aria-hidden="true" />
        <p
          v-else-if="info?.ip"
          class="break-all font-mono font-semibold tracking-tight"
          :class="info.version === 6 ? 'text-xl sm:text-3xl' : 'text-3xl sm:text-4xl'"
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

    <section :class="sectionClass" aria-labelledby="my-ip-details">
      <h2 id="my-ip-details" class="text-sm font-medium text-muted-foreground">
        What a website can tell from it
      </h2>
      <dl class="mt-4 grid gap-3 sm:grid-cols-2">
        <div v-for="row in rows" :key="row.label" class="flex gap-3 rounded-xl bg-muted/50 p-4">
          <component :is="row.icon" class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <dt class="text-xs font-medium text-muted-foreground">
              {{ row.label }}
            </dt>
            <dd class="mt-1 min-h-5 break-words text-sm font-medium">
              <span v-if="pending" class="block h-5 w-40 max-w-full animate-pulse rounded bg-muted" aria-hidden="true" />
              <template v-else-if="row.value">
                {{ row.value }}
              </template>
              <span v-else class="font-normal text-muted-foreground">Not available</span>
            </dd>
            <dd class="mt-1 text-xs leading-relaxed text-muted-foreground">
              {{ row.hint }}
            </dd>
          </div>
        </div>
      </dl>
      <p class="mt-4 max-w-prose text-xs leading-relaxed text-muted-foreground">
        Location comes from Cloudflare's IP geolocation, which maps blocks of addresses to the area they are
        registered to. It is usually right about the country, often right about the city, and never knows your
        street. On a VPN, everything above describes the VPN's server, not you.
      </p>
    </section>
  </div>
</template>
