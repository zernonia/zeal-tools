<script setup lang="ts">
import type { RandomMode } from '../composables/useRandomTool'
import { RANDOM_STATE, RANDOM_TOOL, useRandomState } from '../composables/useRandomTool'

/**
 * Numbers, coin and dice in one tool, with the mode as a tab. Every page opens
 * on its own mode — the variant pages pass `initial-mode` — and the other two
 * are one press away, because "flip a coin" and "pick a number" are so often
 * the same question asked two ways.
 *
 * Rendered on the server: nothing here touches a browser API at setup, so the
 * controls are in the prerendered page and there is no fallback to shift.
 */
const props = withDefaults(defineProps<{ initialMode?: RandomMode }>(), { initialMode: 'numbers' })

const state = useRandomState(props.initialMode)
provide(RANDOM_STATE, state)

const MODES: { value: RandomMode, label: string }[] = [
  { value: 'numbers', label: 'Numbers' },
  { value: 'coin', label: 'Coin flip' },
  { value: 'dice', label: 'Dice' },
]

// A hand-edited `?mode=` that names nothing falls back to the page's own mode.
const mode = computed({
  get: () => (MODES.some(m => m.value === state.mode) ? state.mode : props.initialMode),
  set: (value: string) => { state.mode = value },
})
</script>

<template>
  <div class="tool-frame space-y-5">
    <Tabs v-model="mode">
      <TabsList aria-label="What to randomise" class="grid w-full grid-cols-3 sm:inline-grid sm:w-auto">
        <TabsTrigger v-for="option in MODES" :key="option.value" :value="option.value" class="min-h-11 px-4">
          {{ option.label }}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="numbers">
        <RandomNumbersPanel />
      </TabsContent>
      <TabsContent value="coin">
        <RandomCoinPanel />
      </TabsContent>
      <TabsContent value="dice">
        <RandomDicePanel />
      </TabsContent>
    </Tabs>

    <div class="rounded-2xl border border-border p-5">
      <ShareBar
        :tool="RANDOM_TOOL"
        share-copy="Free random number generator, coin flip and dice roller — real cryptographic randomness, nothing uploaded."
      />
    </div>
  </div>
</template>
