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
          Pick a key
        </h2>
        <div class="flex items-center gap-2">
          <Label for="pad-quality" class="mb-0 text-xs">Major</Label>
          <Checkbox id="pad-quality" v-model="major" />
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        <button
          v-for="pad in keys"
          :key="pad.key"
          type="button"
          class="group relative flex h-20 flex-col items-center justify-center rounded-xl border text-lg font-semibold transition-colors"
          :class="activeKey === pad.key
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-input bg-transparent hover:border-primary/40 dark:bg-input/30'"
          :aria-pressed="activeKey === pad.key"
          @click="play(pad.key)"
        >
          {{ pad.key }}<span class="text-xs font-normal opacity-70">{{ major ? '' : 'm' }}</span>
          <kbd
            class="absolute right-2 top-2 rounded border px-1 font-mono text-[10px] font-normal"
            :class="activeKey === pad.key ? 'border-primary-foreground/40 text-primary-foreground/80' : 'border-border text-muted-foreground'"
          >{{ pad.shortcut }}</kbd>
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" :disabled="!activeKey" @click="stop()">
          <Square class="size-3.5" />
          Stop
        </Button>
        <p class="text-xs text-muted-foreground">
          Press a key&rsquo;s shortcut to switch instantly. Space or Escape stops.
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
