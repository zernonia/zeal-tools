<script setup lang="ts">
/**
 * Rendered on the server: nothing here needs a browser at setup time, so the
 * sample text and its counts are in the prerendered HTML and there is no
 * `<ClientOnly>` fallback to shift the layout on hydration. Stored text
 * arrives on mount, through `useToolStorage`.
 */
import type { CaseId } from '../../core'
import { Check, ClipboardCopy, Copy, Trash2, Undo2 } from 'lucide-vue-next'
import { CASES, convertCase, formatDuration } from '../../core'

type Focus = 'words' | 'characters' | 'case'
type Section = 'case' | 'details' | 'limits' | 'keywords'

const props = withDefaults(defineProps<{
  /** Which panel a landing page leads with; the tool is the same on all three. */
  focus?: Focus
}>(), { focus: 'words' })

const { text, analysis, ready, available, remember, history, lastAction, undo, clear, convert } = useWordCounter()
const { track } = useAnalytics()

const number = (value: number) => value.toLocaleString('en-GB')

const headline = computed(() => {
  const stats = analysis.value
  const all = {
    words: { label: 'Words', value: number(stats.words) },
    characters: { label: 'Characters', value: number(stats.characters) },
    noSpaces: { label: 'Without spaces', value: number(stats.charactersNoSpaces) },
    sentences: { label: 'Sentences', value: number(stats.sentences) },
    reading: { label: 'Reading time', value: formatDuration(stats.readingSeconds) },
  }
  return props.focus === 'characters'
    ? [all.characters, all.noSpaces, all.words, all.sentences]
    : [all.words, all.characters, all.sentences, all.reading]
})

const details = computed(() => {
  const stats = analysis.value
  return [
    { label: 'Paragraphs', value: number(stats.paragraphs) },
    { label: 'Lines', value: number(stats.lines) },
    { label: 'Unique words', value: number(stats.uniqueWords) },
    { label: 'Average word length', value: `${stats.averageWordLength.toLocaleString('en-GB')} characters` },
    { label: 'Reading time', value: formatDuration(stats.readingSeconds), hint: 'at 238 words a minute' },
    { label: 'Speaking time', value: formatDuration(stats.speakingSeconds), hint: 'at 130 words a minute' },
    { label: 'Without spaces', value: number(stats.charactersNoSpaces) },
    { label: 'UTF-16 length', value: number(stats.utf16Length), hint: 'JavaScript .length' },
    { label: 'UTF-8 bytes', value: number(stats.utf8Bytes), hint: 'as a file or database stores it' },
    { label: 'Longest word', value: stats.longestWord || '—', wide: true },
  ]
})

const order = computed<Section[]>(() => {
  if (props.focus === 'case')
    return ['case', 'details', 'limits', 'keywords']
  if (props.focus === 'characters')
    return ['limits', 'details', 'case', 'keywords']
  return ['details', 'case', 'limits', 'keywords']
})

/* ---------- copy & case ---------- */

const caseMode = ref<'replace' | 'copy'>('replace')
const copied = ref<string | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copyText(value: string, key: string, format: string) {
  try {
    await navigator.clipboard.writeText(value)
  }
  catch {
    return
  }
  copied.value = key
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => copied.value = null, 1600)
  track('tool_completed', { tool: 'word-counter', format })
}

function pickCase(id: CaseId) {
  if (caseMode.value === 'replace')
    convert(id)
  else
    copyText(convertCase(text.value, id), id, `case-${id}`)
}

/* ---------- limits ---------- */

const sms = computed(() => analysis.value.sms)
const smsSummary = computed(() => {
  const info = sms.value
  if (!info.units)
    return 'Empty — nothing to send.'
  const parts = info.segments === 1 ? '1 message' : `${info.segments} messages joined together`
  return `${parts}, ${info.remaining} ${info.encoding === 'GSM-7' ? 'characters' : 'units'} left in the last one.`
})

function percent(used: number, max: number) {
  return Math.min(100, Math.round(used / max * 100))
}

/* ---------- announcements ---------- */

/**
 * Spoken a second after typing stops, never per keystroke: a screen reader
 * reading "212 words" after every letter makes the field unusable.
 */
