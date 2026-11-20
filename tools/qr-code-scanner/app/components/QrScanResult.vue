<script setup lang="ts">
import type { Component } from 'vue'
import type { IcsDate, ScanKind, ScanResult, Verdict, Warning } from '../../core'
import {
  Barcode,
  Building2,
  CalendarDays,
  CalendarPlus,
  Check,
  CircleCheck,
  Copy,
  ExternalLink,
  Globe,
  Info,
  Link2,
  Lock,
  LockOpen,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldAlert,
  StickyNote,
  TriangleAlert,
  Type,
  UserPlus,
  UserRound,
  Wifi,
} from 'lucide-vue-next'
import { fileName, formatLabel, hostParts, initials, KIND_LABELS, securityLabel, verdictOf, wifiStrength } from '../../core'

const props = defineProps<{ result: ScanResult }>()

const copied = ref('')
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copy(key: string, text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = key
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = '' }, 1600)
  }
  catch {
    copied.value = ''
  }
}

onBeforeUnmount(() => clearTimeout(copiedTimer))

const verdict = computed(() => verdictOf(props.result.warnings))
const severity = computed(() => verdict.value.tone)

const KIND_ICONS: Record<ScanKind, Component> = {
  url: Link2,
  wifi: Wifi,
  contact: UserRound,
  email: Mail,
  phone: Phone,
  sms: MessageSquare,
  geo: MapPin,
  event: CalendarDays,
  product: Barcode,
  text: Type,
}

/**
 * Status colours. The palette has no green or amber token, so these are the
 * one place raw hues appear — each pair checked for AA on its tinted ground
 * in both themes.
 */
const TONE: Record<Verdict, string> = {
  clear: 'border-emerald-600/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  caution: 'border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  danger: 'border-destructive/40 bg-destructive/10 text-destructive',
}

function warningClass(w: Warning): string {
  if (w.severity === 'danger')
    return TONE.danger
  if (w.severity === 'caution')
    return TONE.caution
  return 'border-border bg-muted/50 text-muted-foreground'
}

/** Files built in core are handed to the browser as data URLs: nothing is uploaded, nothing to revoke. */
function dataUrl(type: string, text: string): string {
  return `data:${type};charset=utf-8,${encodeURIComponent(text)}`
}

function asDate(date: IcsDate): Date {
  if (date.allDay) {
    const [y, m, d] = date.iso.split('-').map(Number)
    return new Date(y!, m! - 1, d!)
  }
  return new Date(date.iso)
}

function when(date: IcsDate | null): string {
  if (!date)
    return ''
  if (date.allDay)
    return asDate(date).toLocaleDateString(undefined, { dateStyle: 'full' })
  // A time with Z is UTC and is shown in the visitor's zone; one without is
  // local to wherever the event is, and is shown as written.
  const text = asDate(date).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })
  return date.tzid ? `${text} (${date.tzid} time)` : text
}

/** The tear-off calendar tile: month above, day below. */
const eventTile = computed(() => {
  if (props.result.kind !== 'event' || !props.result.event.start)
    return null
  const date = asDate(props.result.event.start)
  if (Number.isNaN(date.getTime()))
    return null
  return {
    month: date.toLocaleDateString(undefined, { month: 'short' }),
    day: date.getDate(),
  }
})

const host = computed(() => (props.result.kind === 'url' ? hostParts(props.result.url) : null))
const wifiTone = computed(() => (props.result.kind === 'wifi' ? wifiStrength(props.result.wifi) : null))

