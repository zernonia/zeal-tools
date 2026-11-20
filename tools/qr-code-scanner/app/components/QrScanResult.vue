<script setup lang="ts">
import type { IcsDate, ScanResult, Warning } from '../../core'
import {
  CalendarPlus,
  Check,
  Copy,
  ExternalLink,
  Info,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldAlert,
  TriangleAlert,
  UserPlus,
} from 'lucide-vue-next'
import { fileName, formatLabel, KIND_LABELS, securityLabel, worstSeverity } from '../../core'

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

const severity = computed(() => worstSeverity(props.result.warnings))

function warningClass(w: Warning): string {
  if (w.severity === 'danger')
    return 'border-destructive/40 bg-destructive/10 text-foreground'
  if (w.severity === 'caution')
    return 'border-border bg-muted text-foreground'
  return 'border-border bg-muted/50 text-muted-foreground'
}

/** Files built in core are handed to the browser as data URLs: nothing is uploaded, nothing to revoke. */
function dataUrl(type: string, text: string): string {
  return `data:${type};charset=utf-8,${encodeURIComponent(text)}`
}

function when(date: IcsDate | null): string {
  if (!date)
    return ''
  if (date.allDay) {
    const [y, m, d] = date.iso.split('-').map(Number)
    return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, { dateStyle: 'full' })
  }
  // A time with Z is UTC and is shown in the visitor's zone; one without is
  // local to wherever the event is, and is shown as written.
  const text = new Date(date.iso).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })
  return date.tzid ? `${text} (${date.tzid} time)` : text
}

