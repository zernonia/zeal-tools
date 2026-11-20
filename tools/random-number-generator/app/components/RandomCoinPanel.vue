<script setup lang="ts">
import type { CoinSide } from '../../core'
import { Check, Copy, RotateCcw } from 'lucide-vue-next'
import { currentStreak, flipCoins, longestStreak, MAX_FLIPS } from '../../core'
import { drawBelow, injectRandomState, randomReducedMotion, useRandomCompletion, useRandomCopy } from '../composables/useRandomTool'

const state = injectRandomState()
const complete = useRandomCompletion()
const { copied, copy } = useRandomCopy()

/** Matches the keyframes below; zero when the reader asked for less motion. */
const SPIN_MS = 1100
/** Kept in memory only, and capped so an afternoon of flipping stays cheap. */
const HISTORY_LIMIT = MAX_FLIPS
const SHOWN = 60

const history = ref<CoinSide[]>([])
/** The face showing. Heads up before the first flip, as a coin on a table. */
const face = ref<CoinSide>('heads')
const spin = ref<{ key: number, from: number, to: number } | null>(null)
const flipping = ref(false)
const lastBatch = ref<CoinSide[]>([])
const error = ref('')

let pending: CoinSide[] | null = null
let timer: ReturnType<typeof setTimeout> | undefined

function settle() {
  clearTimeout(timer)
  if (pending) {
    history.value = [...history.value, ...pending].slice(-HISTORY_LIMIT)
    lastBatch.value = pending
    pending = null
  }
  flipping.value = false
}

function flip() {
  // A second press mid-spin lands the first coin at once and throws again.
  settle()
  error.value = ''
  let batch: CoinSide[]
  try {
    batch = flipCoins(state.flips, drawBelow).flips
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Could not flip.'
    return
  }

  const landing = batch[batch.length - 1]!
  // Five full turns, then whatever half-turn puts the right face up. Starting
  // from the face already showing means there is no jump on the first frame.
  const from = face.value === 'heads' ? 0 : 180
  const to = 1800 + (landing === 'heads' ? 0 : 180)
  spin.value = { key: (spin.value?.key ?? 0) + 1, from, to }
  face.value = landing
  pending = batch
  flipping.value = true
  complete('coin')

  const duration = randomReducedMotion() ? 0 : SPIN_MS
  timer = setTimeout(settle, duration)
}

function reset() {
  settle()
  history.value = []
  lastBatch.value = []
}

onBeforeUnmount(() => clearTimeout(timer))

const heads = computed(() => history.value.filter(side => side === 'heads').length)
const tails = computed(() => history.value.length - heads.value)
const longest = computed(() => longestStreak(history.value))
const current = computed(() => currentStreak(history.value))
const recent = computed(() => history.value.slice(-SHOWN).reverse())

function percent(part: number) {
  return history.value.length ? `${Math.round((part / history.value.length) * 1000) / 10}%` : '–'
}

const label = (side: CoinSide) => (side === 'heads' ? 'Heads' : 'Tails')
function streakText(streak: { side: CoinSide, length: number } | null) {
  return streak ? `${streak.length} ${streak.side}` : '–'
}

const batchHeads = computed(() => lastBatch.value.filter(side => side === 'heads').length)

const headline = computed(() => {
  if (flipping.value)
    return 'Flipping…'
  if (!lastBatch.value.length)
    return 'Ready to flip'
  if (lastBatch.value.length === 1)
    return label(lastBatch.value[0]!)
  return `${batchHeads.value} heads, ${lastBatch.value.length - batchHeads.value} tails`
})

// Spoken once the coin lands, not when the button is pressed: announcing the
// answer while the coin is still in the air would put the screen reader ahead
// of the screen.
const announcement = computed(() => {
  if (error.value)
    return error.value
  if (flipping.value || !lastBatch.value.length)
    return ''
  const last = lastBatch.value
  if (last.length === 1)
    return `${label(last[0]!)}. ${heads.value} heads and ${tails.value} tails so far.`
  return `${last.length} flips: ${batchHeads.value} heads, ${last.length - batchHeads.value} tails.`
})

const copyText = computed(() => {
  if (!history.value.length)
    return ''
  const sequence = history.value.map(side => (side === 'heads' ? 'H' : 'T')).join('')
  return `${heads.value} heads, ${tails.value} tails in ${history.value.length} flips. Longest streak: ${streakText(longest.value)}.\n${sequence}`
})

const sectionClass = 'space-y-4 rounded-2xl border border-border p-5'
</script>

