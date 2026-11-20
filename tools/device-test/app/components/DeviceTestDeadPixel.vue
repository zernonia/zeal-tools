<script setup lang="ts">
import { ChevronLeft, ChevronRight, Maximize, TriangleAlert, X } from 'lucide-vue-next'
import { actionForKey, AUTO_INTERVALS, clampInterval, nextScreen, previousScreen, SCREENS } from '../../core'

const { track } = useAnalytics()

const active = ref(false)
const index = ref(0)
const hintVisible = ref(true)
/** Milliseconds between automatic changes; 0 is off, and off is the default. */
const auto = ref(0)
const fallback = ref(false)
const announcement = ref('')

const stage = ref<HTMLElement | null>(null)
const startButton = ref<{ $el: HTMLElement } | null>(null)

const screen = computed(() => SCREENS[index.value]!)

let hideTimer = 0
let autoTimer = 0
let tracked = false

type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void }
type FullscreenDocument = Document & { webkitFullscreenElement?: Element | null, webkitExitFullscreen?: () => Promise<void> | void }

function fullscreenElement() {
  const doc = document as FullscreenDocument
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null
}

function scheduleHide() {
  clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => { hintVisible.value = false }, 4000)
}

function showHint() {
  hintVisible.value = true
  scheduleHide()
}

function go(to: number) {
  index.value = to
  announcement.value = `${screen.value.name}. ${screen.value.hint}`
  // Coming back round to the first screen is the moment someone on a phone
  // needs the way out, so the controls come back with it.
  if (to === 0)
    showHint()
}

function next() {
  go(nextScreen(index.value))
}

function previous() {
  go(previousScreen(index.value))
}

function start(at = 0) {
  index.value = at
  active.value = true
  hintVisible.value = true
  announcement.value = `${screen.value.name}. ${screen.value.hint}`
  const el = stage.value as FullscreenElement | null
  // Requested synchronously, inside the click, which is what the browser
  // requires. iPhone Safari has no element full screen at all, so there the
  // test fills the window instead.
  const request = el?.requestFullscreen?.bind(el) ?? el?.webkitRequestFullscreen?.bind(el)
  fallback.value = !request
  if (request) {
    Promise.resolve(request()).catch(() => { fallback.value = true })
  }
  nextTick(() => stage.value?.focus())
  scheduleHide()
  restartAuto()
  if (!tracked) {
    tracked = true
    track('tool_completed', { tool: 'device-test', format: 'dead-pixel' })
  }
}

function exit() {
  if (!active.value)
    return
  active.value = false
  clearTimeout(hideTimer)
  clearInterval(autoTimer)
  if (fullscreenElement()) {
    const doc = document as FullscreenDocument
    void (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.())
  }
  nextTick(() => startButton.value?.$el?.focus())
}

function restartAuto() {
  clearInterval(autoTimer)
  if (active.value && auto.value > 0)
    autoTimer = window.setInterval(next, clampInterval(auto.value))
}
watch(auto, restartAuto)

function onKeydown(event: KeyboardEvent) {
  if (!active.value)
    return
  // Space and Enter on a focused control press that control instead.
  const onControl = (event.target as HTMLElement | null)?.closest?.('button')
  if (onControl && (event.code === 'Space' || event.code === 'Enter'))
    return
  const action = actionForKey(event.code)
  if (!action)
    return
  event.preventDefault()
  event.stopPropagation()
  if (action === 'next')
    next()
  else if (action === 'previous')
    previous()
  else if (action === 'exit')
    exit()
  else if (hintVisible.value)
    hintVisible.value = false
  else
    showHint()
}

// When the controls hide, focus must not be left on a button that is gone.
watch(hintVisible, (visible) => {
  if (!visible && active.value)
    stage.value?.focus()
})

function onStageClick(event: MouseEvent) {
  if (event.target === stage.value)
    next()
}

function onPointerMove(event: PointerEvent) {
  if (event.pointerType === 'mouse' && (event.movementX || event.movementY))
    showHint()
}

// The browser's own Escape (or a swipe on Android) leaves full screen without
// telling us through a key event; follow it out.
function onFullscreenChange() {
  if (active.value && !fallback.value && !fullscreenElement())
    exit()
}

// On the document, not the stage: keys must still work whichever element in
// the test has focus, including none.
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('webkitfullscreenchange', onFullscreenChange)
})
onScopeDispose(() => {
  clearTimeout(hideTimer)
  clearInterval(autoTimer)
  if (import.meta.client) {
    document.removeEventListener('keydown', onKeydown)
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
  }
})

