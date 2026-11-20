<script setup lang="ts">
import type { CoinSide } from '../../core'
import { Check, Copy, Flame, RotateCcw, Trophy } from 'lucide-vue-next'
import { coinShares, currentStreak, flipCoins, longestStreak, MAX_FLIPS } from '../../core'
import { drawBelow, injectRandomState, randomReducedMotion, useRandomCompletion, useRandomCopy } from '../composables/useRandomTool'

const state = injectRandomState()
const complete = useRandomCompletion()
const { copied, copy } = useRandomCopy()

/** Matches the keyframes below; zero when the reader asked for less motion. */
const SPIN_MS = 1100
/** Kept in memory only, and capped so an afternoon of flipping stays cheap. */
const HISTORY_LIMIT = MAX_FLIPS
const SHOWN = 48
/** Coins drawn for one press of several; the count and the bar say the rest. */
const BATCH_SHOWN = 100
const QUICK_COUNTS = [1, 10, 100]

const history = ref<CoinSide[]>([])
/** The face showing. Heads up before the first flip, as a coin on a table. */
const face = ref<CoinSide>('heads')
const spin = ref<{ key: number, from: number, to: number } | null>(null)
const flipping = ref(false)
const lastBatch = ref<CoinSide[]>([])
/** The batch in the air: on screen at once, counted when it lands. */
const tossed = ref<CoinSide[]>([])
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
  tossed.value = batch
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
  tossed.value = []
}

onBeforeUnmount(() => clearTimeout(timer))

const heads = computed(() => history.value.filter(side => side === 'heads').length)
const tails = computed(() => history.value.length - heads.value)
const shares = computed(() => coinShares(heads.value, tails.value))
const longest = computed(() => longestStreak(history.value))
const current = computed(() => currentStreak(history.value))
const recent = computed(() => history.value.slice(-SHOWN).reverse())

