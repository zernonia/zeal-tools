<script setup lang="ts">
/**
 * Rendered on the server: nothing here needs a browser at setup time, so the
 * sample text and its counts are in the prerendered HTML and there is no
 * `<ClientOnly>` fallback to shift the layout on hydration. Stored text
 * arrives on mount, through `useToolStorage`.
 */
import type { CaseId } from '../../core'
import { AtSign, Baseline, Binary, BookOpen, Braces, CaseSensitive, Check, ClipboardCopy, Copy, Heading, MessageSquare, MoveHorizontal, Pilcrow, Rows3, Ruler, Search, Space, Sparkles, Speech, TextQuote, Trash2, Undo2, WholeWord } from 'lucide-vue-next'
import { CASES, convertCase, formatDuration, READING_WPM, SPEAKING_WPM } from '../../core'

type Focus = 'words' | 'characters' | 'case'
type Section = 'case' | 'details' | 'limits' | 'keywords'

const props = withDefaults(defineProps<{
  /** Which panel a landing page leads with; the tool is the same on all three. */
  focus?: Focus
}>(), { focus: 'words' })

const { text, analysis, parts, ready, available, remember, history, lastAction, undo, clear, convert } = useWordCounter()
const { track } = useAnalytics()

const number = (value: number) => value.toLocaleString('en-GB')

const headline = computed(() => {
  const stats = analysis.value
  const all = {
    words: { label: 'Words', value: number(stats.words), icon: WholeWord },
    characters: { label: 'Characters', value: number(stats.characters), icon: CaseSensitive },
    noSpaces: { label: 'Without spaces', value: number(stats.charactersNoSpaces), icon: Space },
    sentences: { label: 'Sentences', value: number(stats.sentences), icon: TextQuote },
    reading: { label: 'Reading time', value: formatDuration(stats.readingSeconds), icon: BookOpen },
  }
  return props.focus === 'characters'
    ? [all.characters, all.noSpaces, all.words, all.sentences]
    : [all.words, all.characters, all.sentences, all.reading]
})

/** Letters, digits, spaces, punctuation, other — each a shade of primary, and named in the legend. */
const composition = computed(() => {
  const p = parts.value
  const total = p.letters + p.digits + p.spaces + p.punctuation + p.other
  return [
    { label: 'Letters', value: p.letters, swatch: 'bg-primary' },
    { label: 'Digits', value: p.digits, swatch: 'bg-primary/70' },
    { label: 'Punctuation', value: p.punctuation, swatch: 'bg-primary/45' },
    { label: 'Spaces', value: p.spaces, swatch: 'bg-primary/25' },
    { label: 'Other', value: p.other, swatch: 'bg-muted-foreground/40' },
  ].map(part => ({ ...part, share: total ? part.value / total * 100 : 0 }))
})
const compositionText = computed(() => composition.value
  .filter(part => part.value)
  .map(part => `${part.label} ${Math.round(part.share)}%`)
  .join(', '))

/** Reading and speaking on one scale, so the bars compare the two times. */
const pace = computed(() => {
  const stats = analysis.value
  const longest = Math.max(1, stats.readingSeconds, stats.speakingSeconds)
  return [
    { label: 'Reading', value: formatDuration(stats.readingSeconds), hint: `${READING_WPM} words a minute`, share: stats.readingSeconds / longest * 100, icon: BookOpen },
    { label: 'Speaking', value: formatDuration(stats.speakingSeconds), hint: `${SPEAKING_WPM} words a minute`, share: stats.speakingSeconds / longest * 100, icon: Speech },
  ]
})

/** Unique words as a share of all words: how much the text repeats itself. */
const variety = computed(() => {
  const stats = analysis.value
  return stats.words ? Math.round(stats.uniqueWords / stats.words * 100) : 0
})

const details = computed(() => {
  const stats = analysis.value
  const perSentence = stats.sentences ? Math.round(stats.words / stats.sentences * 10) / 10 : 0
  return [
    { label: 'Paragraphs', value: number(stats.paragraphs), icon: Pilcrow },
    { label: 'Lines', value: number(stats.lines), icon: Rows3 },
    { label: 'Words per sentence', value: perSentence.toLocaleString('en-GB'), icon: Ruler },
    { label: 'Average word', value: `${stats.averageWordLength.toLocaleString('en-GB')} chars`, icon: Baseline },
    { label: 'Without spaces', value: number(stats.charactersNoSpaces), icon: Space },
    { label: 'Unique words', value: number(stats.uniqueWords), icon: Sparkles },
    { label: 'UTF-16 length', value: number(stats.utf16Length), hint: 'JavaScript .length', icon: Braces },
    { label: 'UTF-8 bytes', value: number(stats.utf8Bytes), hint: 'as a file stores it', icon: Binary },
  ]
})

