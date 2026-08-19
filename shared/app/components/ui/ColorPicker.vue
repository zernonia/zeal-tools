<script setup lang="ts">
import {
  ColorAreaArea,
  ColorAreaRoot,
  ColorAreaThumb,
  ColorSliderRoot,
  ColorSliderThumb,
  ColorSliderTrack,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from 'reka-ui'
import { computed } from 'vue'

const props = defineProps<{
  label: string
  /** Preset swatches shown under the picker. */
  swatches?: string[]
}>()

const modelValue = defineModel<string>({ default: '#111111' })

const defaultSwatches = [
  '#111111',
  '#ea580c',
  '#dc2626',
  '#d97706',
  '#16a34a',
  '#0891b2',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ffffff',
]
const swatches = computed(() => props.swatches ?? defaultSwatches)

// Hue of the current color drives the saturation/brightness area backdrop
const hue = computed(() => {
  const m = modelValue.value?.match(/^#?([0-9a-f]{6})/i)
  if (!m)
    return 0
  const n = parseInt(m[1], 16)
  const r = (n >> 16 & 0xff) / 255; const g = (n >> 8 & 0xff) / 255; const b = (n & 0xff) / 255
  const max = Math.max(r, g, b); const min = Math.min(r, g, b)
  if (max === min)
    return 0
  const d = max - min
  let h = 0
  if (max === r)
    h = ((g - b) / d + (g < b ? 6 : 0))
  else if (max === g)
    h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return Math.round(h * 60)
})

function onHexInput(event: Event) {
  const value = (event.target as HTMLInputElement).value.trim()
  if (/^#?[0-9a-f]{6}$/i.test(value))
    modelValue.value = value.startsWith('#') ? value : `#${value}`
}
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger
      class="flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-transparent dark:bg-input/30 px-2.5 text-sm transition-colors hover:border-primary/40 focus-visible:border-ring focus-visible:outline-none"
      :aria-label="`${label}: ${modelValue}`"
    >
      <span
        class="size-6 shrink-0 rounded-md border border-border shadow-inner"
        :style="{ background: modelValue === 'transparent' ? 'repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 8px 8px' : modelValue }"
        aria-hidden="true"
      />
      <span class="truncate font-mono text-xs text-muted-foreground">{{ modelValue }}</span>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        :side-offset="6"
        class="z-50 w-(--reka-popper-anchor-width) rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl"
      >
        <ColorAreaRoot
          v-model="modelValue"
          color-space="hsb"
          x-channel="saturation"
          y-channel="brightness"
          class="relative h-40 w-full overflow-hidden rounded-lg border border-border"
        >
          <ColorAreaArea
            class="size-full"
            :style="{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))` }"
          >
            <!-- reka already sets position/left/top/transform on the thumb -->
            <ColorAreaThumb class="size-4 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
          </ColorAreaArea>
        </ColorAreaRoot>

        <ColorSliderRoot
          v-model="modelValue"
          color-space="hsb"
          channel="hue"
          orientation="horizontal"
          class="relative mt-3 flex h-4 w-full touch-none select-none items-center"
        >
          <ColorSliderTrack class="relative h-3 w-full grow overflow-hidden rounded-full border border-border" />
          <ColorSliderThumb class="block size-4 rounded-full border-2 border-white bg-transparent shadow-[0_0_0_1px_rgba(0,0,0,0.4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
        </ColorSliderRoot>

        <div class="mt-3 flex items-center gap-2">
          <span class="text-xs text-muted-foreground">Hex</span>
          <input
            :value="modelValue"
            class="h-8 w-full rounded-md border border-input bg-transparent dark:bg-input/30 px-2 font-mono text-xs focus-visible:border-ring focus-visible:outline-none"
            spellcheck="false"
            :aria-label="`${label} hex value`"
            @change="onHexInput"
          >
        </div>

        <!-- flex-1 + aspect-square spreads any number of swatches across one row -->
        <div class="mt-3 flex gap-1.5" role="group" :aria-label="`${label} presets`">
          <button
            v-for="swatch in swatches"
            :key="swatch"
            type="button"
            class="aspect-square min-w-0 flex-1 rounded-md border border-border transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            :style="{ background: swatch }"
            :aria-label="swatch"
            @click="modelValue = swatch"
          />
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