const title = computed(() => KIND_LABELS[props.result.kind])
const rowClass = 'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2'
const iconTile = 'grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground'
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- What it is, and whether to trust it -->
    <div class="flex items-start gap-3">
      <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground" aria-hidden="true">
        <component :is="KIND_ICONS[result.kind]" class="size-5" />
      </span>
      <div class="min-w-0 flex-1">
        <h2 id="scan-result-heading" class="font-semibold leading-tight">
          {{ title }}
        </h2>
        <p class="mt-0.5 text-xs text-muted-foreground">
          Read from a {{ formatLabel(result.format) }}
        </p>
      </div>
      <span
        v-if="result.kind === 'url' || result.warnings.length"
        class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
        :class="TONE[verdict.tone]"
        data-testid="scan-verdict"
      >
        <ShieldAlert v-if="verdict.tone === 'danger'" class="size-3.5" aria-hidden="true" />
        <TriangleAlert v-else-if="verdict.tone === 'caution'" class="size-3.5" aria-hidden="true" />
        <CircleCheck v-else class="size-3.5" aria-hidden="true" />
        {{ verdict.label }}
      </span>
    </div>

    <!-- Warnings first: they are the reason to read the rest. -->
    <ul v-if="result.warnings.length" class="flex flex-col gap-2">
      <li
        v-for="w in result.warnings"
        :key="w.code"
        class="flex gap-2.5 rounded-xl border p-3 text-sm"
        :class="warningClass(w)"
      >
        <ShieldAlert v-if="w.severity === 'danger'" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <TriangleAlert v-else-if="w.severity === 'caution'" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <Info v-else class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span class="text-foreground">
          <span class="sr-only">{{ w.severity === 'danger' ? 'Warning: ' : w.severity === 'caution' ? 'Caution: ' : 'Note: ' }}</span>
          {{ w.message }}
        </span>
      </li>
    </ul>

    <!-- Link: the address taken apart, so the part that matters stands out -->
    <template v-if="result.kind === 'url' && host">
      <div class="rounded-xl border bg-muted/40 p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          This link goes to
        </p>
        <p class="mt-1.5 font-heading text-xl sm:text-2xl font-semibold leading-tight" data-testid="scan-site">
          <span v-if="host.prefix" class="break-all font-normal text-muted-foreground">{{ host.prefix }}</span><span class="inline-block break-all">{{ host.site }}</span>
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span
            class="inline-flex items-center gap-1 rounded-md border px-2 py-1 font-medium"
            :class="result.url.scheme === 'https' ? TONE.clear : TONE.caution"
          >
            <Lock v-if="result.url.scheme === 'https'" class="size-3" aria-hidden="true" />
            <LockOpen v-else class="size-3" aria-hidden="true" />
            {{ result.url.scheme === 'https' ? 'Encrypted' : 'Not encrypted' }}
          </span>
          <span class="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 dark:bg-input/30">
            <Globe class="size-3 text-muted-foreground" aria-hidden="true" />
            <span class="text-muted-foreground">Site</span>
            <span class="font-medium">{{ result.url.site }}</span>
          </span>
          <span v-if="result.url.rest" class="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border bg-background px-2 py-1 dark:bg-input/30">
            <span class="text-muted-foreground">Path</span>
            <span class="truncate font-mono">{{ result.url.rest }}</span>
          </span>
        </div>
        <p v-if="result.url.displayHost !== result.url.host" class="mt-3 break-all font-mono text-xs text-muted-foreground">
          Really: {{ result.url.host }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button as-child size="lg" :variant="severity === 'danger' ? 'outline' : 'default'">
          <a :href="result.url.href" target="_blank" rel="noopener noreferrer">
            <ExternalLink class="size-4" aria-hidden="true" />
            {{ severity === 'danger' ? 'Open anyway' : `Open ${result.url.site}` }}
          </a>
        </Button>
        <Button variant="outline" size="lg" @click="copy('link', result.url.href)">
          <Check v-if="copied === 'link'" class="size-4" aria-hidden="true" />
          <Copy v-else class="size-4" aria-hidden="true" />
          {{ copied === 'link' ? 'Copied' : 'Copy link' }}
        </Button>
      </div>
    </template>

    <!-- WiFi: a network card -->
    <template v-else-if="result.kind === 'wifi'">
      <div class="overflow-hidden rounded-xl border">
        <div class="flex items-center gap-3 bg-muted/40 p-4">
          <span class="relative grid size-12 shrink-0 place-items-center rounded-full bg-background dark:bg-input/30" aria-hidden="true">
            <Wifi class="size-6" />
            <span
              class="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full border"
              :class="wifiTone === 'secure' ? TONE.clear : TONE.caution"
            >
              <Lock v-if="wifiTone === 'secure'" class="size-2.5" />
              <LockOpen v-else class="size-2.5" />
            </span>
          </span>
          <div class="min-w-0">
            <p class="break-all text-lg font-semibold leading-tight">
              {{ result.wifi.ssid }}
            </p>
            <p class="mt-0.5 text-xs text-muted-foreground">
              {{ securityLabel(result.wifi) }}<template v-if="result.wifi.hidden">
                · hidden network
              </template>
            </p>
          </div>
        </div>
        <dl class="divide-y text-sm">
          <div v-if="!result.wifi.open" class="flex items-center gap-3 px-4 py-2">
            <dt class="w-20 shrink-0 text-muted-foreground">
              Password
            </dt>
            <dd class="min-w-0 flex-1 break-all font-mono font-medium">
              {{ result.wifi.password || '(none given)' }}
            </dd>
            <Button
              v-if="result.wifi.password"
              variant="ghost"
              size="icon"
              class="size-11 shrink-0"
              :aria-label="copied === 'password' ? 'Password copied' : 'Copy password'"
              @click="copy('password', result.wifi.password)"
            >
              <Check v-if="copied === 'password'" class="size-4" aria-hidden="true" />
              <Copy v-else class="size-4" aria-hidden="true" />
            </Button>
          </div>
          <div v-if="result.wifi.identity" class="flex min-h-11 items-center gap-3 px-4 py-2">
            <dt class="w-20 shrink-0 text-muted-foreground">
              Username
            </dt>
            <dd class="min-w-0 flex-1 break-all font-medium">
              {{ result.wifi.identity }}
            </dd>
          </div>
        </dl>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button v-if="result.wifi.password" size="lg" @click="copy('password', result.wifi.password)">
          <Check v-if="copied === 'password'" class="size-4" aria-hidden="true" />
          <Copy v-else class="size-4" aria-hidden="true" />
          {{ copied === 'password' ? 'Copied' : 'Copy password' }}
        </Button>
        <Button variant="outline" size="lg" @click="copy('ssid', result.wifi.ssid)">
          <Check v-if="copied === 'ssid'" class="size-4" aria-hidden="true" />
          <Copy v-else class="size-4" aria-hidden="true" />
          {{ copied === 'ssid' ? 'Copied' : 'Copy network name' }}
        </Button>
      </div>
      <p class="text-sm text-muted-foreground">
        A web page cannot join a WiFi network for you — no browser allows it. Copy the password, then choose
        <span class="font-medium text-foreground">{{ result.wifi.ssid }}</span> in your device’s WiFi settings.
        On a phone, the built-in camera app can join straight from this code.
      </p>
    </template>

    <!-- Contact: a contact card -->
    <template v-else-if="result.kind === 'contact'">
      <div class="overflow-hidden rounded-xl border">
        <div class="flex items-center gap-4 bg-muted/40 p-4">
          <span class="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground" aria-hidden="true">
            <template v-if="initials(result.contact.name || result.contact.organisation)">{{ initials(result.contact.name || result.contact.organisation) }}</template>
            <UserRound v-else class="size-6" />
          </span>
          <div class="min-w-0">
            <p class="break-words font-heading text-xl font-semibold leading-tight">
              {{ result.contact.name || result.contact.organisation || 'Unnamed contact' }}
            </p>
            <p v-if="result.contact.title || (result.contact.name && result.contact.organisation)" class="mt-0.5 text-sm text-muted-foreground">
              {{ [result.contact.title, result.contact.name ? result.contact.organisation : ''].filter(Boolean).join(' · ') }}
            </p>
          </div>
        </div>
        <ul class="flex flex-col p-1.5 text-sm">
          <li v-for="tel in result.contact.phones" :key="`t${tel}`" :class="rowClass">
            <span :class="iconTile"><Phone class="size-4" aria-hidden="true" /></span>
            <span class="sr-only">Phone:</span><span class="min-w-0 break-all font-medium">{{ tel }}</span>
          </li>
          <li v-for="email in result.contact.emails" :key="`e${email}`" :class="rowClass">
            <span :class="iconTile"><Mail class="size-4" aria-hidden="true" /></span>
            <span class="sr-only">Email:</span><span class="min-w-0 break-all font-medium">{{ email }}</span>
          </li>
          <li v-for="url in result.contact.urls" :key="`u${url}`" :class="rowClass">
            <span :class="iconTile"><Globe class="size-4" aria-hidden="true" /></span>
            <span class="sr-only">Website:</span><span class="min-w-0 break-all font-medium">{{ url }}</span>
          </li>
          <li v-if="result.contact.address" :class="rowClass">
            <span :class="iconTile"><Building2 class="size-4" aria-hidden="true" /></span>
            <span class="sr-only">Address:</span><span class="min-w-0 font-medium">{{ result.contact.address }}</span>
          </li>
          <li v-if="result.contact.note" :class="rowClass">
            <span :class="iconTile"><StickyNote class="size-4" aria-hidden="true" /></span>
            <span class="sr-only">Note:</span><span class="min-w-0 whitespace-pre-line text-muted-foreground">{{ result.contact.note }}</span>
          </li>
        </ul>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button as-child size="lg">
          <a :href="dataUrl('text/vcard', result.vcard)" :download="fileName(result.contact.name || result.contact.organisation, 'vcf', 'contact')">
            <UserPlus class="size-4" aria-hidden="true" /> Save contact (.vcf)
          </a>
        </Button>
      </div>
      <p class="text-sm text-muted-foreground">
        Opening the .vcf file adds the contact to your phone or computer’s address book, which asks before saving.
      </p>
    </template>

    <!-- Email: an envelope -->
    <template v-else-if="result.kind === 'email'">
      <div class="overflow-hidden rounded-xl border text-sm">
        <dl class="divide-y">
          <div class="flex min-h-11 items-center gap-3 px-4 py-2">
            <dt class="w-16 shrink-0 text-muted-foreground">
              To
            </dt>
            <dd class="min-w-0 break-all font-medium">
              {{ result.email.to.join(', ') || '—' }}
            </dd>
          </div>
          <div v-if="result.email.cc.length" class="flex min-h-11 items-center gap-3 px-4 py-2">
            <dt class="w-16 shrink-0 text-muted-foreground">
              Cc
            </dt>
            <dd class="min-w-0 break-all font-medium">
              {{ result.email.cc.join(', ') }}
            </dd>
          </div>
          <div v-if="result.email.subject" class="flex min-h-11 items-center gap-3 px-4 py-2">
            <dt class="w-16 shrink-0 text-muted-foreground">
              Subject
            </dt>
            <dd class="min-w-0 font-semibold">
              {{ result.email.subject }}
            </dd>
          </div>
        </dl>
        <p v-if="result.email.body" class="whitespace-pre-line border-t bg-muted/40 px-4 py-3">
          <span class="sr-only">Message: </span>{{ result.email.body }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button as-child size="lg">
          <a :href="result.email.href"><Mail class="size-4" aria-hidden="true" /> Write the email</a>
        </Button>
        <Button v-if="result.email.to[0]" variant="outline" size="lg" @click="copy('email', result.email.to.join(', '))">
          <Check v-if="copied === 'email'" class="size-4" aria-hidden="true" />
          <Copy v-else class="size-4" aria-hidden="true" />
          {{ copied === 'email' ? 'Copied' : 'Copy address' }}
        </Button>
      </div>
      <p class="text-sm text-muted-foreground">
        This opens your email app with the message filled in. Nothing is sent until you press send there.
      </p>
    </template>

    <!-- Phone -->
    <template v-else-if="result.kind === 'phone'">
      <div class="rounded-xl border bg-muted/40 p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Number
        </p>
        <p class="mt-1.5 break-all font-mono text-2xl font-semibold tracking-wide">
          {{ result.phone.number }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button as-child size="lg">
          <a :href="result.phone.href"><Phone class="size-4" aria-hidden="true" /> Call</a>
        </Button>
        <Button variant="outline" size="lg" @click="copy('phone', result.phone.number)">
          <Check v-if="copied === 'phone'" class="size-4" aria-hidden="true" />
          <Copy v-else class="size-4" aria-hidden="true" />
          {{ copied === 'phone' ? 'Copied' : 'Copy number' }}
        </Button>
      </div>
    </template>

    <!-- SMS: a message bubble -->
    <template v-else-if="result.kind === 'sms'">
      <div class="rounded-xl border bg-muted/40 p-4">
        <p class="text-xs text-muted-foreground">
          To <span class="font-mono text-sm font-medium text-foreground">{{ result.sms.number }}</span>
        </p>
        <p v-if="result.sms.body" class="mt-3 ml-auto w-fit max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          <span class="sr-only">Message: </span>{{ result.sms.body }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button as-child size="lg">
          <a :href="result.sms.href"><MessageSquare class="size-4" aria-hidden="true" /> Open in Messages</a>
        </Button>
        <Button variant="outline" size="lg" @click="copy('sms', result.sms.number)">
          <Check v-if="copied === 'sms'" class="size-4" aria-hidden="true" />
          <Copy v-else class="size-4" aria-hidden="true" />
          {{ copied === 'sms' ? 'Copied' : 'Copy number' }}
        </Button>
      </div>
      <p class="text-sm text-muted-foreground">
        Codes that text a short number to “vote” or “claim a prize” can sign you up to a premium-rate
        service. Check the number before you press send.
      </p>
    </template>

    <!-- Location -->
    <template v-else-if="result.kind === 'geo'">
      <div class="flex items-center gap-4 rounded-xl border bg-muted/40 p-4">
        <span class="grid size-12 shrink-0 place-items-center rounded-full bg-background dark:bg-input/30" aria-hidden="true">
          <MapPin class="size-6" />
        </span>
        <div class="min-w-0">
          <p v-if="result.geo.query" class="break-words font-heading text-xl font-semibold leading-tight">
            {{ result.geo.query }}
          </p>
          <p class="font-mono text-sm" :class="result.geo.query ? 'mt-0.5 text-muted-foreground' : 'text-lg font-semibold'">
            {{ result.geo.latitude }}, {{ result.geo.longitude }}
          </p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button as-child size="lg">
          <a :href="result.geo.mapUrl" target="_blank" rel="noopener noreferrer">
            <MapPin class="size-4" aria-hidden="true" /> Open in OpenStreetMap
          </a>
        </Button>
        <Button variant="outline" size="lg" @click="copy('geo', `${result.geo.latitude}, ${result.geo.longitude}`)">
          <Check v-if="copied === 'geo'" class="size-4" aria-hidden="true" />
          <Copy v-else class="size-4" aria-hidden="true" />
          {{ copied === 'geo' ? 'Copied' : 'Copy coordinates' }}
        </Button>
      </div>
      <p class="text-sm text-muted-foreground">
        The map opens on openstreetmap.org, which then knows these coordinates. Nothing is sent until you press it.
      </p>
    </template>

    <!-- Event: a calendar tile -->
    <template v-else-if="result.kind === 'event'">
      <div class="flex gap-4 rounded-xl border bg-muted/40 p-4">
        <span v-if="eventTile" class="flex w-16 shrink-0 flex-col overflow-hidden rounded-xl border bg-background text-center dark:bg-input/30" aria-hidden="true">
          <span class="bg-primary py-0.5 text-xs font-semibold uppercase text-primary-foreground">{{ eventTile.month }}</span>
          <span class="py-1.5 text-2xl font-semibold tabular-nums">{{ eventTile.day }}</span>
        </span>
        <div class="min-w-0">
          <p class="break-words font-heading text-xl font-semibold leading-tight">
            {{ result.event.summary || 'Untitled event' }}
          </p>
          <p v-if="result.event.start" class="mt-1 text-sm">
            {{ when(result.event.start) }}<template v-if="result.event.end">
              – {{ when(result.event.end) }}
            </template>
          </p>
          <p v-if="result.event.location" class="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin class="size-3.5 shrink-0" aria-hidden="true" />{{ result.event.location }}
          </p>
        </div>
      </div>
      <p v-if="result.event.description" class="whitespace-pre-line text-sm text-muted-foreground">
        {{ result.event.description }}
      </p>
      <div class="flex flex-wrap gap-2">
        <Button as-child size="lg">
          <a :href="dataUrl('text/calendar', result.ics)" :download="fileName(result.event.summary, 'ics', 'event')">
            <CalendarPlus class="size-4" aria-hidden="true" /> Add to calendar (.ics)
          </a>
        </Button>
      </div>
      <p class="text-sm text-muted-foreground">
        Open the .ics file and your calendar app shows the event and asks before adding it.
      </p>
    </template>

    <!-- Product barcode -->
    <template v-else-if="result.kind === 'product'">
      <div class="rounded-xl border bg-muted/40 p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Product number
          </p>
          <span
            v-if="result.valid !== null"
            class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
            :class="result.valid ? TONE.clear : TONE.caution"
          >
            <CircleCheck v-if="result.valid" class="size-3" aria-hidden="true" />
            <TriangleAlert v-else class="size-3" aria-hidden="true" />
            {{ result.valid ? 'Check digit correct' : 'Check digit wrong' }}
          </span>
        </div>
        <p class="mt-1.5 break-all font-mono text-3xl font-semibold tracking-[0.15em]">
          {{ result.raw }}
        </p>
      </div>
      <p class="text-sm text-muted-foreground">
        <template v-if="result.valid === true">
          The check digit is correct, so this number was read without errors.
        </template>
        <template v-else-if="result.valid === false">
          The check digit does not match — part of this number was probably misread. Try again with steadier light.
        </template>
        A product barcode holds only this number. The product’s name and price live in the shop’s own database,
        so there is nothing more in the code itself to show.
      </p>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" size="lg" @click="copy('product', result.raw)">
          <Check v-if="copied === 'product'" class="size-4" aria-hidden="true" />
          <Copy v-else class="size-4" aria-hidden="true" />
          {{ copied === 'product' ? 'Copied' : 'Copy number' }}
        </Button>
      </div>
    </template>

    <!-- Text -->
    <template v-else>
      <div
        class="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border bg-muted/40 p-4 text-base leading-relaxed"
        tabindex="0"
        role="region"
        aria-label="Text in the code"
      >
        {{ result.raw || '(The code is empty.)' }}
      </div>
      <div class="flex flex-wrap gap-2">
        <Button size="lg" :disabled="!result.raw" @click="copy('text', result.raw)">
          <Check v-if="copied === 'text'" class="size-4" aria-hidden="true" />
          <Copy v-else class="size-4" aria-hidden="true" />
          {{ copied === 'text' ? 'Copied' : 'Copy text' }}
        </Button>
      </div>
    </template>

    <!-- The source, always: whatever we concluded, it can be checked. -->
    <div v-if="result.kind !== 'text'" class="rounded-xl border">
      <div class="flex items-center justify-between gap-2 py-1 pl-4 pr-1">
        <p class="text-xs font-medium text-muted-foreground">
          Exactly what the code says
        </p>
        <Button variant="ghost" size="sm" class="h-11" @click="copy('raw', result.raw)">
          <Check v-if="copied === 'raw'" class="size-4" aria-hidden="true" />
          <Copy v-else class="size-4" aria-hidden="true" />
          {{ copied === 'raw' ? 'Copied' : 'Copy' }}
        </Button>
      </div>
      <pre
        class="max-h-40 overflow-auto whitespace-pre-wrap break-all border-t bg-muted/40 px-4 py-3 font-mono text-xs rounded-b-xl"
        tabindex="0"
        role="region"
        aria-label="Raw contents of the code"
      >{{ result.raw }}</pre>
    </div>

    <p class="sr-only" aria-live="polite">
      {{ copied ? 'Copied to the clipboard.' : '' }}
    </p>
  </div>
</template>
