<script setup lang="ts">
import type { OutputFormat } from '../../core'
import { ImageUp, Trash2, X } from 'lucide-vue-next'
import { OUTPUT_FORMATS } from '../../core'
import { useImageCompressor } from '../composables/useImageCompressor'

const props = defineProps<{ defaultFormat?: OutputFormat }>()

const {
  jobs,
  format,
  quality,
  resizeMode,
  resizeValue,
  working,
  qualityApplies,
  done,
  savedFraction,
  savedLabel,
  originalLabel,
  outputLabel,
  add,
  remove,
  clear,
  nameFor,
  downloadAll,
  formatBytes,
} = useImageCompressor({ defaultFormat: props.defaultFormat })

const dragging = ref(false)

const RESIZE_MODES = [
  { value: 'none', label: 'Original size' },
  { value: 'longest', label: 'Longest edge' },
  { value: 'width', label: 'Width' },
  { value: 'height', label: 'Height' },
  { value: 'percent', label: 'Percentage' },
] as const

function onDrop(event: DragEvent) {
  dragging.value = false
  add(event.dataTransfer?.files ?? null)
}

const summary = computed(() => {
  if (!done.value.length)
    return ''
  const verb = savedFraction.value >= 0 ? 'smaller' : 'larger'
  return `${done.value.length} image${done.value.length === 1 ? '' : 's'} ready — ${savedLabel.value} ${verb}, ${originalLabel.value} down to ${outputLabel.value}.`
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ working ? 'Compressing.' : summary }}
    </p>

    <!-- Drop zone -->
    <div
      class="rounded-2xl border border-dashed transition-colors"
      :class="dragging ? 'border-primary bg-muted/40' : 'border-border'"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <input
        id="compressor-files"
        type="file"
        class="sr-only"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif"
        @change="add(($event.target as HTMLInputElement).files)"
      >
      <label
        for="compressor-files"
        class="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 px-6 py-8 text-center"
      >
        <ImageUp class="size-7 text-muted-foreground" />
        <span class="font-medium">Drop images here, or choose files</span>
        <span class="text-sm text-muted-foreground">
          JPEG, PNG, WebP, GIF, BMP or AVIF — they never leave your device
        </span>
      </label>
    </div>

    <!-- Settings -->
    <div class="grid gap-5 rounded-2xl border bg-background p-5 dark:bg-input/30 sm:grid-cols-2">
      <div class="flex flex-col gap-2">
        <Label for="format">Convert to</Label>
        <Select v-model="format">
          <SelectTrigger id="format" class="w-full">
            {{ OUTPUT_FORMATS.find(f => f.value === format)?.label }}
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="option in OUTPUT_FORMATS" :key="option.value" :value="option.value">
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <p class="text-xs text-muted-foreground">
          WebP is usually much smaller than JPEG at the same quality.
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <Label for="quality">Quality</Label>
          <span class="text-sm tabular-nums text-muted-foreground">
            {{ qualityApplies ? `${quality}%` : 'lossless' }}
          </span>
        </div>
        <Slider
          id="quality"
          :model-value="[quality]"
          :min="10"
          :max="100"
          :step="1"
          :disabled="!qualityApplies"
          aria-label="Quality"
          @update:model-value="value => quality = value?.[0] ?? 80"
        />
        <p class="text-xs text-muted-foreground">
          {{ qualityApplies ? 'Around 80% is usually indistinguishable from the original.' : 'PNG stores every pixel exactly, so quality does not apply.' }}
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <Label for="resize">Resize</Label>
        <Select v-model="resizeMode">
          <SelectTrigger id="resize" class="w-full">
            {{ RESIZE_MODES.find(m => m.value === resizeMode)?.label }}
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="mode in RESIZE_MODES" :key="mode.value" :value="mode.value">
              {{ mode.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div v-if="resizeMode !== 'none'" class="flex flex-col gap-2">
        <Label for="resize-value">
          {{ resizeMode === 'percent' ? 'Percentage' : 'Pixels' }}
        </Label>
        <Input
          id="resize-value"
          v-model.number="resizeValue"
          type="number"
          :min="1"
          :max="resizeMode === 'percent' ? 100 : 10000"
        />
        <p class="text-xs text-muted-foreground">
          Images are only ever made smaller, never enlarged.
        </p>
      </div>
    </div>

    <!-- Results -->
    <div v-if="jobs.length" class="flex flex-col gap-4 rounded-2xl border bg-background p-5 dark:bg-input/30">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm font-medium">
          <template v-if="done.length">
            {{ originalLabel }} → {{ outputLabel }}
            <span :class="savedFraction >= 0 ? 'text-primary' : 'text-destructive'">
              ({{ savedLabel }} {{ savedFraction >= 0 ? 'smaller' : 'larger' }})
            </span>
          </template>
          <template v-else>
            Working…
          </template>
        </p>
        <div class="flex gap-2">
          <Button v-if="done.length > 1" size="sm" @click="downloadAll">
            Download all
          </Button>
          <Button size="sm" variant="outline" @click="clear">
            <Trash2 class="size-4" /> Clear
          </Button>
        </div>
      </div>

      <ul class="flex flex-col gap-2">
        <li
          v-for="job in jobs"
          :key="job.id"
          class="flex items-center gap-3 rounded-xl border px-3 py-2"
        >
          <img
            v-if="job.result"
            :src="job.result.url"
            :alt="`Preview of ${job.name}`"
            class="size-12 shrink-0 rounded-lg border object-cover"
            loading="lazy"
          >
          <span v-else class="size-12 shrink-0 animate-pulse rounded-lg bg-muted" aria-hidden="true" />

          <span class="min-w-0 grow">
            <span class="block truncate text-sm font-medium">{{ nameFor(job) }}</span>
            <span class="block text-xs tabular-nums text-muted-foreground">
              <template v-if="job.status === 'done' && job.result">
                {{ formatBytes(job.originalSize) }} → {{ formatBytes(job.result.size) }}
                · {{ job.result.width }}×{{ job.result.height }}
              </template>
              <template v-else-if="job.status === 'failed'">
                <span class="text-destructive">{{ job.error }}</span>
              </template>
              <template v-else>
                {{ formatBytes(job.originalSize) }} · working…
              </template>
            </span>
          </span>

          <Button
            v-if="job.result"
            as-child
            size="sm"
            variant="outline"
          >
            <a :href="job.result.url" :download="nameFor(job)">Save</a>
          </Button>
          <button
            type="button"
            class="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :aria-label="`Remove ${job.name}`"
            @click="remove(job.id)"
          >
            <X class="size-4" />
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
