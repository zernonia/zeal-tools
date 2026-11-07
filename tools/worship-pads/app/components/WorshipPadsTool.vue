<script setup lang="ts">
import { Maximize2, Minimize2, Play, Square, Volume1, Volume2 } from 'lucide-vue-next'

const { keys, activeKey, lastKey, major, fadeSeconds, volume, supported, play, stop, resume } = useWorshipPads()
const { track } = useAnalytics()

watch(activeKey, (key) => {
  if (key)
    track('tool_completed', { tool: 'worship-pads', format: 'audio' })
})

const quality = computed(() => (major.value ? 'major' : 'minor'))
const announcement = computed(() =>
  activeKey.value ? `Pad playing in ${activeKey.value} ${quality.value}` : 'Pads stopped',
)

/**
 * Every key has a colour, walking the hue wheel as the keys walk the
 * semitones. It is decoration only — never the sole carrier of meaning — and
 * the text that sits on it is checked against the darkest end of the key.
 */
function hueFor(angle: number) {
  return angle + 30
}

/**
 * The hue the stage is heading for, unwrapped so a step from B to C turns 30
 * degrees forward instead of sweeping 330 back through every other colour.
 * CSS interpolates it over the crossfade, so the colour moves with the sound.
 * Shared state so the page around the tool can pick up the same colour.
 */
const hue = useState('worship-pads-hue', () => 30)
watch(activeKey, (key) => {
  const pad = keys.value.find(candidate => candidate.key === key)
  if (!pad)
    return
  const delta = ((((hueFor(pad.angle) - hue.value) % 360) + 540) % 360) - 180
  hue.value += delta
})

const FADE_PRESETS = [
  { label: 'Quick', seconds: 2 },
  { label: 'Smooth', seconds: 4 },
  { label: 'Seamless', seconds: 8 },
] as const

// ------------------------------------------------------------- stage mode

const stage = ref<HTMLElement | null>(null)
const fullscreenAvailable = ref(false)
const fullscreen = ref(false)

function onFullscreenChange() {
  fullscreen.value = document.fullscreenElement === stage.value
}

async function toggleFullscreen() {
  if (document.fullscreenElement)
    await document.exitFullscreen().catch(() => {})
  else
    await stage.value?.requestFullscreen?.().catch(() => {})
}

onMounted(() => {
  fullscreenAvailable.value = Boolean(document.fullscreenEnabled)
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})

const sectionClass = 'space-y-4 rounded-2xl border border-border p-5'
const sectionTitleClass = 'text-sm font-semibold'
</script>