const autoLabel = computed(() => (auto.value ? `Every ${auto.value / 1000} seconds` : 'Off — change by hand'))
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <section class="flex flex-col gap-5 rounded-2xl border bg-background p-5 dark:bg-input/30 sm:p-6">
      <div class="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm" role="note">
        <TriangleAlert class="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
        <p>
          <strong class="font-semibold">Photosensitivity warning.</strong>
          This test fills the screen with bright, solid colours. It only changes when you press a key or tap,
          unless you turn on auto-advance — and then never faster than once every two seconds. If you are
          sensitive to flashing light, keep auto-advance off and step through slowly.
        </p>
      </div>

      <div>
        <h2 class="text-sm font-medium">
          Start on a colour
        </h2>
        <ul class="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
          <li v-for="(s, i) in SCREENS" :key="s.id">
            <button
              type="button"
              class="flex w-full flex-col items-center gap-1.5 rounded-lg p-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              :aria-label="`Start the full-screen test on ${s.name.toLowerCase()}`"
              @click="start(i)"
            >
              <span class="block h-11 w-full rounded-md border border-border" :style="{ background: s.background }" aria-hidden="true" />
              {{ s.name }}
            </button>
          </li>
        </ul>
      </div>

      <div class="flex flex-wrap items-end gap-4">
        <Button ref="startButton" size="lg" @click="start(0)">
          <Maximize class="size-4" /> Start full-screen test
        </Button>
        <div class="flex flex-col gap-1.5">
          <Label for="pixel-auto">Auto-advance</Label>
          <Select :model-value="String(auto)" @update:model-value="v => auto = Number(v)">
            <SelectTrigger id="pixel-auto" class="h-11 w-auto min-w-52">
              {{ autoLabel }}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">
                Off — change by hand
              </SelectItem>
              <SelectItem v-for="ms in AUTO_INTERVALS" :key="ms" :value="String(ms)">
                Every {{ ms / 1000 }} seconds
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p class="text-sm text-muted-foreground">
        In the test: <kbd class="rounded border bg-muted px-1.5 py-0.5 text-xs">→</kbd> or
        <kbd class="rounded border bg-muted px-1.5 py-0.5 text-xs">Space</kbd> for the next colour,
        <kbd class="rounded border bg-muted px-1.5 py-0.5 text-xs">←</kbd> to go back,
        <kbd class="rounded border bg-muted px-1.5 py-0.5 text-xs">H</kbd> to show or hide the tips, and
        <kbd class="rounded border bg-muted px-1.5 py-0.5 text-xs">Esc</kbd> to finish. On a touchscreen, tap
        for the next colour; the controls come back after the last one.
      </p>
    </section>

    <!--
      Always in the DOM, so full screen can be requested on it synchronously
      inside the click — the browser refuses a request that arrives later.
    -->
    <div
      ref="stage"
      role="dialog"
      aria-modal="true"
      aria-label="Dead pixel test"
      tabindex="-1"
      class="outline-none"
      :class="[active ? 'fixed inset-0 z-[100] flex items-end justify-center p-4' : 'hidden', hintVisible ? '' : 'cursor-none']"
      :style="{ background: screen.background }"
      @click="onStageClick"
      @pointermove="onPointerMove"
    >
      <p class="sr-only" aria-live="polite">
        {{ active ? announcement : '' }}
      </p>
      <div
        v-if="active && hintVisible"
        class="flex max-w-xl flex-col gap-3 rounded-2xl border bg-card p-4 text-card-foreground shadow-lg"
      >
        <div>
          <p class="font-medium">
            {{ screen.name }} <span class="text-sm font-normal text-muted-foreground">· {{ index + 1 }} of {{ SCREENS.length }}</span>
          </p>
          <p class="mt-0.5 text-sm text-muted-foreground">
            {{ screen.hint }}
          </p>
          <p v-if="fallback" class="mt-1 text-xs text-muted-foreground">
            Full screen is not available here, so the test fills the window. Rotate or scroll to hide the browser bars.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" class="h-11" @click="previous">
            <ChevronLeft class="size-4" /> Previous
          </Button>
          <Button variant="outline" class="h-11" @click="next">
            Next <ChevronRight class="size-4" />
          </Button>
          <Button variant="ghost" class="h-11" @click="hintVisible = false">
            Hide tips
          </Button>
          <Button class="h-11" @click="exit">
            <X class="size-4" /> Exit
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