/** Several coins per press shows the whole batch; one shows the big coin. */
const many = computed(() => state.flips > 1)
const batchShown = computed(() => {
  if (tossed.value.length > 1)
    return tossed.value.slice(0, BATCH_SHOWN)
  return []
})
/** Up to 20 coins are drawn large; more shrink so a hundred still fit. */
const bigBatch = computed(() => Math.max(state.flips, batchShown.value.length) > 20)
/** Empty places for the coins about to be thrown, so the area keeps its size. */
const placeholders = computed(() => (batchShown.value.length ? 0 : Math.min(state.flips, BATCH_SHOWN)))

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
    return many.value ? `${state.flips.toLocaleString('en')} coins ready` : 'Ready to flip'
  if (lastBatch.value.length === 1)
    return label(lastBatch.value[0]!)
  return `${batchHeads.value.toLocaleString('en')} heads, ${(lastBatch.value.length - batchHeads.value).toLocaleString('en')} tails`
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
      <div class="coin-table flex min-h-80 flex-col items-center justify-center gap-5 rounded-xl px-4 py-6">
        <!-- One coin: the big one, spinning in 3D. -->
        <div v-if="!many" class="coin-stage" aria-hidden="true">
          <div
            :key="spin?.key ?? 0"
            class="coin"
            :class="[face === 'tails' ? 'coin-tails' : '', spin ? 'coin-spinning' : '']"
            :style="spin ? { '--coin-from': `${spin.from}deg`, '--coin-to': `${spin.to}deg` } : undefined"
          >
            <RandomCoinFace side="heads" class="coin-face" />
            <RandomCoinFace side="tails" class="coin-face coin-back" />
          </div>
          <div :key="`shadow-${spin?.key ?? 0}`" class="coin-shadow" :class="spin ? 'coin-shadow-spinning' : ''" />
        </div>

        <!-- Several: every coin of the batch, each landing a moment after the last. -->
        <ol v-else :key="spin?.key ?? 0" class="flex max-w-xl flex-wrap justify-center" :class="bigBatch ? 'gap-1.5' : 'gap-2.5'" aria-hidden="true">
          <li
            v-for="(side, index) in batchShown"
            :key="index"
            class="mini-coin"
            :class="bigBatch ? 'size-7' : 'size-12'"
            :style="{ animationDelay: `${Math.min(index, 60) * (bigBatch ? 12 : 45)}ms` }"
          >
            <RandomCoinFace :side="side" size="sm" />
          </li>
          <li
            v-for="index in placeholders"
            :key="`empty-${index}`"
            class="rounded-full border-2 border-dashed border-border"
            :class="bigBatch ? 'size-7' : 'size-12'"
          />
        </ol>

        <div class="text-center">
          <p class="min-h-9 text-3xl font-semibold tracking-tight" :class="flipping ? 'text-muted-foreground' : ''">
            {{ headline }}
          </p>
          <p class="mt-1 min-h-5 text-xs text-muted-foreground">
            <template v-if="many && tossed.length > BATCH_SHOWN && !flipping">
              The first {{ BATCH_SHOWN }} of {{ tossed.length.toLocaleString('en') }} coins are drawn; every one is counted.
            </template>
          </p>
        </div>
      </div>

      <p v-if="error" class="text-sm text-destructive" role="alert">
        {{ error }}
      </p>

      <!-- The copy area. Nothing else ever goes here. -->
      <div class="grid gap-3 sm:grid-cols-2">
        <Button size="lg" class="min-h-11" @click="flip">
          {{ state.flips > 1 ? `Flip ${state.flips.toLocaleString('en')} coins` : 'Flip the coin' }}
        </Button>
        <Button size="lg" variant="outline" class="min-h-11" :disabled="!copyText" @click="copy(copyText)">
          <component :is="copied ? Check : Copy" class="size-4" />
          {{ copied ? 'Copied' : 'Copy results' }}
        </Button>
      </div>
    </section>

    <section :class="sectionClass" aria-labelledby="coin-tally-heading">
      <div class="flex min-h-11 items-center justify-between gap-3">
        <h2 id="coin-tally-heading" class="text-sm font-semibold">
          Tally
          <span class="ml-1.5 rounded-full bg-muted px-2 py-0.5 font-mono text-xs font-medium text-muted-foreground tabular-nums dark:bg-input/50">
            {{ history.length.toLocaleString('en') }} {{ history.length === 1 ? 'flip' : 'flips' }}
          </span>
        </h2>
        <Button variant="ghost" size="sm" class="min-h-11" :disabled="!history.length" @click="reset">
          <RotateCcw class="size-3.5" />
          Start over
        </Button>
      </div>

      <!-- Heads against tails as one bar, with the fair 50% marked. -->
      <div>
        <div class="relative flex h-11 overflow-hidden rounded-xl bg-muted dark:bg-input/40" aria-hidden="true">
          <template v-if="shares">
            <div
              class="flex items-center justify-start overflow-hidden bg-primary text-sm font-semibold whitespace-nowrap text-primary-foreground transition-[width] duration-500"
              :style="{ width: `${shares.heads}%` }"
            >
              <span v-if="shares.heads >= 18" class="px-3">H {{ shares.heads }}%</span>
            </div>
            <div class="flex grow items-center justify-end overflow-hidden text-sm font-semibold whitespace-nowrap">
              <span v-if="shares.tails >= 18" class="px-3">{{ shares.tails }}% T</span>
            </div>
          </template>
          <div v-else class="grid grow place-items-center text-sm text-muted-foreground">
            Flip to start the count
          </div>
          <div v-if="shares" class="absolute inset-y-1 left-1/2 w-px bg-foreground/30" />
        </div>
        <dl class="mt-2 flex justify-between gap-4 text-sm">
          <div class="flex items-baseline gap-1.5">
            <dt class="text-muted-foreground">
              Heads
            </dt>
            <dd class="font-mono font-semibold tabular-nums">
              {{ heads.toLocaleString('en') }} <span class="font-normal text-muted-foreground">· {{ percent(heads) }}</span>
            </dd>
          </div>
          <div class="flex items-baseline gap-1.5">
            <dt class="text-muted-foreground">
              Tails
            </dt>
            <dd class="font-mono font-semibold tabular-nums">
              {{ tails.toLocaleString('en') }} <span class="font-normal text-muted-foreground">· {{ percent(tails) }}</span>
            </dd>
          </div>
        </dl>
      </div>

      <dl class="grid grid-cols-2 gap-3">
        <div class="flex items-center gap-3 rounded-xl bg-muted/50 p-3 dark:bg-input/30">
          <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-card text-foreground" aria-hidden="true">
            <Trophy class="size-5" />
          </span>
          <div class="min-w-0">
            <dt class="text-xs text-muted-foreground">
              Longest streak
            </dt>
            <dd class="truncate text-base font-semibold">
              {{ streakText(longest) }}
            </dd>
          </div>
        </div>
        <div class="flex items-center gap-3 rounded-xl bg-muted/50 p-3 dark:bg-input/30">
          <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-card text-foreground" aria-hidden="true">
            <Flame class="size-5" />
          </span>
          <div class="min-w-0">
            <dt class="text-xs text-muted-foreground">
              Current streak
            </dt>
            <dd class="truncate text-base font-semibold">
              {{ streakText(current) }}
            </dd>
          </div>
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
            class="size-7 rounded-full"
            :class="index === 0 ? 'ring-2 ring-ring ring-offset-2 ring-offset-card' : ''"
          >
            <RandomCoinFace :side="side" size="sm" />
            <span class="sr-only">{{ label(side) }}</span>
          </li>
        </ol>
      </div>

      <div class="border-t border-border pt-4">
        <div class="flex flex-wrap items-end gap-2">
          <NumberField
            id="coin-count"
            :model-value="state.flips"
            :min="1"
            :max="1000"
            :step="1"
            :format-options="{ useGrouping: false }"
            class="w-44"
            @update:model-value="(value: number | undefined) => state.flips = value ?? state.flips"
          >
            <Label for="coin-count" class="mb-0">Coins per press</Label>
            <NumberFieldContent>
              <NumberFieldDecrement />
              <NumberFieldInput />
              <NumberFieldIncrement />
            </NumberFieldContent>
          </NumberField>
          <div class="flex gap-2" role="group" aria-label="Quick counts">
            <Button
              v-for="count in QUICK_COUNTS"
              :key="count"
              :variant="state.flips === count ? 'default' : 'outline'"
              class="h-11 min-w-12 font-mono"
              :aria-pressed="state.flips === count"
              :aria-label="`${count} ${count === 1 ? 'coin' : 'coins'} per press`"
              @click="state.flips = count"
            >
              {{ count }}
            </Button>
          </div>
        </div>
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
/* The surface the coin lands on: a faint spotlight from tokens, both themes. */
.coin-table {
  background:
    radial-gradient(ellipse at 50% 30%, color-mix(in oklab, var(--foreground) 8%, transparent), transparent 65%),
    color-mix(in oklab, var(--muted) 70%, transparent);
}