<template>
  <!--
    The key's colour and the fade length are set here, at the root, so the
    stage and the Sound panel below it change colour together.
  -->
  <div
    class="pad-tool tool-frame space-y-5"
    :class="{ 'is-playing': activeKey }"
    :style="{ '--pad-hue': hue, '--pad-fade': `${fadeSeconds}s` }"
  >
    <p v-if="!supported" class="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
      This browser does not support the Web Audio API, so the pads cannot play here. Any current version of
      Chrome, Firefox, Safari or Edge will work.
    </p>

    <!--
        Night in dark mode, warm daylight in light: every surface and ink on
        the stage is a --pad-* variable, so the two are one design. Everything that changes with the key —
        beam, colour, the lit key, the name — moves over the crossfade length,
        so the light arrives exactly as the sound does.
      -->
    <section
      ref="stage"
      class="pad-stage relative isolate flex flex-col justify-between overflow-hidden rounded-3xl text-(color:--pad-fg)"
      aria-label="Pad keys"
    >
      <div class="pad-haze" aria-hidden="true">
        <i />
      </div>

      <div class="pad-beams" aria-hidden="true">
        <div
          v-for="pad in keys"
          :key="pad.key"
          class="pad-beam"
          :class="{ 'is-on': activeKey === pad.key }"
          :style="{ 'left': `${pad.center * 100}%`, '--key-hue': hueFor(pad.angle) }"
        >
          <i />
        </div>
      </div>

      <div class="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-[10px] font-medium tracking-[0.16em] text-(color:--pad-fg-muted) uppercase">
            {{ activeKey ? `${quality} pad` : 'tap a key' }}
          </p>
          <div class="pad-name relative h-14 min-w-28 sm:h-20">
            <Transition name="pad-name">
              <p :key="activeKey ? `${activeKey}-${quality}` : 'idle'" class="absolute top-0 left-0 font-sans text-6xl leading-none font-bold tracking-tighter sm:text-7xl" :class="activeKey ? '' : 'text-(color:--pad-fg-faint)'">
                {{ activeKey ?? '—' }}<span v-if="activeKey && !major">m</span>
              </p>
            </Transition>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="inline-flex rounded-full bg-(color:--pad-chip) p-1" role="group" aria-label="Chord quality">
            <button
              v-for="option in [{ label: 'Major', value: true }, { label: 'Minor', value: false }]"
              :key="option.label"
              type="button"
              class="min-h-10 rounded-full px-4 text-sm font-medium transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(color:--pad-fg)"
              :class="major === option.value ? 'bg-(color:--pad-solid) text-(color:--pad-solid-fg)' : 'text-(color:--pad-fg-muted) hover:text-(color:--pad-fg)'"
              :aria-pressed="major === option.value"
              @click="major = option.value"
            >
              {{ option.label }}
            </button>
          </div>
          <button
            type="button"
            class="pad-transport grid size-12 place-items-center rounded-full bg-(color:--pad-solid) text-(color:--pad-solid-fg) transition-[scale] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(color:--pad-fg) active:scale-95"
            :aria-label="activeKey ? 'Stop the pad' : `Play ${lastKey ?? keys[0].key} ${quality} pad`"
            @click="activeKey ? stop() : resume()"
          >
            <Square v-if="activeKey" class="size-4.5 fill-current" />
            <Play v-else class="ml-0.5 size-5 fill-current" />
          </button>
          <button
            type="button"
            class="grid size-11 place-items-center rounded-full text-(color:--pad-fg-muted) transition-colors hover:bg-(color:--pad-chip) hover:text-(color:--pad-fg) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(color:--pad-fg)"
            :class="fullscreenAvailable ? '' : 'invisible'"
            :aria-label="fullscreen ? 'Leave stage mode' : 'Stage mode — fill the screen'"
            @click="toggleFullscreen"
          >
            <Minimize2 v-if="fullscreen" class="size-4" />
            <Maximize2 v-else class="size-4" />
          </button>
        </div>
      </div>

      <div class="pad-bottom">
        <!--
            One octave, chromatic in the DOM so Tab walks up a semitone at a
            time. Black keys are positioned over the white ones, which keeps
            them out of the flex row without changing the reading order.
          -->
        <div class="pad-piano relative flex gap-0.5">
          <button
            v-for="pad in keys"
            :key="pad.key"
            type="button"
            class="pad-key focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(color:--pad-fg)"
            :class="[pad.black ? 'is-black' : 'is-white', { 'is-active': activeKey === pad.key }]"
            :style="{ '--key-hue': hueFor(pad.angle), ...(pad.black ? { left: `${pad.center * 100}%` } : {}) }"
            :aria-pressed="activeKey === pad.key"
            @click="play(pad.key)"
          >
            <!--
                The name comes from content, not aria-label: an aria-label that
                does not contain the visible "C1" fails WCAG 2.5.3.
              -->
            <span>{{ pad.key }}</span><span class="sr-only"> {{ quality }} pad, shortcut </span>
            <kbd>{{ pad.shortcut }}</kbd>
          </button>
        </div>
        <p class="pad-caption">
          <span>Press a key&rsquo;s shortcut to switch — the next is a semitone up</span>
          <span>Space stops</span>
          <span>Media keys work in the background</span>
        </p>
      </div>
    </section>

    <section class="pad-accent" :class="sectionClass" aria-label="Sound">
      <h2 :class="sectionTitleClass">
        Sound
      </h2>
      <div class="grid gap-6 sm:grid-cols-2">
        <div class="space-y-3">
          <div class="flex items-baseline justify-between gap-2">
            <Label for="pad-fade" class="mb-0">Crossfade</Label>
            <span class="font-mono text-xs text-muted-foreground tabular-nums">{{ fadeSeconds }}s</span>
          </div>
          <div class="flex flex-wrap gap-1.5" role="group" aria-label="Crossfade presets">
            <button
              v-for="preset in FADE_PRESETS"
              :key="preset.label"
              type="button"
              class="min-h-11 rounded-full border px-4 text-xs font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              :class="fadeSeconds === preset.seconds
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input text-muted-foreground hover:text-foreground dark:bg-input/30'"
              :aria-pressed="fadeSeconds === preset.seconds"
              @click="fadeSeconds = preset.seconds"
            >
              {{ preset.label }} · {{ preset.seconds }}s
            </button>
          </div>
          <Slider
            id="pad-fade"
            :model-value="[fadeSeconds]"
            :min="0.5"
            :max="12"
            :step="0.5"
            aria-label="Crossfade length in seconds"
            @update:model-value="value => fadeSeconds = value?.[0] ?? 4"
          />
          <p class="text-xs text-muted-foreground">
            How long one key takes to become the next. Longer hides the seam better.
          </p>
        </div>
        <div class="space-y-3">
          <div class="flex items-baseline justify-between gap-2">
            <Label for="pad-volume" class="mb-0">Volume</Label>
            <span class="font-mono text-xs text-muted-foreground tabular-nums">{{ Math.round(volume * 100) }}%</span>
          </div>
          <div class="flex items-center gap-3">
            <Volume1 class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Slider
              id="pad-volume"
              :model-value="[volume]"
              :min="0"
              :max="1"
              :step="0.05"
              aria-label="Pad volume"
              @update:model-value="value => volume = value?.[0] ?? 0.6"
            />
            <Volume2 class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </div>
          <p class="text-xs text-muted-foreground">
            Set the level here and leave your system volume alone. Both settings are remembered on this device.
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
/* Registered so CSS can interpolate it: the stage's colour then changes over
   exactly the crossfade, in step with the sound. */