<template>
  <div class="space-y-5">
    <section :class="sectionClass" aria-label="Coin">
      <div class="flex flex-col items-center gap-4 py-4">
        <div class="coin-stage" aria-hidden="true">
          <div
            :key="spin?.key ?? 0"
            class="coin"
            :class="[face === 'tails' ? 'coin-tails' : '', spin ? 'coin-spinning' : '']"
            :style="spin ? { '--coin-from': `${spin.from}deg`, '--coin-to': `${spin.to}deg` } : undefined"
          >
            <div class="coin-face border-4 border-primary/30 bg-primary text-primary-foreground">
              <span class="text-5xl font-bold">H</span>
              <span class="text-xs font-semibold tracking-widest uppercase">Heads</span>
            </div>
            <div class="coin-face coin-back border-4 border-border bg-muted text-foreground">
              <span class="text-5xl font-bold">T</span>
              <span class="text-xs font-semibold tracking-widest uppercase">Tails</span>
            </div>
          </div>
        </div>

        <p class="min-h-8 text-2xl font-semibold" :class="flipping ? 'text-muted-foreground' : ''">
          {{ headline }}
        </p>
      </div>

      <p v-if="error" class="text-sm text-destructive" role="alert">
        {{ error }}
      </p>

      <!-- The copy area. Nothing else ever goes here. -->
      <div class="grid gap-3 sm:grid-cols-2">
        <Button size="lg" class="min-h-11" @click="flip">
          {{ state.flips > 1 ? `Flip ${state.flips} coins` : 'Flip the coin' }}
        </Button>
        <Button size="lg" variant="outline" class="min-h-11" :disabled="!copyText" @click="copy(copyText)">
          <component :is="copied ? Check : Copy" class="size-4" />
          {{ copied ? 'Copied' : 'Copy results' }}
        </Button>
      </div>
    </section>

    <section :class="sectionClass" aria-labelledby="coin-tally-heading">
      <div class="flex items-center justify-between gap-3">
        <h2 id="coin-tally-heading" class="text-sm font-semibold">
          Tally · {{ history.length.toLocaleString('en') }} {{ history.length === 1 ? 'flip' : 'flips' }}
        </h2>
        <Button variant="ghost" size="sm" class="min-h-11" :disabled="!history.length" @click="reset">
          <RotateCcw class="size-3.5" />
          Start over
        </Button>
      </div>

      <dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-xl bg-muted/50 p-3 dark:bg-input/30">
          <dt class="text-xs text-muted-foreground">
            Heads
          </dt>
          <dd class="font-mono text-lg font-semibold tabular-nums">
            {{ heads.toLocaleString('en') }} <span class="text-sm font-normal text-muted-foreground">{{ percent(heads) }}</span>
          </dd>
        </div>
        <div class="rounded-xl bg-muted/50 p-3 dark:bg-input/30">
          <dt class="text-xs text-muted-foreground">
            Tails
          </dt>
          <dd class="font-mono text-lg font-semibold tabular-nums">
            {{ tails.toLocaleString('en') }} <span class="text-sm font-normal text-muted-foreground">{{ percent(tails) }}</span>
          </dd>
        </div>
        <div class="rounded-xl bg-muted/50 p-3 dark:bg-input/30">
          <dt class="text-xs text-muted-foreground">
            Longest streak
          </dt>
          <dd class="text-lg font-semibold">
            {{ streakText(longest) }}
          </dd>
        </div>
        <div class="rounded-xl bg-muted/50 p-3 dark:bg-input/30">
          <dt class="text-xs text-muted-foreground">
            Current streak
          </dt>
          <dd class="text-lg font-semibold">
            {{ streakText(current) }}
          </dd>
        </div>
      </dl>

      <div v-if="recent.length">
        <h3 class="mb-2 text-xs text-muted-foreground">
          {{ history.length > SHOWN ? `Last ${SHOWN} flips` : 'Every flip' }}, newest first
        </h3>
        <ol class="flex flex-wrap gap-1.5">
          <li
            v-for="(side, index) in recent"
            :key="history.length - index"
            class="grid size-7 place-items-center rounded-full text-xs font-bold"
            :class="side === 'heads' ? 'bg-primary text-primary-foreground' : 'border border-border bg-muted text-foreground'"
          >
            <span aria-hidden="true">{{ side === 'heads' ? 'H' : 'T' }}</span>
            <span class="sr-only">{{ label(side) }}</span>
          </li>
        </ol>
      </div>

      <div class="border-t border-border pt-4">
        <NumberField
          id="coin-count"
          :model-value="state.flips"
          :min="1"
          :max="1000"
          :step="1"
          :format-options="{ useGrouping: false }"
          class="sm:w-56"
          @update:model-value="(value: number | undefined) => state.flips = value ?? state.flips"
        >
          <Label for="coin-count" class="mb-0">Coins per press</Label>
          <NumberFieldContent>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldContent>
        </NumberField>
        <p class="mt-2 text-xs text-muted-foreground">
          Flip up to 1,000 at once to see how quickly a run of heads evens out — or doesn't. The history stays in
          this tab only and is gone when you close it.
        </p>
      </div>
    </section>

    <p class="sr-only" aria-live="polite">
      {{ announcement }}
    </p>
  </div>
</template>

<style scoped>
.coin-stage {
  perspective: 900px;
}

.coin {
  position: relative;
  width: 11rem;
  height: 11rem;
  transform-style: preserve-3d;
}

.coin-tails {
  transform: rotateY(180deg);
}

.coin-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border-radius: 9999px;
  backface-visibility: hidden;
  box-shadow: 0 8px 24px -12px rgb(0 0 0 / 0.45);
}

.coin-back {
  transform: rotateY(180deg);
}

/*
  The global prefers-reduced-motion rule cuts this to 0.01ms, so the coin
  simply shows the face it landed on, and `flip()` drops its wait to zero so
  the tally and the announcement arrive at once too.
*/
.coin-spinning {
  animation: coin-spin 1100ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
}

@keyframes coin-spin {
  from {
    transform: translateY(0) rotateY(var(--coin-from));
  }
  40% {
    transform: translateY(-28%) rotateY(calc((var(--coin-from) + var(--coin-to)) / 2));
  }
  to {
    transform: translateY(0) rotateY(var(--coin-to));
  }
}
</style>
