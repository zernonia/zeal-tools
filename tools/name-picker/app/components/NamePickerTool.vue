<script setup lang="ts">
import { ArrowDownAZ, Copy, Shuffle, Sparkles, Trash2, X } from 'lucide-vue-next'

const {
  state,
  ready,
  available,
  stored,
  clear,
  entries,
  rotation,
  duration,
  spinning,
  winner,
  history,
  canSpin,
  spin,
  shuffleNames,
  sortNames,
  dedupe,
  removeAt,
  reset,
} = useNamePicker()

const confirmClear = ref(false)
const copied = ref(false)

/**
 * Announced only once the wheel has stopped. Putting the winner into a live
 * region the moment it is drawn would read the answer out five seconds before
 * everyone watching the screen gets to see it.
 */
const announcement = computed(() => {
  if (spinning.value)
    return 'Spinning the wheel'
  if (winner.value)
    return `The winner is ${winner.value.label}`
  return ''
})

async function copyHistory() {
  try {
    await navigator.clipboard.writeText(history.value.map((name, i) => `${history.value.length - i}. ${name}`).reverse().join('\n'))
    copied.value = true
    setTimeout(() => copied.value = false, 1600)
  }
  catch {
    copied.value = false
  }
}
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ announcement }}
    </p>

    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <!-- ───────────────────────────── the wheel ───────────────────────── -->
      <section class="flex min-w-0 grow flex-col items-center justify-center gap-6 rounded-2xl border bg-background p-6 dark:bg-input/30">
        <NameWheel
          :entries="entries"
          :rotation="rotation"
          :duration="duration"
          :spinning="spinning"
          :disabled="!canSpin && !spinning"
          @spin="spin"
        />

        <!-- Fixed height, so the result appearing does not shove the wheel. -->
        <div class="flex h-16 flex-col items-center justify-center text-center">
          <template v-if="winner && !spinning">
            <p class="text-xs uppercase tracking-widest text-muted-foreground">
              Winner
            </p>
            <p data-testid="winner" class="max-w-full truncate font-heading text-3xl text-primary sm:text-4xl">
              {{ winner.label }}
            </p>
          </template>
          <p v-else-if="entries.length === 0" class="text-sm text-muted-foreground">
            Add some names and the wheel will fill up.
          </p>
          <p v-else class="text-sm text-muted-foreground">
            {{ spinning ? 'Spinning…' : 'Click the wheel to draw a name.' }}
          </p>
        </div>
      </section>

      <!-- ───────────────────────────── the list ────────────────────────── -->
      <div class="flex min-w-0 flex-col gap-5">
        <section class="rounded-2xl border bg-background p-5 dark:bg-input/30">
          <div class="flex items-baseline justify-between gap-2">
            <Label for="names" class="text-sm font-semibold">Names</Label>
            <span class="text-xs tabular-nums text-muted-foreground">
              {{ entries.length }} on the wheel
            </span>
          </div>
          <p class="mt-1 text-xs text-muted-foreground">
            One per line. Add <code class="rounded bg-muted px-1 py-0.5">×3</code> after a name to give it
            three times the chance.
          </p>
          <Textarea
            id="names"
            v-model="state.names"
            rows="10"
            class="mt-3 font-mono text-sm"
            spellcheck="false"
            placeholder="Ada&#10;Grace&#10;Linus"
          />

          <div class="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" :disabled="entries.length < 2" @click="shuffleNames">
              <Shuffle class="size-4" /> Shuffle
            </Button>
            <Button size="sm" variant="outline" :disabled="entries.length < 2" @click="sortNames">
              <ArrowDownAZ class="size-4" /> Sort
            </Button>
            <Button size="sm" variant="outline" :disabled="entries.length < 2" @click="dedupe">
              <Sparkles class="size-4" /> Remove duplicates
            </Button>
          </div>

          <div class="mt-4 flex items-start gap-3 border-t pt-4">
            <Checkbox id="remove-winner" v-model="state.removeWinner" class="mt-0.5" />
            <div>
              <Label for="remove-winner" class="text-sm">Take the winner off the wheel</Label>
              <p class="mt-0.5 text-xs text-muted-foreground">
                For drawing several winners, or working through a class without asking anyone twice.
              </p>
            </div>
          </div>
        </section>

        <!-- Every name, in full, for anything the wheel is too crowded to show. -->
        <section v-if="entries.length" class="rounded-2xl border bg-background p-5 dark:bg-input/30">
          <h2 class="text-sm font-semibold">
            On the wheel
          </h2>
          <ul class="mt-3 flex flex-wrap gap-1.5">
            <li v-for="(entry, index) in entries" :key="entry.id">
              <button
                type="button"
                class="group flex min-h-8 items-center gap-1 rounded-full border py-1 pl-3 pr-2 text-xs transition-colors hover:border-destructive/40 hover:text-destructive"
                :aria-label="`Remove ${entry.label}`"
                @click="removeAt(index)"
              >
                <span class="max-w-40 truncate">{{ entry.label }}</span>
                <span v-if="entry.weight > 1" class="tabular-nums text-muted-foreground">×{{ entry.weight }}</span>
                <X class="size-3 opacity-40 transition-opacity group-hover:opacity-100" />
              </button>
            </li>
          </ul>
        </section>

        <section v-if="history.length" class="rounded-2xl border bg-background p-5 dark:bg-input/30">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-semibold">
              Drawn so far
            </h2>
            <div class="flex gap-1">
              <Button size="sm" variant="ghost" @click="copyHistory">
                <Copy class="size-4" /> {{ copied ? 'Copied' : 'Copy' }}
              </Button>
              <Button size="sm" variant="ghost" @click="reset">
                Clear
              </Button>
            </div>
          </div>
          <ol class="mt-3 space-y-1 text-sm">
            <li v-for="(name, index) in history" :key="`${index}-${name}`" class="flex gap-2">
              <span class="w-5 shrink-0 tabular-nums text-muted-foreground">{{ history.length - index }}.</span>
              <span class="min-w-0 truncate" :class="index === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'">{{ name }}</span>
            </li>
          </ol>
        </section>
      </div>
    </div>

    <!-- What is kept, said plainly, with the way out beside it. -->
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/40 px-4 py-3 text-sm">
      <p class="text-muted-foreground">
        <template v-if="!available">
          This browser will not let the page store anything, so the list is not remembered between visits.
        </template>
        <template v-else-if="stored">
          <span class="font-medium text-foreground">Saved on this device.</span>
          Your list stays in this browser and is never sent anywhere.
        </template>
        <template v-else>
          Your list is saved in this browser so it is still here next time. Nothing is ever sent anywhere.
        </template>
      </p>
      <div v-if="stored && ready" class="flex items-center gap-2">
        <template v-if="confirmClear">
          <span class="text-xs text-muted-foreground">Erase the saved list?</span>
          <Button size="sm" variant="outline" @click="confirmClear = false">
            Keep
          </Button>
          <Button size="sm" variant="outline" class="text-destructive" @click="clear(); reset(); confirmClear = false">
            Erase
          </Button>
        </template>
        <Button v-else size="sm" variant="outline" @click="confirmClear = true">
          <Trash2 class="size-4" /> Clear saved list
        </Button>
      </div>
    </div>
  </div>
</template>
