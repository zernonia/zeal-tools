<script setup lang="ts">
import { AlertTriangle, Check, Copy, Loader2, Search, X } from 'lucide-vue-next'
import { useMetaChecker } from '../composables/useMetaChecker'

const {
  state,
  loading,
  error,
  finalUrl,
  truncated,
  hasInput,
  meta,
  errors,
  warnings,
  passes,
  cards,
  generated,
  platforms,
  check,
} = useMetaChecker()

const copied = ref(false)
async function copyTags() {
  try {
    await navigator.clipboard.writeText(generated.value)
    copied.value = true
    setTimeout(() => copied.value = false, 1600)
  }
  catch { copied.value = false }
}

const summary = computed(() => {
  if (!hasInput.value)
    return ''
  const e = errors.value.length
  const w = warnings.value.length
  if (!e && !w)
    return 'Everything checks out.'
  return `${e} error${e === 1 ? '' : 's'} and ${w} warning${w === 1 ? '' : 's'}.`
})

const sectionClass = 'rounded-2xl border bg-background p-5 dark:bg-input/30'
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ summary }}
    </p>

    <section :class="sectionClass">
      <Label for="meta-url">Page URL</Label>
      <div class="mt-2 flex gap-2">
        <Input id="meta-url" v-model="state.url" type="url" placeholder="https://example.com" autocomplete="off" @keydown.enter="check()" />
        <Button :disabled="loading || !state.url.trim()" @click="check()">
          <Loader2 v-if="loading" class="size-4 animate-spin" />
          <Search v-else class="size-4" />
          Check
        </Button>
      </div>
      <!-- Said plainly: this is the one tool on the site that makes a request
           on your behalf, and it is the only way the job can be done. -->
      <p class="mt-2 text-xs text-muted-foreground">
        A browser is not allowed to read another site's page, so this request goes through our server. The
        page is fetched, its head is read, and it is thrown away — nothing is stored or logged.
      </p>
      <p v-if="error" class="mt-2 text-sm text-destructive" role="alert">
        {{ error }}
      </p>
      <p v-else-if="finalUrl && finalUrl !== state.url" class="mt-2 text-xs text-muted-foreground">
        Redirected to <span class="font-mono">{{ finalUrl }}</span>
      </p>
      <p v-if="truncated" class="mt-2 text-xs text-muted-foreground">
        That page's head was longer than we read, so some tags may be missing here.
      </p>
    </section>

    <template v-if="hasInput">
      <!-- ── previews ── -->
      <section :class="sectionClass">
        <h2 class="text-sm font-semibold">
          How your link will look
        </h2>
        <p class="mt-1 text-xs text-muted-foreground">
          Each platform builds its card from a different chain of tags, so these genuinely differ.
        </p>
        <div class="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <MetaPreviewCard
            v-for="platform in platforms"
            :key="platform"
            :platform="platform"
            :card="cards[platform]"
            :source-url="finalUrl || state.url"
          />
        </div>
      </section>

      <!-- ── findings ── -->
      <section :class="sectionClass">
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="text-sm font-semibold">
            What's wrong
          </h2>
          <div class="flex gap-2 text-xs">
            <span v-if="errors.length" class="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">{{ errors.length }} error{{ errors.length === 1 ? '' : 's' }}</span>
            <span v-if="warnings.length" class="rounded-full bg-muted px-2 py-0.5 font-medium">{{ warnings.length }} warning{{ warnings.length === 1 ? '' : 's' }}</span>
            <span v-if="passes.length" class="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">{{ passes.length }} ok</span>
          </div>
        </div>

        <ul class="mt-4 space-y-3">
          <li v-for="finding in [...errors, ...warnings, ...passes]" :key="finding.id" class="flex gap-3">
            <span class="mt-0.5 shrink-0" aria-hidden="true">
              <X v-if="finding.severity === 'error'" class="size-4 text-destructive" />
              <AlertTriangle v-else-if="finding.severity === 'warning'" class="size-4 text-muted-foreground" />
              <Check v-else class="size-4 text-primary" />
            </span>
            <div class="min-w-0">
              <p class="text-sm font-medium">
                {{ finding.label }}
                <span class="sr-only">— {{ finding.severity }}</span>
              </p>
              <p class="text-sm text-muted-foreground">
                {{ finding.message }}
              </p>
              <p v-if="finding.value && finding.severity !== 'ok'" class="mt-1 truncate font-mono text-xs text-muted-foreground/80">
                {{ finding.value }}
              </p>
            </div>
          </li>
        </ul>
      </section>

      <!-- ── what was found ── -->
      <section :class="sectionClass">
        <h2 class="text-sm font-semibold">
          Tags found
        </h2>
        <dl class="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
          <template
            v-for="row in [
              ['Title', meta.title],
              ['Description', meta.description],
              ['Canonical', meta.canonical],
              ['Robots', meta.robots],
              ['Language', meta.lang],
              ['Charset', meta.charset],
              ['og:title', meta.og.title],
              ['og:description', meta.og.description],
              ['og:image', meta.og.image],
              ['og:url', meta.og.url],
              ['og:type', meta.og.type],
              ['og:site_name', meta.og.site_name],
              ['twitter:card', meta.twitter.card],
              ['twitter:image', meta.twitter.image],
              ['JSON-LD blocks', meta.jsonLd.length ? String(meta.jsonLd.length) : null],
            ]" :key="row[0] as string"
          >
            <dt class="text-muted-foreground">
              {{ row[0] }}
            </dt>
            <dd class="min-w-0 break-words sm:mb-0" :class="row[1] ? '' : 'text-muted-foreground/50'">
              {{ row[1] || 'not set' }}
            </dd>
          </template>
        </dl>
      </section>

      <!-- ── generated ── -->
      <section :class="sectionClass">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold">
              Corrected tags
            </h2>
            <p class="mt-1 text-xs text-muted-foreground">
              Built from what you have, with the missing pieces filled in. Paste into your <code class="rounded bg-muted px-1">&lt;head&gt;</code>.
            </p>
          </div>
          <Button variant="outline" size="sm" class="shrink-0" @click="copyTags()">
            <Copy class="size-4" /> {{ copied ? 'Copied' : 'Copy' }}
          </Button>
        </div>
        <pre class="mt-3 overflow-x-auto rounded-lg bg-muted p-4 text-xs"><code>{{ generated }}</code></pre>
      </section>
    </template>

    <p v-else class="grid grow place-items-center rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      Enter a page URL to see its tags and how the link will look.
    </p>
  </div>
</template>