const title = computed(() => KIND_LABELS[props.result.kind])
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="scan-result-heading" class="text-sm font-semibold">
        {{ title }}
      </h2>
      <span class="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">{{ formatLabel(result.format) }}</span>
    </div>

    <!-- Warnings first: they are the reason to read the rest. -->
    <ul v-if="result.warnings.length" class="flex flex-col gap-2">
      <li
        v-for="w in result.warnings"
        :key="w.code"
        class="flex gap-2.5 rounded-xl border p-3 text-sm"
        :class="warningClass(w)"
      >
        <ShieldAlert v-if="w.severity === 'danger'" class="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
        <TriangleAlert v-else-if="w.severity === 'caution'" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <Info v-else class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          <span class="sr-only">{{ w.severity === 'danger' ? 'Warning: ' : w.severity === 'caution' ? 'Caution: ' : 'Note: ' }}</span>
          {{ w.message }}
        </span>
      </li>
    </ul>

    <!-- Link -->
    <template v-if="result.kind === 'url'">
      <div>
        <p class="text-sm text-muted-foreground">
          This link goes to
        </p>
        <p class="mt-1 break-all font-heading text-2xl font-semibold" data-testid="scan-site">
          {{ result.url.site }}
        </p>
        <p class="mt-1 break-all font-mono text-xs text-muted-foreground">
          <span class="text-foreground">{{ result.url.scheme }}://{{ result.url.displayHost }}</span>{{ result.url.rest }}
        </p>
        <p v-if="result.url.displayHost !== result.url.host" class="mt-1 break-all font-mono text-xs text-muted-foreground">
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

    <!-- WiFi -->
    <template v-else-if="result.kind === 'wifi'">
      <dl class="grid gap-2 text-sm">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
          <dt class="text-muted-foreground">
            Network
          </dt>
          <dd class="break-all font-medium">
            {{ result.wifi.ssid }}<span v-if="result.wifi.hidden" class="text-muted-foreground"> (hidden)</span>
          </dd>
        </div>
        <div v-if="!result.wifi.open" class="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
          <dt class="text-muted-foreground">
            Password
          </dt>
          <dd class="break-all font-mono font-medium">
            {{ result.wifi.password || '(none given)' }}
          </dd>
        </div>
        <div v-if="result.wifi.identity" class="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
          <dt class="text-muted-foreground">
            Username
          </dt>
          <dd class="break-all font-medium">
            {{ result.wifi.identity }}
          </dd>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <dt class="text-muted-foreground">
            Security
          </dt>
          <dd class="font-medium">
            {{ securityLabel(result.wifi) }}
          </dd>
        </div>
      </dl>
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

    <!-- Contact -->
    <template v-else-if="result.kind === 'contact'">
      <div>
        <p class="font-heading text-xl font-semibold">
          {{ result.contact.name || result.contact.organisation || 'Unnamed contact' }}
        </p>
        <p v-if="result.contact.title || (result.contact.name && result.contact.organisation)" class="text-sm text-muted-foreground">
          {{ [result.contact.title, result.contact.name ? result.contact.organisation : ''].filter(Boolean).join(', ') }}
        </p>
      </div>
      <dl class="grid gap-2 text-sm">
        <div v-for="tel in result.contact.phones" :key="`t${tel}`" class="flex justify-between gap-3 border-b border-border/60 pb-2">
          <dt class="text-muted-foreground">
            Phone
          </dt>
          <dd class="break-all font-medium">
            {{ tel }}
          </dd>
        </div>
        <div v-for="email in result.contact.emails" :key="`e${email}`" class="flex justify-between gap-3 border-b border-border/60 pb-2">
          <dt class="text-muted-foreground">
            Email
          </dt>
          <dd class="break-all font-medium">
            {{ email }}
          </dd>
        </div>
        <div v-for="url in result.contact.urls" :key="`u${url}`" class="flex justify-between gap-3 border-b border-border/60 pb-2">
          <dt class="text-muted-foreground">
            Website
          </dt>
          <dd class="break-all font-medium">
            {{ url }}
          </dd>
        </div>
        <div v-if="result.contact.address" class="flex justify-between gap-3 border-b border-border/60 pb-2">
          <dt class="text-muted-foreground">
            Address
          </dt>
          <dd class="text-right font-medium">
            {{ result.contact.address }}
          </dd>
        </div>
        <div v-if="result.contact.note" class="flex justify-between gap-3">
          <dt class="text-muted-foreground">
            Note
          </dt>
          <dd class="whitespace-pre-line text-right">
            {{ result.contact.note }}
          </dd>
        </div>
      </dl>
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

    <!-- Email -->
    <template v-else-if="result.kind === 'email'">
      <dl class="grid gap-2 text-sm">
        <div class="flex justify-between gap-3 border-b border-border/60 pb-2">
          <dt class="text-muted-foreground">
            To
          </dt>
          <dd class="break-all text-right font-medium">
            {{ result.email.to.join(', ') || '—' }}
          </dd>
        </div>
        <div v-if="result.email.cc.length" class="flex justify-between gap-3 border-b border-border/60 pb-2">
          <dt class="text-muted-foreground">
            Cc
          </dt>
          <dd class="break-all text-right font-medium">
            {{ result.email.cc.join(', ') }}
          </dd>
        </div>
        <div v-if="result.email.subject" class="flex justify-between gap-3 border-b border-border/60 pb-2">
          <dt class="text-muted-foreground">
            Subject
          </dt>
          <dd class="text-right font-medium">
            {{ result.email.subject }}
          </dd>
        </div>
        <div v-if="result.email.body" class="flex flex-col gap-1">
          <dt class="text-muted-foreground">
            Message
          </dt>
          <dd class="whitespace-pre-line">
            {{ result.email.body }}
          </dd>
        </div>
      </dl>
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
      <p class="break-all font-heading text-2xl font-semibold">
        {{ result.phone.number }}
      </p>
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

    <!-- SMS -->
    <template v-else-if="result.kind === 'sms'">
      <dl class="grid gap-2 text-sm">
        <div class="flex justify-between gap-3 border-b border-border/60 pb-2">
          <dt class="text-muted-foreground">
            To
          </dt>
          <dd class="break-all font-medium">
            {{ result.sms.number }}
          </dd>
        </div>
        <div v-if="result.sms.body" class="flex flex-col gap-1">
          <dt class="text-muted-foreground">
            Message
          </dt>
          <dd class="whitespace-pre-line">
            {{ result.sms.body }}
          </dd>
        </div>
      </dl>
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
      <div>
        <p v-if="result.geo.query" class="font-heading text-xl font-semibold">
          {{ result.geo.query }}
        </p>
        <p class="font-mono text-sm">
          {{ result.geo.latitude }}, {{ result.geo.longitude }}
        </p>
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

    <!-- Event -->
    <template v-else-if="result.kind === 'event'">
      <div>
        <p class="font-heading text-xl font-semibold">
          {{ result.event.summary || 'Untitled event' }}
        </p>
        <p v-if="result.event.start" class="mt-1 text-sm">
          {{ when(result.event.start) }}<template v-if="result.event.end">
            – {{ when(result.event.end) }}
          </template>
        </p>
        <p v-if="result.event.location" class="mt-1 text-sm text-muted-foreground">
          {{ result.event.location }}
        </p>
        <p v-if="result.event.description" class="mt-2 whitespace-pre-line text-sm text-muted-foreground">
          {{ result.event.description }}
        </p>
      </div>
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
      <p class="break-all font-mono text-2xl font-semibold tracking-wider">
        {{ result.raw }}
      </p>
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
        class="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border bg-muted/40 p-3 text-sm"
        tabindex="0"
        role="region"
        aria-label="Text in the code"
      >
        {{ result.raw || '(The code is empty.)' }}
      </div>
      <div class="flex flex-wrap gap-2">
        <Button size="lg" variant="outline" :disabled="!result.raw" @click="copy('text', result.raw)">
          <Check v-if="copied === 'text'" class="size-4" aria-hidden="true" />
          <Copy v-else class="size-4" aria-hidden="true" />
          {{ copied === 'text' ? 'Copied' : 'Copy text' }}
        </Button>
      </div>
    </template>

    <!-- The source, always: whatever we concluded, it can be checked. -->
    <div v-if="result.kind !== 'text'" class="flex flex-col gap-2 border-t pt-4">
      <div class="flex items-center justify-between gap-2">
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
        class="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-xl border bg-muted/40 p-3 font-mono text-xs"
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