const announcement = ref('')
let announceTimer: ReturnType<typeof setTimeout> | undefined
watch(analysis, (stats) => {
  clearTimeout(announceTimer)
  announceTimer = setTimeout(() => {
    announcement.value = `${number(stats.words)} words, ${number(stats.characters)} characters.`
  }, 1000)
})
watch(lastAction, (action) => {
  if (action)
    announcement.value = `${action}. Undo is available.`
})
onBeforeUnmount(() => {
  clearTimeout(announceTimer)
  clearTimeout(copiedTimer)
})

const panel = 'rounded-2xl border border-border p-5'
</script>

<template>
  <div class="tool-frame space-y-5">
    <section :class="panel" aria-label="Text">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <Label for="word-counter-text" class="mb-0 text-sm font-semibold text-foreground">Your text</Label>
        <div class="flex items-center gap-2">
          <Checkbox id="word-counter-remember" v-model="remember" :disabled="!available" />
          <Label for="word-counter-remember" class="mb-0">Remember on this device</Label>
        </div>
      </div>

      <Textarea
        id="word-counter-text"
        v-model="text"
        rows="12"
        spellcheck="true"
        aria-describedby="word-counter-privacy"
        placeholder="Type or paste your text…"
        class="mt-3 min-h-64 resize-y text-base leading-relaxed"
      />
      <p id="word-counter-privacy" class="mt-2 text-xs text-muted-foreground">
        Counted in your browser. Nothing you type here is sent anywhere<template v-if="ready && !available">
          , and this browser is not letting the page store it either
        </template>.
      </p>

      <dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div v-for="stat in headline" :key="stat.label" class="rounded-xl bg-muted/50 px-4 py-3">
          <dt class="text-xs text-muted-foreground">
            {{ stat.label }}
          </dt>
          <dd class="mt-0.5 text-2xl font-semibold tabular-nums">
            {{ stat.value }}
          </dd>
        </div>
      </dl>

      <!-- The copy area. Nothing else ever goes here. -->
      <div class="mt-4 flex flex-wrap gap-2">
        <Button class="min-h-11 grow sm:grow-0" :disabled="!text" @click="copyText(text, 'all', 'clipboard')">
          <component :is="copied === 'all' ? Check : Copy" class="size-4" />
          {{ copied === 'all' ? 'Copied' : 'Copy text' }}
        </Button>
        <Button variant="outline" class="min-h-11" :disabled="!text" @click="clear()">
          <Trash2 class="size-4" />
          Clear
        </Button>
        <Button v-if="history.length" variant="outline" class="min-h-11" @click="undo()">
          <Undo2 class="size-4" />
          Undo
          <span class="sr-only">: {{ lastAction }}</span>
        </Button>
      </div>
    </section>

    <template v-for="section in order" :key="section">
      <section v-if="section === 'case'" :class="panel" aria-labelledby="word-counter-case-heading">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 id="word-counter-case-heading" class="text-sm font-semibold">
            Change case
          </h2>
          <div class="flex rounded-lg border border-border p-0.5" role="group" aria-label="When you pick a case">
            <button
              v-for="mode in (['replace', 'copy'] as const)"
              :key="mode"
              type="button"
              :aria-pressed="caseMode === mode"
              class="min-h-11 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              :class="caseMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
              @click="caseMode = mode"
            >
              {{ mode === 'replace' ? 'Replace my text' : 'Copy the result' }}
            </button>
          </div>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">
          {{ caseMode === 'replace'
            ? 'Rewrites the text above. Undo puts it back exactly as it was.'
            : 'Copies the converted text and leaves yours untouched.' }}
        </p>
        <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <Button
            v-for="option in CASES"
            :key="option.id"
            variant="outline"
            class="h-auto min-h-11 flex-col items-start gap-0 whitespace-normal px-3 py-2 text-left"
            :disabled="!text"
            @click="pickCase(option.id)"
          >
            <span class="flex items-center gap-1.5 font-mono text-sm">
              {{ option.label }}
              <ClipboardCopy v-if="caseMode === 'copy' && copied !== option.id" class="size-3.5 text-muted-foreground" aria-hidden="true" />
              <Check v-if="copied === option.id" class="size-3.5" aria-hidden="true" />
            </span>
            <span class="sr-only">{{ copied === option.id ? ', copied' : '' }}</span>
          </Button>
        </div>
      </section>

      <section v-else-if="section === 'details'" :class="panel" aria-labelledby="word-counter-details-heading">
        <h2 id="word-counter-details-heading" class="text-sm font-semibold">
          Details
        </h2>
        <dl class="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="item in details" :key="item.label" class="min-w-0" :class="item.wide ? 'sm:col-span-2 lg:col-span-3' : ''">
            <dt class="text-xs text-muted-foreground">
              {{ item.label }}<template v-if="item.hint">
                <span class="text-muted-foreground"> · {{ item.hint }}</span>
              </template>
            </dt>
            <dd class="font-medium tabular-nums break-words">
              {{ item.value }}
            </dd>
          </div>
        </dl>
      </section>

      <section v-else-if="section === 'limits'" :class="panel" aria-labelledby="word-counter-limits-heading">
        <h2 id="word-counter-limits-heading" class="text-sm font-semibold">
          Common limits
        </h2>
        <ul class="mt-4 space-y-4">
          <li v-for="limit in analysis.limits" :key="limit.id">
            <div class="flex items-baseline justify-between gap-3 text-sm">
              <span class="font-medium">{{ limit.label }}</span>
              <span class="tabular-nums" :class="limit.used > limit.max ? 'font-medium text-destructive' : 'text-muted-foreground'">
                {{ number(limit.used) }} / {{ number(limit.max) }}
                <template v-if="limit.used > limit.max">· {{ number(limit.used - limit.max) }} over</template>
              </span>
            </div>
            <div
              class="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              :aria-label="`${limit.label} length`"
              :aria-valuenow="Math.min(limit.used, limit.max)"
              aria-valuemin="0"
              :aria-valuemax="limit.max"
              :aria-valuetext="`${limit.used} of ${limit.max}`"
            >
              <div
                class="h-full rounded-full transition-[width] duration-200"
                :class="limit.used > limit.max ? 'bg-destructive' : 'bg-primary'"
                :style="{ width: `${percent(limit.used, limit.max)}%` }"
              />
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ limit.note }}
            </p>
          </li>

          <li class="border-t border-border pt-4">
            <div class="flex items-baseline justify-between gap-3 text-sm">
              <span class="font-medium">SMS</span>
              <span class="tabular-nums text-muted-foreground">
                {{ sms.encoding }} · {{ sms.segments }} {{ sms.segments === 1 ? 'segment' : 'segments' }}
              </span>
            </div>
            <div
              class="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Space used in the current SMS segment"
              :aria-valuenow="sms.perSegment - sms.remaining"
              aria-valuemin="0"
              :aria-valuemax="sms.perSegment"
            >
              <div class="h-full rounded-full bg-primary transition-[width] duration-200" :style="{ width: `${percent(sms.perSegment - sms.remaining, sms.perSegment)}%` }" />
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ smsSummary }}
              <template v-if="sms.encoding === 'GSM-7'">
                Up to 160 characters fit in one message, 153 in each part of a longer one; € [ ] { } ^ ~ | and \ count as two.
              </template>
              <template v-else>
                These characters are outside the GSM-7 alphabet, so the whole message switches to UCS-2 — 70 per message, 67 per part:
                <span class="font-mono text-foreground">{{ sms.nonGsm.slice(0, 12).join(' ') }}</span><template v-if="sms.nonGsm.length > 12">
                  and {{ sms.nonGsm.length - 12 }} more
                </template>
              </template>
            </p>
          </li>
        </ul>
      </section>

      <section v-else-if="section === 'keywords'" :class="panel" aria-labelledby="word-counter-keywords-heading">
        <h2 id="word-counter-keywords-heading" class="text-sm font-semibold">
          Top keywords
        </h2>
        <p class="mt-1 text-xs text-muted-foreground">
          The most repeated words, leaving out common English words like “the” and “and”, numbers and single letters.
        </p>
        <ol v-if="analysis.keywords.length" class="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          <li v-for="keyword in analysis.keywords" :key="keyword.word" class="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1.5">
            <span class="min-w-0 truncate">{{ keyword.word }}</span>
            <span class="shrink-0 tabular-nums text-muted-foreground">{{ keyword.count }} × · {{ keyword.density.toLocaleString('en-GB') }}%</span>
          </li>
        </ol>
        <p v-else class="mt-3 text-sm text-muted-foreground">
          No repeated keywords yet.
        </p>
      </section>
    </template>

    <div aria-live="polite" class="sr-only">
      {{ announcement }}
    </div>
  </div>
</template>