@property --pad-hue {
  syntax: '<number>';
  inherits: true;
  initial-value: 30;
}

/* 0 when silent, 1 when sounding — eased, so colour comes and goes with the
   pad instead of switching on. */
@property --pad-on {
  syntax: '<number>';
  inherits: true;
  initial-value: 0;
}

.pad-tool {
  /* One easing for everything that follows the key. Sine in-out has no
     corners, so nothing visibly starts or stops. */
  --pad-ease: cubic-bezier(0.37, 0, 0.63, 1);
  /* The theme's own primary, kept so the accent can blend back to it. */
  --pad-base: var(--primary);

  transition:
    --pad-hue var(--pad-fade) var(--pad-ease),
    --pad-on var(--pad-fade) var(--pad-ease);
}

.pad-tool.is-playing {
  --pad-on: 1;
}

/* The Sound panel takes the playing key's colour: redefining `primary` here
   recolours the slider fills and the selected preset without touching the
   shared components. Darker in light mode and lighter in dark, so the
   primary-foreground text on the chip keeps its contrast in both. */
.pad-accent {
  --pad-tint: oklch(0.5 0.15 var(--pad-hue));
  --primary: color-mix(in oklch, var(--pad-tint) calc(var(--pad-on) * 100%), var(--pad-base));
}

:global(.dark .pad-accent) {
  --pad-tint: oklch(0.8 0.12 var(--pad-hue));
}

.pad-stage {
  /* The light's own slow breath, independent of the crossfade. */
  --pad-breath: 4s;
  --pad-inset: 1rem;
  --pad-piano: 8rem;
  /* Slender keys: the octave stops widening long before the card does. */
  --pad-piano-width: 100%;
  --pad-caption: 2.75rem;

  /* Daylight: warm paper, ivory keys and pastel light, like sun through
     stained glass — a dark-mode glow would only read as a smudge here. */
  --pad-surface: oklch(0.975 0.006 75);
  --pad-rim: oklch(0.9 0.008 70);
  --pad-fg: oklch(0.22 0.006 50);
  --pad-fg-muted: oklch(0.43 0.008 55);
  --pad-fg-faint: oklch(0.22 0.006 50 / 0.22);
  --pad-chip: oklch(0.22 0.006 50 / 0.06);
  --pad-solid: oklch(0.22 0.006 50);
  --pad-solid-fg: #fff;
  --pad-key-top: #fff;
  --pad-key-bottom: oklch(0.965 0.005 75);
  --pad-key-edge: oklch(0.88 0.007 70);
  --pad-key-fg: oklch(0.36 0.008 55);
  --pad-key-kbd: oklch(0.5 0.008 55);
  --pad-key-shadow: 0 2px 3px -1px oklch(0.3 0.01 60 / 0.12);
  --pad-black-top: oklch(0.31 0.007 50);
  --pad-black-bottom: oklch(0.22 0.006 50);
  --pad-black-edge: oklch(0.2 0.006 50);
  --pad-hover: brightness(0.96);
  --pad-black-hover: brightness(1.3);
  /* Lightness, chroma, alpha: the hue belongs to each beam, not the stage. */
  --pad-beam-l: 0.85;
  --pad-beam-c: 0.13;
  --pad-beam-a: 0.95;
  --pad-haze: oklch(0.92 0.06 var(--pad-hue) / 0.8);
  --pad-glow-alpha: 0.35;

  height: 29rem;
  padding: var(--pad-inset);
  background: var(--pad-surface);
  box-shadow: inset 0 0 0 1px var(--pad-rim);
}

