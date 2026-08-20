<script setup lang="ts">
import { Download, ImageUp } from 'lucide-vue-next'
import { useFaviconGenerator } from '../composables/useFaviconGenerator'

const {
  sourceName,
  icons,
  working,
  error,
  siteName,
  background,
  useBackground,
  padding,
  ready,
  snippet,
  includeIos,
  includeAndroid,
  includeMaskable,
  packing,
  load,
  downloadPack,
  formatBytes,
} = useFaviconGenerator()

const dragging = ref(false)
const copied = ref(false)

async function copySnippet() {
  await navigator.clipboard.writeText(snippet.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ working ? 'Rendering icons.' : ready ? `${icons.length} icons ready.` : '' }}
    </p>

    <div
      class="flex rounded-2xl border border-dashed transition-colors"
      :class="[dragging ? 'border-primary bg-muted/40' : 'border-border', ready ? '' : 'grow']"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="dragging = false; load($event.dataTransfer?.files?.[0])"
    >
      <input
        id="favicon-source"
        type="file"
        class="sr-only"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        @change="load(($event.target as HTMLInputElement).files?.[0])"
      >
      <label for="favicon-source" class="flex min-h-32 grow cursor-pointer flex-col items-center justify-center gap-2 px-6 py-7 text-center">
        <ImageUp class="size-7 text-muted-foreground" />
        <span class="font-medium">{{ sourceName || 'Drop a logo here, or choose a file' }}</span>
        <span class="text-sm text-muted-foreground">
          PNG, JPEG, SVG or WebP — square works best, and it never leaves your device
        </span>
      </label>
    </div>

    <p v-if="error" class="text-sm text-destructive">
      {{ error }}
    </p>

    <template v-if="ready">
      <div class="grid gap-5 rounded-2xl border bg-background p-5 dark:bg-input/30 sm:grid-cols-2">
        <div class="flex flex-col gap-2">
          <Label for="site-name">Site name</Label>
          <Input id="site-name" v-model="siteName" placeholder="My site" />
          <p class="text-xs text-muted-foreground">
            Used in <code class="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">site.webmanifest</code>,
            which names the icon on an Android home screen.
          </p>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <Label for="padding">Padding</Label>
            <span class="text-sm tabular-nums text-muted-foreground">{{ padding }}%</span>
          </div>
          <Slider
            id="padding"
            :model-value="[padding]"
            :min="0"
            :max="30"
            :step="1"
            aria-label="Padding around the icon"
            @update:model-value="value => padding = value?.[0] ?? 0"
          />
          <p class="text-xs text-muted-foreground">
            A little breathing room helps a dense logo read at 16 pixels.
          </p>
        </div>

        <div class="flex flex-col gap-2 sm:col-span-2">
          <div class="flex items-center gap-2">
            <Checkbox id="use-bg" v-model="useBackground" />
            <Label for="use-bg">Add a background colour</Label>
          </div>
          <div v-if="useBackground" class="flex items-center gap-2">
            <ColorPicker v-model="background" label="Background colour" />
            <Input v-model="background" aria-label="Background colour hex value" class="max-w-28 font-mono text-xs" />
          </div>
          <p class="text-xs text-muted-foreground">
            iOS draws its home-screen icons on black if the image is transparent, so a background is
            worth adding when your logo has one.
          </p>
        </div>
      </div>

      <div class="rounded-2xl border bg-background p-5 dark:bg-input/30">
        <p class="text-sm font-medium">
          Also include
        </p>
        <div class="mt-3 flex flex-col gap-3">
          <div class="flex items-start gap-2">
            <Checkbox id="inc-ios" v-model="includeIos" class="mt-0.5" />
            <div>
              <Label for="inc-ios">iOS app icons</Label>
              <p class="text-xs text-muted-foreground">
                A full <code class="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">AppIcon.appiconset</code>
                with Contents.json, including the 1024 App Store icon written without an alpha channel —
                Apple rejects builds whose icon has one.
              </p>
            </div>
          </div>
          <div class="flex items-start gap-2">
            <Checkbox id="inc-android" v-model="includeAndroid" class="mt-0.5" />
            <div>
              <Label for="inc-android">Android app icons</Label>
              <p class="text-xs text-muted-foreground">
                Every launcher density, the 512 Play Store icon, and adaptive foreground and background
                layers with your logo kept inside the safe zone the launcher will not crop.
              </p>
            </div>
          </div>
          <div class="flex items-start gap-2">
            <Checkbox id="inc-maskable" v-model="includeMaskable" class="mt-0.5" />
            <div>
              <Label for="inc-maskable">Maskable web icon</Label>
              <p class="text-xs text-muted-foreground">
                For an installed web app, whose launcher may crop the icon to any shape.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border bg-background p-5 dark:bg-input/30">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm font-medium">
            Your icons
          </p>
          <Button size="sm" :disabled="packing" @click="downloadPack">
            <Download class="size-4" /> {{ packing ? 'Packing…' : 'Download pack' }}
          </Button>
        </div>

        <ul class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="icon in icons" :key="icon.size" class="flex items-center gap-3 rounded-xl border px-3 py-2">
            <span class="grid size-12 shrink-0 place-items-center rounded-lg border bg-[repeating-conic-gradient(theme(colors.muted.DEFAULT)_0_25%,transparent_0_50%)] bg-[length:12px_12px]">
              <img
                :src="icon.url"
                :alt="`${icon.size} by ${icon.size} icon`"
                :width="Math.min(icon.size, 40)"
                :height="Math.min(icon.size, 40)"
                class="object-contain"
              >
            </span>
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium">{{ icon.size }}×{{ icon.size }}</span>
              <span class="block truncate text-xs text-muted-foreground">{{ icon.purpose }}</span>
              <span class="block text-xs tabular-nums text-muted-foreground">{{ formatBytes(icon.bytes.length) }}</span>
            </span>
          </li>
        </ul>
      </div>

      <div class="rounded-2xl border bg-background p-5 dark:bg-input/30">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm font-medium">
            Paste this into your <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">&lt;head&gt;</code>
          </p>
          <Button size="sm" variant="outline" @click="copySnippet">
            {{ copied ? 'Copied' : 'Copy' }}
          </Button>
        </div>
        <pre class="mt-3 overflow-x-auto rounded-xl bg-muted/60 p-4 text-xs leading-relaxed"><code>{{ snippet }}</code></pre>
      </div>
    </template>
  </div>
</template>
