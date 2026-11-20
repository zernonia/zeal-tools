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
const history = ref<{ id: number, text: string, total: number }[]>([])
const rolls = ref(0)
const submitError = ref('')
/** False until a roll is pressed: the example rolled on load is not announced. */
const pressedOnce = ref(false)

const QUICK = [4, 6, 8, 10, 12, 20, 100].map(sides => ({ notation: `d${sides}`, label: `d${sides}` }))
const PRESETS = [
  { notation: ADVANTAGE, label: 'Advantage', hint: '2d20, keep highest' },
  { notation: DISADVANTAGE, label: 'Disadvantage', hint: '2d20, keep lowest' },
  { notation: '4d6kh3', label: 'Ability score', hint: '4d6, drop lowest' },
  { notation: '2d6', label: '2d6', hint: 'board games' },
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
    history.value = [{ id: rolls.value, text: describeRoll(result), total: result.total }, ...history.value].slice(0, HISTORY_LIMIT)
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
      <div class="flex flex-wrap gap-2" role="group" aria-label="Roll one die">
        <Button
          v-for="die in QUICK"
          :key="die.notation"
          variant="outline"
          class="min-h-11 min-w-14 font-mono text-base"
          :aria-label="`Roll a ${die.label}`"
          @click="rollNotation(die.notation)"
        >
          {{ die.label }}
        </Button>
      </div>

      <div class="grid min-h-44 place-items-center rounded-xl bg-muted/50 p-4 text-center dark:bg-input/30">
        <div v-if="roll" :key="rolls" class="flex flex-col items-center gap-4">
          <p class="text-sm text-muted-foreground">
            <span class="font-mono">{{ roll.notation }}</span>
            · range {{ roll.range.min }} to {{ roll.range.max }}
          </p>
          <p class="font-mono text-7xl font-semibold tabular-nums">
            {{ roll.total }}
          </p>
          <ul class="flex max-w-full flex-wrap items-center justify-center gap-2" aria-label="Each die">
            <template v-for="(group, groupIndex) in roll.groups" :key="groupIndex">
              <li v-if="groupIndex > 0 || group.sign === -1" class="px-1 text-lg text-muted-foreground" aria-hidden="true">
                {{ group.sign === -1 ? '−' : '+' }}
              </li>
              <li
                v-for="(value, index) in group.rolls"
                :key="`${groupIndex}-${index}`"
                class="die grid size-12 place-items-center rounded-xl border-2 font-mono text-lg font-semibold tabular-nums"
                :class="group.kept[index] ? 'border-primary bg-card' : 'border-dashed border-border text-muted-foreground line-through'"
                :title="`d${group.sides}`"
              >
                {{ value }}
                <span v-if="!group.kept[index]" class="sr-only">(dropped)</span>
              </li>
            </template>
            <li v-if="roll.modifier !== 0" class="px-1 font-mono text-lg text-muted-foreground">
              {{ roll.modifier < 0 ? '−' : '+' }} {{ Math.abs(roll.modifier) }}
            </li>
          </ul>
        </div>
        <p v-else class="font-mono text-7xl font-semibold text-muted-foreground" aria-hidden="true">
          –
        </p>
      </div>

      <form class="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end" @submit.prevent="doRoll(true)">
        <div>
          <Label for="dice-notation">Dice notation</Label>
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
        <Button type="submit" size="lg" class="min-h-11">
          <Dices class="size-4" />
          Roll
        </Button>
        <!-- The copy area. Nothing else ever goes here. -->
        <Button type="button" size="lg" variant="outline" class="min-h-11" :disabled="!copyText" @click="copy(copyText)">
          <component :is="copied ? Check : Copy" class="size-4" />
          {{ copied ? 'Copied' : 'Copy roll' }}
        </Button>
      </form>
      <p id="dice-notation-help" class="text-xs" :class="error ? 'text-destructive' : 'text-muted-foreground'">
        {{ error || 'For example d20, 2d6+3, 4d6kh3 (keep the highest three), 2d20kl1, d% or 1d8+2d6-1.' }}
      </p>
    </section>

    <section :class="sectionClass" aria-labelledby="dice-presets-heading">
      <h2 id="dice-presets-heading" class="text-sm font-semibold">
        Common rolls
      </h2>
      <div class="grid gap-2 sm:grid-cols-4">
        <Button
          v-for="preset in PRESETS"
          :key="preset.notation"
          variant="outline"
          class="h-auto min-h-11 flex-col gap-0 py-2"
          @click="rollNotation(preset.notation)"
        >
          <span>{{ preset.label }}</span>
          <span class="text-xs font-normal text-muted-foreground">{{ preset.hint }}</span>
        </Button>
      </div>

      <div v-if="history.length" class="border-t border-border pt-4">
        <h2 class="mb-2 text-sm font-semibold">
          Your rolls, newest first
        </h2>
        <ol class="space-y-1 font-mono text-sm">
          <li v-for="entry in history" :key="entry.id" class="flex justify-between gap-3 rounded-lg px-2 py-1 odd:bg-muted/50 dark:odd:bg-input/30">
            <span class="min-w-0 break-all text-muted-foreground">{{ entry.text }}</span>
            <span class="font-semibold">{{ entry.total }}</span>
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
/* A short tumble as each roll lands; the global reduced-motion rule removes it. */
.die {
  animation: die-tumble 320ms ease-out;
}

@keyframes die-tumble {
  from {
    rotate: -24deg;
    scale: 0.7;
    opacity: 0.3;
  }
  60% {
    rotate: 8deg;
  }
  to {
    rotate: 0deg;
    scale: 1;
    opacity: 1;
  }
}
</style>
