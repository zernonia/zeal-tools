<script setup lang="ts">
import type { DiceRoll } from '../../core'
import { Check, Copy, Dices } from 'lucide-vue-next'
import { ADVANTAGE, describeRoll, DISADVANTAGE, parseDice, rollDice } from '../../core'
import { drawBelow, injectRandomState, useRandomCompletion, useRandomCopy } from '../composables/useRandomTool'

const state = injectRandomState()
const complete = useRandomCompletion()
const { copied, copy } = useRandomCopy()

const HISTORY_LIMIT = 20

const roll = ref<DiceRoll | null>(null)
const history = ref<{ id: number, notation: string, text: string, total: number }[]>([])
const rolls = ref(0)
const submitError = ref('')
/** False until a roll is pressed: the example rolled on load is not announced. */
const pressedOnce = ref(false)

const QUICK = [4, 6, 8, 10, 12, 20, 100].map(sides => ({ sides, notation: `d${sides}` }))
const PRESETS = [
  { notation: ADVANTAGE, sides: 20, label: 'Advantage', hint: '2d20, keep highest' },
  { notation: DISADVANTAGE, sides: 20, label: 'Disadvantage', hint: '2d20, keep lowest' },
  { notation: '4d6kh3', sides: 6, label: 'Ability score', hint: '4d6, drop lowest' },
  { notation: '2d6', sides: 6, label: '2d6', hint: 'board games' },
]

/** Checked as you type, so a mistake shows before Roll is pressed. */
const parseError = computed(() => {
  try {
    parseDice(state.dice)
    return ''
  }
  catch (cause) {
    return cause instanceof Error ? cause.message : 'That notation is not valid.'
  }
})

const error = computed(() => submitError.value || parseError.value)

function doRoll(pressed: boolean) {
  submitError.value = ''
  if (parseError.value) {
    submitError.value = parseError.value
    return
  }
  const result = rollDice(state.dice, drawBelow)
  roll.value = result
  rolls.value++
  if (pressed) {
    pressedOnce.value = true
    history.value = [
      { id: rolls.value, notation: result.notation, text: describeRoll(result).slice(result.notation.length + 2), total: result.total },
      ...history.value,
    ].slice(0, HISTORY_LIMIT)
    complete('dice')
  }
}

function rollNotation(notation: string) {
  state.dice = notation
  doRoll(true)
}

// One example roll on load, so the result area shows what a roll looks like.
// It is not added to the history — that list is only for rolls you made.
onMounted(() => doRoll(false))

/** Every die on the table, in order, with the operator that comes before its group. */
const dieCount = computed(() => roll.value?.groups.reduce((sum, group) => sum + group.rolls.length, 0) ?? 0)
/** Many dice draw smaller, so a handful of d6 is big and 40d6 still fits. */
const dieSize = computed(() => (dieCount.value > 24 ? 'size-9' : dieCount.value > 8 ? 'size-12' : 'size-16'))

const announcement = computed(() => {
  if (submitError.value)
    return submitError.value
  const current = roll.value
  if (!current || !pressedOnce.value)
    return ''
  const dice = current.groups.flatMap(group => group.rolls.map((value, i) => (group.kept[i] ? `${value}` : `${value} dropped`)))
  return `Rolled ${current.notation}: total ${current.total}. Dice: ${dice.join(', ')}.`
})

const copyText = computed(() => (roll.value ? describeRoll(roll.value) : ''))

const sectionClass = 'space-y-4 rounded-2xl border border-border p-5'
</script>