const LIMIT_ICONS = { 'x': AtSign, 'meta-description': Search, 'title': Heading } as const

const topCount = computed(() => analysis.value.keywords[0]?.count ?? 1)

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

function remaining(used: number, max: number) {
  return used > max ? `+${number(used - max)}` : number(max - used)
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
      <div class="flex min-h-11 flex-wrap items-center justify-between gap-2">
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

      <dl class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div v-for="stat in headline" :key="stat.label" class="flex items-center gap-3 rounded-xl border border-border bg-background p-3 dark:bg-input/30 sm:p-4">
          <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
            <component :is="stat.icon" class="size-5" />
          </span>
          <div class="min-w-0">
            <dt class="truncate text-xs text-muted-foreground">
              {{ stat.label }}
            </dt>
            <dd class="truncate text-xl font-semibold tabular-nums sm:text-2xl">
              {{ stat.value }}
            </dd>
          </div>
        </div>
      </dl>

      <figure class="mt-4">
        <div class="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted" role="img" :aria-label="compositionText ? `Made of: ${compositionText}` : 'No characters yet'">
          <span
            v-for="part in composition"
            v-show="part.value"
            :key="part.label"
            class="h-full motion-safe:transition-[width] motion-safe:duration-300"
            :class="part.swatch"
            :style="{ width: `${part.share}%` }"
          />
        </div>
        <figcaption class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-hidden="true">
          <span v-for="part in composition" :key="part.label" class="inline-flex items-center gap-1.5">
            <span class="size-2.5 rounded-sm" :class="part.swatch" />
            {{ part.label }}
            <span class="font-medium tabular-nums text-foreground">{{ number(part.value) }}</span>
          </span>
        </figcaption>
      </figure>

      <!-- The copy area. Nothing else ever goes here. -->
      <div class="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
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
        <div class="flex min-h-11 flex-wrap items-center justify-between gap-3">
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
            class="h-auto min-h-12 justify-between gap-2 whitespace-normal px-3 py-2 text-left"
            :disabled="!text"
            @click="pickCase(option.id)"
          >
            <span class="min-w-0 font-mono text-sm">{{ option.label }}</span>
            <Check v-if="copied === option.id" class="size-4 shrink-0" aria-hidden="true" />
            <ClipboardCopy v-else-if="caseMode === 'copy'" class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span class="sr-only">{{ copied === option.id ? ', copied' : '' }}</span>
          </Button>
        </div>
      </section>

      <section v-else-if="section === 'details'" :class="panel" aria-labelledby="word-counter-details-heading">
        <h2 id="word-counter-details-heading" class="flex min-h-11 items-center text-sm font-semibold">
          Details
        </h2>
        <div class="mt-2 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div class="flex flex-col gap-5 rounded-xl bg-muted/50 p-4 sm:p-5">
            <div>
              <h3 class="text-xs font-medium text-muted-foreground">
                Time to get through it
              </h3>
              <ul class="mt-3 space-y-3">
                <li v-for="row in pace" :key="row.label">
                  <div class="flex items-center gap-2 text-sm">
                    <component :is="row.icon" class="size-4 text-muted-foreground" aria-hidden="true" />
                    <span class="font-medium">{{ row.label }}</span>
                    <span class="ml-auto font-semibold tabular-nums">{{ row.value }}</span>
                  </div>
                  <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-background dark:bg-input/40" aria-hidden="true">
                    <div class="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-300" :style="{ width: `${row.share}%` }" />
                  </div>
                  <p class="mt-1 text-xs text-muted-foreground">
                    at {{ row.hint }}
                  </p>
                </li>
              </ul>
            </div>
            <div class="border-t border-border pt-4">
              <div class="flex items-baseline justify-between gap-3">
                <h3 class="text-xs font-medium text-muted-foreground">
                  Vocabulary variety
                </h3>
                <span class="text-sm font-semibold tabular-nums">{{ variety }}%</span>
              </div>
              <div
                class="mt-2 h-2 overflow-hidden rounded-full bg-background dark:bg-input/40"
                role="meter"
                aria-label="Vocabulary variety"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-valuenow="variety"
                :aria-valuetext="`${variety}% of words are different`"
              >
                <div class="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-300" :style="{ width: `${variety}%` }" />
              </div>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ number(analysis.uniqueWords) }} different words out of {{ number(analysis.words) }}. Short texts score high; long ones repeat more.
              </p>
            </div>
            <dl class="flex min-w-0 items-start gap-2 border-t border-border pt-4">
              <MoveHorizontal class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div class="min-w-0">
                <dt class="text-xs font-medium text-muted-foreground">
                  Longest word
                </dt>
                <dd class="font-semibold break-words">
                  {{ analysis.longestWord || '—' }}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <dl class="grid h-full auto-rows-fr grid-cols-2 gap-3">
              <div v-for="item in details" :key="item.label" class="flex min-w-0 items-start gap-3 rounded-xl border border-border p-3">
                <component :is="item.icon" class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div class="min-w-0">
                  <dt class="text-xs leading-snug text-muted-foreground">
                    {{ item.label }}
                  </dt>
                  <dd class="truncate font-semibold tabular-nums">
                    {{ item.value }}
                  </dd>
                  <dd v-if="item.hint" class="text-xs leading-snug text-muted-foreground">
                    {{ item.hint }}
                  </dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section v-else-if="section === 'limits'" :class="panel" aria-labelledby="word-counter-limits-heading">
        <h2 id="word-counter-limits-heading" class="flex min-h-11 items-center text-sm font-semibold">
          Common limits
        </h2>
        <ul class="mt-2 grid gap-3 sm:grid-cols-2">
          <li v-for="limit in analysis.limits" :key="limit.id" class="flex gap-4 rounded-xl border border-border p-4">
            <WordCounterRing :used="limit.used" :max="limit.max" :label="remaining(limit.used, limit.max)" />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 text-sm">
                <component :is="LIMIT_ICONS[limit.id]" class="size-4 text-muted-foreground" aria-hidden="true" />
                <span class="font-medium">{{ limit.label }}</span>
              </div>
              <p class="mt-0.5 text-sm tabular-nums" :class="limit.used > limit.max ? 'font-medium text-destructive' : 'text-muted-foreground'">
                {{ number(limit.used) }} / {{ number(limit.max) }}
                · {{ limit.used > limit.max ? `${number(limit.used - limit.max)} over` : `${number(limit.max - limit.used)} left` }}
              </p>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ limit.note }}
              </p>
            </div>
          </li>

          <li class="flex gap-4 rounded-xl border border-border p-4">
            <WordCounterRing :used="sms.perSegment - sms.remaining" :max="sms.perSegment" :label="number(sms.remaining)" />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2 text-sm">
                <MessageSquare class="size-4 text-muted-foreground" aria-hidden="true" />
                <span class="font-medium">SMS</span>
                <span class="rounded-full bg-muted px-2 py-0.5 font-mono text-xs">{{ sms.encoding }}</span>
                <span class="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">{{ sms.segments }} {{ sms.segments === 1 ? 'part' : 'parts' }}</span>
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
            </div>
          </li>
        </ul>
      </section>

      <section v-else-if="section === 'keywords'" :class="panel" aria-labelledby="word-counter-keywords-heading">
        <h2 id="word-counter-keywords-heading" class="flex min-h-11 items-center text-sm font-semibold">
          Top keywords
        </h2>
        <p class="text-xs text-muted-foreground">
          The most repeated words, leaving out common English words like “the” and “and”, numbers and single letters.
        </p>
        <ol v-if="analysis.keywords.length" class="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <li v-for="(keyword, i) in analysis.keywords" :key="keyword.word" class="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
            <span class="row-span-2 grid size-6 place-items-center rounded-md bg-muted text-xs font-medium tabular-nums text-muted-foreground" aria-hidden="true">{{ i + 1 }}</span>
            <span class="truncate text-sm font-medium">{{ keyword.word }}</span>
            <span class="text-xs tabular-nums text-muted-foreground">{{ keyword.count }} × · {{ keyword.density.toLocaleString('en-GB') }}%</span>
            <span class="col-span-2 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <span class="block h-full rounded-full bg-primary/70" :style="{ width: `${keyword.count / topCount * 100}%` }" />
            </span>
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
