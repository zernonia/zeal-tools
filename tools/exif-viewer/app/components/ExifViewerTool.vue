<script setup lang="ts">
import { Download, ImageUp, MapPin, ShieldCheck, X } from 'lucide-vue-next'
import { useExifViewer } from '../composables/useExifViewer'

const {
  name,
  size,
  previewUrl,
  cleanUrl,
  cleanName,
  removed,
  loaded,
  error,
  sensitive,
  technical,
  hasMetadata,
  canStrip,
  mapUrl,
  embedUrl,
  mapShown,
  load,
  reset,
  formatBytes,
} = useExifViewer()

const dragging = ref(false)
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ loaded ? (hasMetadata ? `${sensitive.length} identifying details found in ${name}.` : `No metadata found in ${name}.`) : '' }}
    </p>

    <div
      v-if="!loaded"
      class="flex grow rounded-2xl border border-dashed transition-colors"
      :class="dragging ? 'border-primary bg-muted/40' : 'border-border'"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="dragging = false; load($event.dataTransfer?.files?.[0])"
    >
      <input
        id="exif-file"
        type="file"
        class="sr-only"
        accept="image/jpeg,image/png"
        @change="load(($event.target as HTMLInputElement).files?.[0])"
      >
      <label for="exif-file" class="flex min-h-40 grow cursor-pointer flex-col items-center justify-center gap-2 px-6 py-8 text-center">
        <ImageUp class="size-7 text-muted-foreground" />
        <span class="font-medium">Drop a photo here, or choose a file</span>
        <span class="text-sm text-muted-foreground">
          JPEG or PNG — it is read in your browser and never uploaded
        </span>
      </label>
    </div>

    <p v-if="error" class="text-sm text-destructive">
      {{ error }}
    </p>

    <template v-if="loaded">
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3 dark:bg-input/30">
        <div class="flex min-w-0 items-center gap-3">
          <img :src="previewUrl" :alt="`Preview of ${name}`" class="size-12 shrink-0 rounded-lg border object-cover">
          <span class="min-w-0">
            <span class="block truncate font-medium">{{ name }}</span>
            <span class="block text-xs text-muted-foreground">{{ formatBytes(size) }}</span>
          </span>
        </div>
        <Button variant="outline" size="sm" @click="reset">
          <X class="size-4" /> Choose another
        </Button>
      </div>

      <!-- What the photo gives away -->
      <div v-if="sensitive.length" class="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <h2 class="flex items-center gap-2 text-sm font-semibold">
          <MapPin class="size-4 text-destructive" />
          What this photo reveals
        </h2>
        <dl class="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <div v-for="tag in sensitive" :key="tag.label" class="flex justify-between gap-4 border-b border-border/60 py-1.5 text-sm">
            <dt class="text-muted-foreground">
              {{ tag.label }}
            </dt>
            <dd class="text-right font-medium">
              {{ tag.value }}
            </dd>
          </div>
        </dl>
        <!--
          Not loaded until asked. Requesting tiles hands these coordinates to
          OpenStreetMap, and that is precisely the secret the visitor came here
          to find — so the cost is stated and the choice is theirs.
        -->
        <div v-if="embedUrl" class="mt-4">
          <template v-if="!mapShown">
            <Button size="sm" variant="outline" @click="mapShown = true">
              <MapPin class="size-4" /> Show this on a map
            </Button>
            <p class="mt-2 text-xs text-muted-foreground">
              This is the one thing here that reaches the internet: loading the map tells OpenStreetMap
              these coordinates. Your photo still never leaves your device.
            </p>
          </template>
          <template v-else>
            <iframe
              :src="embedUrl"
              title="Map of where this photo was taken"
              class="h-64 w-full rounded-xl border"
              loading="lazy"
              referrerpolicy="no-referrer"
            />
            <a
              :href="mapUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-2 inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
            >
              <MapPin class="size-4" /> Open the full map
            </a>
          </template>
        </div>
      </div>

      <div v-else class="flex items-center gap-3 rounded-2xl border bg-background p-5 dark:bg-input/30">
        <ShieldCheck class="size-5 shrink-0 text-primary" />
        <p class="text-sm">
          <span class="font-medium">No identifying metadata found.</span>
          <span class="text-muted-foreground"> This photo carries no camera, timestamp or location details.</span>
        </p>
      </div>

      <!-- Everything else -->
      <div v-if="technical.length" class="rounded-2xl border bg-background p-5 dark:bg-input/30">
        <h2 class="text-sm font-semibold">
          Camera settings
        </h2>
        <dl class="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <div v-for="tag in technical" :key="tag.label" class="flex justify-between gap-4 border-b border-border/60 py-1.5 text-sm">
            <dt class="text-muted-foreground">
              {{ tag.label }}
            </dt>
            <dd class="text-right font-medium">
              {{ tag.value }}
            </dd>
          </div>
        </dl>
      </div>

      <!-- Removal -->
      <div class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-background p-5 dark:bg-input/30">
        <div class="min-w-0">
          <p class="text-sm font-medium">
            Download without the metadata
          </p>
          <p class="mt-1 text-sm text-muted-foreground">
            <template v-if="!canStrip">
              Only JPEG and PNG can be cleaned this way.
            </template>
            <template v-else-if="removed > 0">
              Removes {{ formatBytes(removed) }} of metadata. The image itself is copied across untouched —
              not a single pixel is re-encoded.
            </template>
            <template v-else>
              There is nothing to remove: this file already carries no metadata.
            </template>
          </p>
        </div>
        <Button v-if="canStrip && removed > 0" as-child>
          <a :href="cleanUrl" :download="cleanName">
            <Download class="size-4" /> Save clean copy
          </a>
        </Button>
      </div>
    </template>
  </div>
</template>