<template>
  <div class="space-y-5">
    <section :class="sectionClass" aria-label="Roll">
      <div class="grid grid-cols-7 gap-1.5 sm:gap-2" role="group" aria-label="Roll one die">
        <Button
          v-for="die in QUICK"
          :key="die.notation"
          variant="outline"
          class="h-auto min-h-11 flex-col gap-1 px-0 py-2"
          :aria-label="`Roll a ${die.notation}`"
          @click="rollNotation(die.notation)"
        >
          <RandomDie :sides="die.sides" variant="outline" class="size-6 sm:size-7" />
          <span class="font-mono text-xs sm:text-sm">{{ die.notation }}</span>
        </Button>
      </div>

      <div class="dice-table flex min-h-72 flex-col items-center justify-center gap-5 rounded-xl px-4 py-6 text-center">
        <template v-if="roll">
          <div :key="`total-${rolls}`" class="dice-total">
            <p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              <span class="font-mono normal-case">{{ roll.notation }}</span> · total
            </p>
            <p class="font-mono text-7xl leading-none font-bold tabular-nums sm:text-8xl">
              {{ roll.total }}
            </p>
          </div>
          <ul :key="rolls" class="flex max-w-full flex-wrap items-center justify-center gap-2 sm:gap-3" aria-label="Each die">
            <template v-for="(group, groupIndex) in roll.groups" :key="groupIndex">
              <li v-if="groupIndex > 0 || group.sign === -1" class="px-0.5 font-mono text-xl text-muted-foreground" aria-hidden="true">
                {{ group.sign === -1 ? '−' : '+' }}
              </li>
              <li
                v-for="(value, index) in group.rolls"
                :key="`${groupIndex}-${index}`"
                class="die relative"
                :class="dieSize"
                :style="{ animationDelay: `${Math.min(groupIndex * 3 + index, 24) * 45}ms` }"
                :title="`d${group.sides}${group.kept[index] ? '' : ', dropped'}`"
              >
                <RandomDie :sides="group.sides" :value="value" :variant="group.kept[index] ? 'solid' : 'dropped'" class="size-full" />
                <span class="sr-only">{{ value }}{{ group.kept[index] ? '' : ' (dropped)' }}</span>
              </li>
            </template>
            <li v-if="roll.modifier !== 0" class="px-0.5 font-mono text-xl text-muted-foreground">
              {{ roll.modifier < 0 ? '−' : '+' }}&nbsp;{{ Math.abs(roll.modifier) }}
            </li>
          </ul>
          <p v-if="roll.groups.some(group => group.kept.includes(false))" class="text-xs text-muted-foreground">
            Dashed dice were dropped by the keep rule and are not in the total.
          </p>
          <RandomRangeTrack
            :key="`track-${rolls}`"
            class="max-w-md"
            :min="roll.range.min"
            :max="roll.range.max"
            :values="[roll.total]"
            :value-label="String(roll.total)"
          />
        </template>
        <p v-else class="font-mono text-7xl font-bold text-muted-foreground/40" aria-hidden="true">
          ?
        </p>
      </div>

      <form class="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end" @submit.prevent="doRoll(true)">
        <div class="grid gap-1.5">
          <Label for="dice-notation" class="mb-0">Dice notation</Label>
          <Input
            id="dice-notation"
            v-model="state.dice"
            class="h-11 font-mono"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :aria-invalid="error ? 'true' : undefined"
            aria-describedby="dice-notation-help"
          />
        </div>
        <div class="grid grid-cols-2 gap-3 sm:contents">
          <Button type="submit" size="lg" class="min-h-11">
            <Dices class="size-4" />
            Roll
          </Button>
          <!-- The copy area. Nothing else ever goes here. -->
          <Button type="button" size="lg" variant="outline" class="min-h-11" :disabled="!copyText" @click="copy(copyText)">
            <component :is="copied ? Check : Copy" class="size-4" />
            {{ copied ? 'Copied' : 'Copy roll' }}
          </Button>
        </div>
      </form>
      <p id="dice-notation-help" class="text-xs" :class="error ? 'text-destructive' : 'text-muted-foreground'">
        {{ error || 'For example d20, 2d6+3, 4d6kh3 (keep the highest three), 2d20kl1, d% or 1d8+2d6-1.' }}
      </p>
    </section>

    <section :class="sectionClass" aria-labelledby="dice-presets-heading">
      <h2 id="dice-presets-heading" class="text-sm font-semibold">
        Common rolls
      </h2>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button
          v-for="preset in PRESETS"
          :key="preset.notation"
          variant="outline"
          class="h-auto min-h-14 justify-start gap-3 px-3 py-2.5 text-left whitespace-normal"
          @click="rollNotation(preset.notation)"
        >
          <!-- The icon steps aside on a phone, where the name needs the width. -->
          <RandomDie :sides="preset.sides" variant="outline" class="hidden size-7 shrink-0 text-muted-foreground sm:block" />
          <span class="flex min-w-0 flex-col">
            <span>{{ preset.label }}</span>
            <span class="text-xs font-normal text-muted-foreground">{{ preset.hint }}</span>
          </span>
        </Button>
      </div>

      <div v-if="history.length" class="border-t border-border pt-4">
        <h2 class="mb-2 text-sm font-semibold">
          Your rolls, newest first
        </h2>
        <ol class="divide-y divide-border overflow-hidden rounded-xl border border-border">
          <li v-for="entry in history" :key="entry.id" class="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 px-3 py-2 text-sm">
            <span class="truncate font-mono text-xs font-medium">{{ entry.notation }}</span>
            <span class="min-w-0 truncate font-mono text-xs text-muted-foreground">{{ entry.text }}</span>
            <span class="min-w-10 rounded-md bg-muted px-2 py-0.5 text-center font-mono font-semibold tabular-nums dark:bg-input/50">{{ entry.total }}</span>
          </li>
        </ol>
      </div>
    </section>

    <p class="sr-only" aria-live="polite">
      {{ announcement }}
    </p>
  </div>
</template>

<style scoped>
.dice-table {
  background:
    radial-gradient(ellipse at 50% 30%, color-mix(in oklab, var(--foreground) 8%, transparent), transparent 65%),
    color-mix(in oklab, var(--muted) 70%, transparent);
}

:global(.dark) .dice-table {
  background:
    radial-gradient(ellipse at 50% 30%, color-mix(in oklab, var(--foreground) 10%, transparent), transparent 65%),
    color-mix(in oklab, var(--input) 30%, transparent);
}

/*
  Each die tumbles onto the table. The global reduced-motion rule shortens the
  animation but not its delay, and with `both` a delayed die would sit
  invisible until its turn — so the stagger goes too.
*/
@media (prefers-reduced-motion: reduce) {
  .die {
    animation-delay: 0ms !important;
  }
}

.die {
  animation: die-tumble 560ms cubic-bezier(0.25, 1.3, 0.5, 1) both;
}

.dice-total {
  animation: dice-total 420ms ease-out both;
}

@keyframes die-tumble {
  0% {
    opacity: 0;
    translate: -40% -70%;
    rotate: -200deg;
    scale: 0.6;
  }
  60% {
    opacity: 1;
    rotate: 12deg;
  }
  100% {
    translate: 0 0;
    rotate: 0deg;
    scale: 1;
  }
}

@keyframes dice-total {
  from {
    opacity: 0;
    scale: 0.85;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}
</style>
