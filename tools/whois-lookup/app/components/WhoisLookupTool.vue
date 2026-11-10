<script setup lang="ts">
import type { StatusTone } from '../../core'
import { AlertTriangle, Check, ChevronRight, Copy, ExternalLink, Info, Loader2, Lock, Search, Server } from 'lucide-vue-next'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../../shared/app/components/ui/collapsible'
import { daysUntil, describeAge, describeStatus, dnsProvider, expiryState, mailProvider, QUERIED } from '../../core'
import { useWhoisLookup } from '../composables/useWhoisLookup'

const { state, loading, error, failure, result, lookup } = useWhoisLookup()

const record = computed(() => result.value?.record ?? null)
const expiry = computed(() => expiryState(record.value?.expires ?? null))
const daysLeft = computed(() => daysUntil(record.value?.expires ?? null))
const statuses = computed(() => (record.value?.status ?? []).map(describeStatus))
const dnsHost = computed(() => dnsProvider(record.value?.nameservers ?? []))
const mailHost = computed(() => mailProvider((result.value?.dns?.MX ?? []).map(r => r.value)))
const owner = computed(() => record.value?.registrant ?? null)

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
function formatDate(value: string | null | undefined) {
  if (!value)
    return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date)
}

/** "MY" → "Malaysia". Falls back to the code where the browser has no name for it. */
function countryName(code: string | null | undefined) {
  if (!code)
    return null
  if (!/^[A-Z]{2}$/i.test(code))
    return code
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) ?? code
  }
  catch {
    return code
  }
}

const expiryLabel = computed(() => {
  const days = daysLeft.value
  if (days === null)
    return null
  if (days < 0)
    return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
  if (days === 0)
    return 'today'
  return `in ${days} day${days === 1 ? '' : 's'}`
})

const badge = computed(() => {
  if (!result.value)
    return null
  if (!result.value.registered)
    return { text: 'Not registered', class: 'bg-primary/10 text-primary' }
  if (expiry.value === 'expired')
    return { text: 'Past expiry', class: 'bg-destructive/10 text-destructive' }
  if (expiry.value === 'soon')
    return { text: 'Expires soon', class: 'bg-destructive/10 text-destructive' }
  return { text: 'Registered', class: 'bg-muted text-foreground' }
})

const summary = computed(() => {
  if (loading.value)
    return 'Looking up…'
  if (error.value)
    return error.value
  const r = result.value
  if (!r)
    return ''
  if (!r.registered)
    return `${r.domain} is not registered.`
  const parts = [`${r.domain} is registered`]
  if (r.record?.registrar?.name)
    parts.push(`with ${r.record.registrar.name}`)
  if (r.record?.expires)
    parts.push(`and expires ${expiryLabel.value}`)
  return `${parts.join(' ')}.`
})

const ownerRows = computed(() => {
  const o = owner.value
  if (!o)
    return []
  return ([
    ['Organisation', o.organization],
    ['Name', o.name],
    ['Country', countryName(o.country)],
    ['Address', o.address],
    ['Email', o.email],
    ['Phone', o.phone],
  ] as const).filter(([, value]) => !!value) as [string, string][]
})

const dnsRows = computed(() => {
  const dns = result.value?.dns
  if (!dns)
    return []
  return QUERIED.map(type => ({ type, records: dns[type] }))
})

const toneIcon: Record<StatusTone, typeof Check> = { ok: Check, lock: Lock, warn: AlertTriangle, info: Info }
const toneClass: Record<StatusTone, string> = {
  ok: 'text-primary',
  lock: 'text-primary',
  warn: 'text-destructive',
  info: 'text-muted-foreground',
}

const rawOpen = ref(false)
const rawJson = computed(() => (result.value ? JSON.stringify(result.value.raw ?? {}, null, 2) : ''))

const copied = ref(false)
async function copyJson() {
  if (!result.value)
    return
  const { raw: _raw, viaServer: _via, ...rest } = result.value
  try {
    await navigator.clipboard.writeText(JSON.stringify(rest, null, 2))
    copied.value = true
    setTimeout(() => copied.value = false, 1600)
  }
  catch { copied.value = false }
}