:global(.dark) .coin-table {
  background:
    radial-gradient(ellipse at 50% 30%, color-mix(in oklab, var(--foreground) 10%, transparent), transparent 65%),
    color-mix(in oklab, var(--input) 30%, transparent);
}

.coin-stage {
  position: relative;
  perspective: 900px;
  padding-bottom: 1.25rem;
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
  backface-visibility: hidden;
}

.coin-back {
  transform: rotateY(180deg);
}

/* Its shadow on the table, shrinking as the coin rises. */
.coin-shadow {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 8rem;
  height: 0.75rem;
  translate: -50% 0;
  border-radius: 9999px;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.35), transparent);
}

/*
  The global prefers-reduced-motion rule cuts these to 0.01ms, so the coin
  simply shows the face it landed on, and `flip()` drops its wait to zero so
  the tally and the announcement arrive at once too.
*/
.coin-spinning {
  animation: coin-spin 1100ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
}

.coin-shadow-spinning {
  animation: coin-shadow 1100ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
}

@keyframes coin-spin {
  from {
    transform: translateY(0) rotateY(var(--coin-from));
  }
  40% {
    transform: translateY(-38%) rotateY(calc((var(--coin-from) + var(--coin-to)) / 2));
  }
  to {
    transform: translateY(0) rotateY(var(--coin-to));
  }
}

@keyframes coin-shadow {
  40% {
    scale: 0.55;
    opacity: 0.4;
  }
}

/* Each small coin turns over as it lands — at once, with no stagger, for reduced motion. */
@media (prefers-reduced-motion: reduce) {
  .mini-coin {
    animation-delay: 0ms !important;
  }
}

.mini-coin {
  animation: mini-coin 420ms ease-out both;
}

@keyframes mini-coin {
  from {
    opacity: 0;
    transform: perspective(200px) rotateY(540deg) translateY(-40%);
  }
  to {
    opacity: 1;
    transform: perspective(200px) rotateY(0) translateY(0);
  }
}
</style>