/* Night, but the site's warm stone night rather than a cold blue-black. */
:global(.dark .pad-stage) {
  --pad-surface: oklch(0.13 0.005 49);
  --pad-rim: transparent;
  --pad-fg: #fff;
  --pad-fg-muted: rgb(255 255 255 / 0.72);
  --pad-fg-faint: rgb(255 255 255 / 0.3);
  --pad-chip: rgb(255 255 255 / 0.1);
  --pad-solid: #fff;
  --pad-solid-fg: #000;
  --pad-key-top: oklch(0.21 0.006 50);
  --pad-key-bottom: oklch(0.175 0.005 50);
  --pad-key-edge: oklch(0.28 0.007 50);
  --pad-key-fg: #e7e5e4;
  --pad-key-kbd: #a8a29e;
  --pad-key-shadow: none;
  --pad-black-top: oklch(0.09 0.004 50);
  --pad-black-bottom: oklch(0.09 0.004 50);
  --pad-black-edge: oklch(0.28 0.007 50);
  --pad-hover: brightness(1.35);
  --pad-black-hover: brightness(1.35);
  --pad-beam-l: 0.76;
  --pad-beam-c: 0.17;
  --pad-beam-a: 0.95;
  --pad-haze: oklch(0.6 0.15 var(--pad-hue) / 0.45);
  --pad-glow-alpha: 1;
}

@media (min-width: 640px) {
  .pad-stage {
    --pad-inset: 1.5rem;
    --pad-piano: 8.5rem;
    --pad-piano-width: 34rem;
    --pad-caption: 2.25rem;

    height: 31rem;
  }
}

/* Stage mode: the organ takes the screen, for a laptop on a dark platform. */
.pad-stage:fullscreen {
  --pad-piano: 14rem;
  --pad-piano-width: min(100%, 60rem);

  height: 100vh;
  border-radius: 0;
}

/* Every animation runs all the time, in phase. Lighting a key only changes
   opacities and sizes, which transition; nothing starts, stops or swaps an
   animation, so nothing can snap. */
@keyframes pad-breathe {
  0%,
  100% {
    scale: 1 0.92;
    opacity: 0.8;
  }
  50% {
    scale: 1 1.03;
    opacity: 1;
  }
}

/* Breathes the shadow, not the opacity: an animated opacity would override
   the one that switches the glow off, lighting every key at once. */
@keyframes pad-glow {
  0%,
  100% {
    box-shadow: 0 -8px 30px oklch(0.72 0.17 var(--key-hue) / calc(0.55 * var(--pad-glow-alpha)));
  }
  50% {
    box-shadow: 0 -14px 48px oklch(0.72 0.17 var(--key-hue) / calc(0.9 * var(--pad-glow-alpha)));
  }
}

@keyframes pad-pulse {
  0%,
  100% {
    opacity: 0.65;
  }
  50% {
    opacity: 1;
  }
}

.pad-haze {
  position: absolute;
  inset: 0 0 40%;
  z-index: -1;
  opacity: 0;
  transition: opacity var(--pad-fade) var(--pad-ease);
}

.is-playing .pad-haze {
  opacity: 1;
}

.pad-haze i {
  position: absolute;
  inset: 0;
  background: radial-gradient(70% 60% at 50% 0%, var(--pad-haze), transparent);
  animation: pad-pulse var(--pad-breath) ease-in-out infinite;
}

/* Each key owns a beam of light. On a change the old one sinks while the new
   one rises — the crossfade, made visible. */
.pad-beams {
  position: absolute;
  top: 0;
  bottom: calc(var(--pad-piano) + var(--pad-caption) + var(--pad-inset));
  left: 50%;
  width: min(var(--pad-piano-width), 100% - 2 * var(--pad-inset));
  translate: -50% 0;
  z-index: -1;
  filter: blur(16px);
  pointer-events: none;
}

.pad-beam {
  position: absolute;
  bottom: 0;
  width: 7%;
  height: 8%;
  translate: -50% 0;
  opacity: 0.28;
  transition:
    height var(--pad-fade) var(--pad-ease),
    width var(--pad-fade) var(--pad-ease),
    opacity var(--pad-fade) var(--pad-ease);
}

.pad-beam.is-on {
  width: 20%;
  height: 115%;
  opacity: 1;
}

.pad-beam i {
  position: absolute;
  inset: 0;
  border-radius: 50% 50% 0 0;
  transform-origin: 50% 100%;
  background: linear-gradient(transparent, oklch(var(--pad-beam-l) var(--pad-beam-c) var(--key-hue) / var(--pad-beam-a)));
  animation: pad-breathe var(--pad-breath) ease-in-out infinite;
}

