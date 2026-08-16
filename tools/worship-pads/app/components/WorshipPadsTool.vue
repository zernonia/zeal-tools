<script setup lang="ts">
import { Square } from 'lucide-vue-next'

const { keys, activeKey, major, fadeSeconds, volume, supported, play, stop } = useWorshipPads()
const { track } = useAnalytics()

watch(activeKey, (key) => {
  if (key)
    track('tool_completed', { tool: 'worship-pads', format: 'audio' })
})

const announcement = computed(() =>
  activeKey.value ? `Pad playing in ${activeKey.value} ${major.value ? 'major' : 'minor'}` : 'Pads stopped',
)

/** Radius as a percentage of the dial, so the whole thing scales with its box. */
const RADIUS = 38

function position(angle: number) {
  const radians = (angle - 90) * (Math.PI / 180)
  return {
    left: `${50 + RADIUS * Math.cos(radians)}%`,
    top: `${50 + RADIUS * Math.sin(radians)}%`,
  }
}

const sectionClass = 'space-y-4 rounded-2xl border border-border p-5'
const sectionTitleClass = 'text-sm font-semibold'
</script>

<template>
  <div class="space-y-5">
    <p v-if="!supported" class="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
      This browser does not support the Web Audio API, so the pads cannot play here. Any current version of
      Chrome, Firefox, Safari or Edge will work.
    </p>

    <section :class="sectionClass" aria-label="Pad keys">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 :class="sectionTitleClass">
          Keys
        </h2>
        <div class="flex items-center gap-2">
          <Label for="pad-quality" class="mb-0 text-xs">Major</Label>
          <Checkbox id="pad-quality" v-model="major" />
        </div>
      </div>

      <!--
        Chromatic clockwise from C at the top, so the next number is always one
        semitone up — the move people actually make mid-set.
      -->
      <div class="relative mx-auto aspect-square w-full max-w-md">
        <div
          class="absolute inset-[12%] rounded-full border border-dashed border-border transition-colors duration-700"
          :class="activeKey ? 'border-primary/30' : ''"
          aria-hidden="true"
        />

        <div
          v-if="activeKey"
          class="pad-halo absolute inset-[18%] rounded-full bg-primary/5"
          aria-hidden="true"
        />

        <div class="absolute inset-0 grid place-items-center">
          <div class="text-center">
            <p class="font-mono text-4xl font-semibold tabular-nums transition-opacity" :class="activeKey ? 'opacity-100' : 'opacity-30'">
              {{ activeKey ?? '—' }}<span v-if="activeKey && !major" class="text-2xl">m</span>
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ activeKey ? `${major ? 'major' : 'minor'} pad` : 'nothing playing' }}
            </p>
          </div>
        </div>

        <button
          v-for="pad in keys"
          :key="pad.key"
          type="button"
          class="group absolute grid size-[17%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-sm font-semibold transition-colors"
          :class="activeKey === pad.key
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-input bg-card hover:border-primary/40 dark:bg-input/30'"
          :style="position(pad.angle)"
          :aria-pressed="activeKey === pad.key"
          :aria-label="`${pad.key} ${major ? 'major' : 'minor'} pad, shortcut ${pad.shortcut}`"
          @click="play(pad.key)"
        >
          <span>{{ pad.key }}</span>
          <kbd
            class="pointer-events-none absolute -bottom-1 rounded border px-1 font-mono text-[9px] font-normal"
            :class="activeKey === pad.key
              ? 'border-primary-foreground/40 bg-primary text-primary-foreground/80'
              : 'border-border bg-card text-muted-foreground dark:bg-input/30'"
          >{{ pad.shortcut }}</kbd>
        </button>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" size="sm" :disabled="!activeKey" @click="stop()">
          <Square class="size-3.5" />
          Stop
        </Button>
        <p class="text-xs text-muted-foreground">
          Press a key&rsquo;s shortcut to switch. Space or Escape stops. The next number is one semitone up.
        </p>
      </div>
    </section>

    <section :class="sectionClass" aria-label="Sound">
      <h2 :class="sectionTitleClass">
        Sound
      </h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <Label for="pad-fade">Crossfade: {{ fadeSeconds }}s</Label>
          <Slider
            id="pad-fade"
            :model-value="[fadeSeconds]"
            :min="0.5"
            :max="12"
            :step="0.5"
            aria-label="Crossfade length in seconds"
            @update:model-value="value => fadeSeconds = value?.[0] ?? 4"
          />
          <p class="mt-1 text-xs text-muted-foreground">
            How long one key takes to become the next. Longer hides the seam better.
          </p>
        </div>
        <div>
          <Label for="pad-volume">Volume: {{ Math.round(volume * 100) }}%</Label>
          <Slider
            id="pad-volume"
            :model-value="[volume]"
            :min="0"
            :max="1"
            :step="0.05"
            aria-label="Pad volume"
            @update:model-value="value => volume = value?.[0] ?? 0.6"
          />
          <p class="mt-1 text-xs text-muted-foreground">
            Set the level here and leave your system volume alone.
          </p>
        </div>
      </div>
    </section>

    <div aria-live="polite" class="sr-only">
      {{ announcement }}
    </div>
  </div>
</template>

<style scoped>
/* Slow swell, matching what a pad actually does. The global reduced-motion
   rule in main.css neutralises this for anyone who asks for that. */
@keyframes pad-breathe {
  0%, 100% { opacity: 0.35; transform: scale(0.97); }
  50% { opacity: 1; transform: scale(1.03); }
}

.pad-halo {
  animation: pad-breathe 6s ease-in-out infinite;
}
</style>