const sectionClass = 'rounded-2xl border bg-background p-5 dark:bg-input/30'
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ summary }}
    </p>

    <section :class="sectionClass">
      <Label for="whois-domain">Domain</Label>
      <form class="mt-2 flex gap-2" @submit.prevent="lookup()">
        <Input
          id="whois-domain"
          v-model="state.domain"
          type="text"
          inputmode="url"
          placeholder="example.com"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
        />
        <Button type="submit" :disabled="loading || !state.domain.trim()">
          <Loader2 v-if="loading" class="size-4 animate-spin" />
          <Search v-else class="size-4" />
          Look up
        </Button>
      </form>
      <p class="mt-2 text-xs text-muted-foreground">
        Your browser asks the domain's registry directly — the lookup never passes through zeal.tools. A URL
        or subdomain works too; the registered name is what gets looked up.
      </p>

      <div v-if="error" class="mt-3 space-y-3" role="alert">
        <p class="text-sm text-destructive">
          {{ error }}
        </p>
        <!-- The one way input reaches our server, and only on an explicit press. -->
        <div v-if="failure === 'no-cors' || failure === 'blocked'" class="rounded-xl bg-muted/60 p-4 text-sm">
          <p class="text-muted-foreground">
            Our server can ask instead — it is not a web page, so a registry's rules for browsers do not apply to it.
            The domain name is sent to zeal.tools for this one lookup, and nothing is stored or logged.
          </p>
          <Button class="mt-3" variant="outline" :disabled="loading" @click="lookup(true)">
            <Server class="size-4" /> Look it up through zeal.tools
          </Button>
        </div>
      </div>
    </section>

    <template v-if="result">
      <!-- ── the answer ── -->
      <section :class="sectionClass">
        <p v-if="result.host" class="mb-3 text-xs text-muted-foreground">
          You entered <span class="font-mono">{{ result.host }}</span> — registries only know the registered
          name, so this is <span class="font-mono">{{ result.domain }}</span>.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="break-all font-mono text-2xl font-semibold tracking-tight">
            {{ result.domain }}
          </h2>
          <span v-if="badge" class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="badge.class">{{ badge.text }}</span>
        </div>

        <template v-if="!result.registered">
          <p class="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
            The registry has no record of this name, which almost always means it is free to register. A few
            names are reserved or sold at a premium price and also show nothing here, so the registrar's own
            search is the final word — and it is worth checking before telling anyone your idea.
          </p>
        </template>

        <template v-else-if="record">
          <dl class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl bg-muted/50 p-4">
              <dt class="text-xs text-muted-foreground">
                Age
              </dt>
              <dd class="mt-1 font-medium">
                {{ describeAge(record.registered) ?? 'Not published' }}
              </dd>
            </div>
            <div class="rounded-xl bg-muted/50 p-4">
              <dt class="text-xs text-muted-foreground">
                Registered
              </dt>
              <dd class="mt-1 font-medium">
                {{ formatDate(record.registered) ?? 'Not published' }}
              </dd>
            </div>
            <div class="rounded-xl bg-muted/50 p-4">
              <dt class="text-xs text-muted-foreground">
                Expires
              </dt>
              <dd class="mt-1 font-medium" :class="expiry === 'soon' || expiry === 'expired' ? 'text-destructive' : ''">
                {{ formatDate(record.expires) ?? 'Not published' }}
              </dd>
              <dd v-if="expiryLabel" class="text-xs text-muted-foreground">
                {{ expiryLabel }}
              </dd>
            </div>
            <div class="rounded-xl bg-muted/50 p-4">
              <dt class="text-xs text-muted-foreground">
                Registrar
              </dt>
              <dd class="mt-1 break-words font-medium">
                {{ record.registrar?.name ?? 'Not published' }}
              </dd>
            </div>
          </dl>
          <p v-if="record.updated" class="mt-3 text-xs text-muted-foreground">
            Record last changed {{ formatDate(record.updated) }}.
          </p>
        </template>

        <div class="mt-5 flex flex-wrap items-center gap-3 border-t pt-4">
          <Button variant="outline" size="sm" @click="copyJson()">
            <Copy class="size-4" /> {{ copied ? 'Copied' : 'Copy as JSON' }}
          </Button>
          <ShareBar tool="whois-lookup" share-copy="Free WHOIS lookup — owner, registrar, expiry and DNS, read straight from the registry." />
        </div>
      </section>

      <template v-if="result.registered && record">
        <!-- ── who owns it ── -->
        <section :class="sectionClass">
          <h2 class="text-sm font-semibold">
            Who owns it
          </h2>
          <dl v-if="ownerRows.length" class="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]">
            <template v-for="[label, value] in ownerRows" :key="label">
              <dt class="text-muted-foreground">
                {{ label }}
              </dt>
              <dd class="min-w-0 break-words">
                {{ value }}
              </dd>
            </template>
          </dl>
          <p v-if="record.privacyService" class="mt-3 text-sm text-muted-foreground">
            That is a privacy service, registered on the real owner's behalf — the owner is whoever is paying it.
          </p>
          <p v-if="record.redacted" class="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {{ ownerRows.length ? 'The rest of the owner\'s details are withheld.' : 'The owner\'s details are withheld.' }}
            Since GDPR in 2018, registries and registrars redact personal data by default, so for most domains
            this is all anyone can see — it is not a sign anything is being hidden.
          </p>
          <p v-else-if="!ownerRows.length" class="mt-3 text-sm text-muted-foreground">
            This registry does not publish owner details.
          </p>
          <a
            v-if="owner?.contactUrl"
            :href="owner.contactUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Contact the owner through the registrar's form <ExternalLink class="size-3.5" />
          </a>
        </section>

        <!-- ── status ── -->
        <section v-if="statuses.length" :class="sectionClass">
          <h2 class="text-sm font-semibold">
            Status
          </h2>
          <p class="mt-1 text-xs text-muted-foreground">
            The codes the registry reports, and what each one means for the domain.
          </p>
          <ul class="mt-4 space-y-3">
            <li v-for="status in statuses" :key="status.code" class="flex gap-3">
              <component :is="toneIcon[status.tone]" class="mt-0.5 size-4 shrink-0" :class="toneClass[status.tone]" aria-hidden="true" />
              <div class="min-w-0">
                <p class="text-sm font-medium">
                  {{ status.label }} <span class="ml-1 font-mono text-xs font-normal text-muted-foreground">{{ status.code }}</span>
                </p>
                <p class="text-sm text-muted-foreground">
                  {{ status.meaning }}
                </p>
              </div>
            </li>
          </ul>
        </section>

        <!-- ── nameservers and DNS ── -->
        <section :class="sectionClass">
          <h2 class="text-sm font-semibold">
            Nameservers and DNS
          </h2>
          <dl class="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]">
            <dt class="text-muted-foreground">
              Nameservers
            </dt>
            <dd class="min-w-0">
              <ul v-if="record.nameservers.length" class="font-mono text-xs leading-6">
                <li v-for="ns in record.nameservers" :key="ns" class="break-all">
                  {{ ns }}
                </li>
              </ul>
              <span v-else class="text-muted-foreground">None — the domain does not resolve.</span>
            </dd>
            <template v-if="dnsHost">
              <dt class="text-muted-foreground">
                DNS hosted by
              </dt>
              <dd>{{ dnsHost }}</dd>
            </template>
            <template v-if="mailHost">
              <dt class="text-muted-foreground">
                Email handled by
              </dt>
              <dd>{{ mailHost }}</dd>
            </template>
            <dt class="text-muted-foreground">
              DNSSEC
            </dt>
            <dd>
              {{ record.dnssec === true ? 'Signed — answers for this domain can be verified.' : record.dnssec === false ? 'Not signed' : 'Not reported' }}
            </dd>
          </dl>

          <template v-if="dnsRows.length">
            <h3 class="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Live records
            </h3>
            <div class="mt-2 overflow-x-auto">
              <table class="w-full text-left text-sm">
                <caption class="sr-only">
                  DNS records for {{ result.domain }}
                </caption>
                <thead class="text-xs text-muted-foreground">
                  <tr class="border-b">
                    <th scope="col" class="py-2 pr-4 font-medium">
                      Type
                    </th>
                    <th scope="col" class="py-2 pr-4 font-medium">
                      Value
                    </th>
                    <th scope="col" class="py-2 text-right font-medium">
                      TTL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="row in dnsRows" :key="row.type">
                    <tr v-for="(rec, index) in row.records ?? [null]" :key="`${row.type}-${index}`" class="border-b align-top last:border-0">
                      <th scope="row" class="py-2 pr-4 font-mono text-xs font-medium">
                        {{ row.type }}
                      </th>
                      <td class="py-2 pr-4 font-mono text-xs">
                        <template v-if="rec">
                          <span v-if="rec.priority !== undefined" class="mr-2 text-muted-foreground">{{ rec.priority }}</span>
                          <span class="break-all">{{ rec.value }}</span>
                        </template>
                        <span v-else class="text-muted-foreground">Could not be read</span>
                      </td>
                      <td class="py-2 text-right font-mono text-xs text-muted-foreground">
                        {{ rec ? `${rec.ttl}s` : '' }}
                      </td>
                    </tr>
                    <tr v-if="row.records && !row.records.length" class="border-b last:border-0">
                      <th scope="row" class="py-2 pr-4 font-mono text-xs font-medium">
                        {{ row.type }}
                      </th>
                      <td colspan="2" class="py-2 text-xs text-muted-foreground">
                        None
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
            <p class="mt-3 text-xs text-muted-foreground">
              Read by your browser through Cloudflare's public resolver (1.1.1.1), which commits to not storing
              the address a query came from.
            </p>
          </template>
        </section>

        <!-- ── registrar ── -->
        <section v-if="record.registrar || record.abuse" :class="sectionClass">
          <h2 class="text-sm font-semibold">
            Registrar
          </h2>
          <dl class="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]">
            <template v-if="record.registrar?.name">
              <dt class="text-muted-foreground">
                Name
              </dt>
              <dd class="break-words">
                {{ record.registrar.name }}
              </dd>
            </template>
            <template v-if="record.registrar?.ianaId">
              <dt class="text-muted-foreground">
                IANA ID
              </dt>
              <dd class="font-mono text-xs leading-5">
                {{ record.registrar.ianaId }}
              </dd>
            </template>
            <template v-if="record.registrar?.url">
              <dt class="text-muted-foreground">
                Website
              </dt>
              <dd class="break-all">
                <a :href="record.registrar.url" target="_blank" rel="noopener noreferrer nofollow" class="text-primary underline-offset-4 hover:underline">{{ record.registrar.url }}</a>
              </dd>
            </template>
            <template v-if="record.abuse?.email">
              <dt class="text-muted-foreground">
                Abuse email
              </dt>
              <dd class="break-all">
                <a :href="`mailto:${record.abuse.email}`" class="text-primary underline-offset-4 hover:underline">{{ record.abuse.email }}</a>
              </dd>
            </template>
            <template v-if="record.abuse?.phone">
              <dt class="text-muted-foreground">
                Abuse phone
              </dt>
              <dd>{{ record.abuse.phone }}</dd>
            </template>
          </dl>
          <p v-if="record.abuse" class="mt-3 text-xs text-muted-foreground">
            Phishing, spam or malware on this domain? The abuse contact is who is obliged to act on a report.
          </p>
        </section>
      </template>

      <!-- ── raw ── -->
      <section :class="sectionClass">
        <Collapsible v-model:open="rawOpen" class="group/raw">
          <CollapsibleTrigger class="flex min-h-11 w-full items-center gap-2 rounded-lg text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronRight class="size-4 transition-transform group-data-[state=open]/raw:rotate-90" aria-hidden="true" />
            Raw RDAP response
          </CollapsibleTrigger>
          <CollapsibleContent class="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <pre class="mt-3 max-h-[28rem] overflow-auto rounded-lg bg-muted p-4 text-xs"><code>{{ rawJson }}</code></pre>
          </CollapsibleContent>
        </Collapsible>
        <p class="mt-3 text-xs text-muted-foreground">
          Read from
          <template v-for="(source, index) in result.sources" :key="source">
            <span v-if="index">, then </span>
            <a :href="source" target="_blank" rel="noopener noreferrer nofollow" class="break-all font-mono text-primary underline-offset-4 hover:underline">{{ source }}</a>
          </template>
          <template v-if="result.viaServer">
            — through zeal.tools, because you asked.
          </template>
        </p>
        <p v-if="result.registrarError" class="mt-2 text-xs text-muted-foreground">
          {{ result.registrarError }}
        </p>
      </section>
    </template>

    <p v-else-if="!loading && !error" class="grid grow place-items-center rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      Enter a domain to see who registered it, when it expires and where it points.
    </p>
  </div>
</template>