.pad-piano {
  width: min(var(--pad-piano-width), 100%);
  height: var(--pad-piano);
  margin-inline: auto;
}

.pad-caption {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: center;
  gap: 0.25rem 1rem;
  height: var(--pad-caption);
  padding-top: 0.75rem;
  overflow: hidden;
  color: var(--pad-fg-muted);
  font-size: 11px;
  line-height: 1.3;
  text-align: center;
}

.pad-key {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  cursor: pointer;
  font-weight: 650;
  transition:
    color var(--pad-fade) var(--pad-ease),
    filter 0.2s ease,
    translate 0.15s ease;
}

.pad-key > * {
  position: relative;
  z-index: 1;
}

.pad-key kbd {
  border: 1px solid currentColor;
  border-radius: 4px;
  padding: 0 4px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  line-height: 1.4;
}

.pad-key.is-white {
  flex: 1;
  gap: 4px;
  padding-bottom: 9px;
  border: 1px solid var(--pad-key-edge);
  border-radius: 0 0 8px 8px;
  background: linear-gradient(var(--pad-key-top), var(--pad-key-bottom));
  box-shadow: var(--pad-key-shadow);
  color: var(--pad-key-fg);
  font-size: 12px;
}

.pad-key.is-white kbd {
  color: var(--pad-key-kbd);
}

/* At least a fingertip wide, even when that overlaps the white keys more
   than a real piano would — the white keys keep their full lower half. */
.pad-key.is-black {
  position: absolute;
  top: 0;
  z-index: 3;
  width: max(9%, 2.75rem);
  height: 60%;
  translate: -50% 0;
  gap: 3px;
  padding-bottom: 7px;
  border: 1px solid var(--pad-black-edge);
  border-radius: 0 0 6px 6px;
  background: linear-gradient(var(--pad-black-top), var(--pad-black-bottom));
  color: #d6d3d1;
  font-size: 10px;
}

.pad-key.is-black kbd {
  color: #a8a29e;
}

.pad-key.is-white:hover:not(.is-active) {
  filter: var(--pad-hover);
}

.pad-key.is-black:hover:not(.is-active) {
  filter: var(--pad-black-hover);
}

.pad-key.is-white:active {
  translate: 0 2px;
}

.pad-key.is-black:active {
  translate: -50% 2px;
}

/* The lit face and its glow are layers whose opacity fades — a gradient
   background cannot transition, and would snap on. Lit text sits at the
   dark end of the face, where white keeps its contrast. */
.pad-key::before,
.pad-key::after {
  content: '';
  position: absolute;
  border-radius: inherit;
  opacity: 0;
  transition: opacity var(--pad-fade) var(--pad-ease);
}

.pad-key::before {
  inset: -1px;
  background: linear-gradient(oklch(0.62 0.16 var(--key-hue)), oklch(0.4 0.12 var(--key-hue)));
}

.pad-key.is-black::before {
  background: oklch(0.48 0.15 var(--key-hue));
}

.pad-key::after {
  inset: 0;
  z-index: -1;
  box-shadow: 0 -12px 44px oklch(0.72 0.17 var(--key-hue) / calc(0.75 * var(--pad-glow-alpha)));
  animation: pad-glow var(--pad-breath) ease-in-out infinite;
}

.pad-key.is-active {
  color: #fff;
}

.pad-key.is-active kbd {
  color: rgb(255 255 255 / 0.8);
}

.pad-key.is-active::before,
.pad-key.is-active::after {
  opacity: 1;
}

.pad-transport {
  box-shadow: 0 8px 28px -6px oklch(0.7 0.17 var(--pad-hue) / 0);
  transition:
    box-shadow var(--pad-fade) var(--pad-ease),
    scale 0.2s ease;
}

.is-playing .pad-transport {
  box-shadow: 0 8px 28px -6px oklch(0.7 0.17 var(--pad-hue) / 0.9);
}

/* The key name crossfades rather than switching: both names share the spot,
   one blurring out as the other comes in. */
.pad-name-enter-active,
.pad-name-leave-active {
  transition:
    opacity var(--pad-fade) var(--pad-ease),
    filter var(--pad-fade) var(--pad-ease);
}

.pad-name-enter-from,
.pad-name-leave-to {
  opacity: 0;
  filter: blur(8px);
}

/* The global reduced-motion rule shortens durations, which would make an
   infinite breath flicker rather than stop. Hold the light still instead. */
@media (prefers-reduced-motion: reduce) {
  .pad-haze i,
  .pad-beam i,
  .pad-key::after {
    animation: none;
  }
}
</style>
