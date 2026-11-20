<script setup lang="ts">
import type { KeyCap, KeyTestState, LayoutId } from '../../core'
import { Keyboard, RotateCcw } from 'lucide-vue-next'
import {
  coverage,
  createKeyTestState,
  describeKey,
  describeLocation,
  keyDown,
  keyUp,
  LAYOUTS,
  releaseAll,
  shouldPreventDefault,
  suggestLayout,
  unmappedCodes,
} from '../../core'

const { track } = useAnalytics()

const layoutId = ref<LayoutId>('ansi')
const layout = computed(() => LAYOUTS[layoutId.value])
const state = shallowRef<KeyTestState>(createKeyTestState())
const focused = ref(false)
const announcement = ref('')
const area = ref<HTMLElement | null>(null)

let isMac = false
let tracked = false

onMounted(() => {
  isMac = /Mac|iPhone|iPad/.test(navigator.platform)
})

const held = computed(() => new Set(state.value.down))

function keyClass(key: KeyCap) {
  if (held.value.has(key.code))
    return 'border-primary bg-primary text-primary-foreground'
  if (state.value.chatter[key.code])
    return 'border-destructive bg-destructive/15 text-foreground'
  if (state.value.presses[key.code])
    return 'border-primary/50 bg-primary/15 text-foreground'
  return 'border-border bg-background text-muted-foreground dark:bg-input/30'
}

function keyStyle(key: KeyCap) {
  const { width, height } = layout.value
  return {
    left: `${(key.x / width) * 100}%`,
    top: `${(key.y / height) * 100}%`,
    width: `${(key.w / width) * 100}%`,
    height: `${(key.h / height) * 100}%`,
  }
}

const stats = computed(() => coverage(state.value, layout.value))
const extras = computed(() => unmappedCodes(state.value, layout.value))
const chattered = computed(() => Object.entries(state.value.chatter).sort((a, b) => b[1] - a[1]))

function onKeydown(event: KeyboardEvent) {
  // Escape hands focus back, so the test can never trap the keyboard.
  if (event.code === 'Escape' || event.key === 'Escape') {
    state.value = keyDown(state.value, pick(event), event.timeStamp)
    area.value?.blur()
    announcement.value = 'Escape pressed. Left the keyboard test.'
    return
  }
  if (shouldPreventDefault(event.code))
    event.preventDefault()
  // Keep site shortcuts such as "/" for search from firing mid-test.
  event.stopPropagation()

  const before = state.value
  state.value = keyDown(state.value, pick(event), event.timeStamp)

  if (!tracked && state.value.total > 0) {
    tracked = true
    track('tool_completed', { tool: 'device-test', format: 'keyboard' })
  }

  const suggested = suggestLayout(event.code)
  if (suggested && suggested !== layoutId.value) {
    layoutId.value = suggested
    announcement.value = 'That key only exists on ISO keyboards, so the layout switched to ISO.'
    return
  }

  if (event.repeat)
    return
  const chatter = state.value.lastChatter
  if (chatter && chatter !== before.lastChatter) {
    announcement.value = `Possible chatter: ${chatter.code} registered twice ${chatter.gap} milliseconds apart.`
    return
  }
  announcement.value = `${describeKey(event.key)}, code ${event.code || 'none'}. ${state.value.down.length} held.`
}

function onKeyup(event: KeyboardEvent) {
  if (shouldPreventDefault(event.code))
    event.preventDefault()
  event.stopPropagation()
  state.value = keyUp(state.value, event.code, { metaSwallowsKeyup: isMac })
}

function pick(event: KeyboardEvent) {
  return { key: event.key, code: event.code, location: event.location, repeat: event.repeat }
}

function onBlur() {
  focused.value = false
  state.value = releaseAll(state.value)
}

function reset() {
  state.value = createKeyTestState()
  announcement.value = 'Results cleared.'
}

function focusArea() {
  area.value?.focus()
}
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ announcement }}
    </p>

    <section class="flex flex-col gap-4 rounded-2xl border bg-background p-4 dark:bg-input/30 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Label for="keyboard-layout" class="mb-0 text-sm text-muted-foreground">Layout</Label>
          <Select v-model="layoutId">
            <SelectTrigger id="keyboard-layout" class="h-11 w-auto min-w-44">
              {{ layout.name }}
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="l in LAYOUTS" :key="l.id" :value="l.id">
                {{ l.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" class="h-11" @click="reset">
          <RotateCcw class="size-4" /> Reset
        </Button>
      </div>

      <!--
        The focusable region is also the scroll container, so a keyboard that
        is wider than a phone can be scrolled without an unreachable region.
      -->
      <div
        id="keyboard-test-area"
        ref="area"
        tabindex="0"
        role="application"
        aria-label="Keyboard test area"
        aria-describedby="keyboard-test-instructions"
        class="relative overflow-x-auto rounded-xl border-2 p-2 outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        :class="focused ? 'border-primary' : 'border-dashed border-border'"
        @keydown="onKeydown"
        @keyup="onKeyup"
        @focus="focused = true"
        @blur="onBlur"
      >
        <div
          class="relative min-w-[680px]"
          :style="{ aspectRatio: `${layout.width} / ${layout.height}` }"
          aria-hidden="true"
        >
          <div
            v-for="key in layout.keys"
            :key="key.code"
            class="absolute p-[2px]"
            :style="keyStyle(key)"
          >
            <div
              class="flex size-full items-center justify-center overflow-hidden rounded-md border text-center text-[10px] font-medium leading-tight sm:text-xs"
              :class="keyClass(key)"
              :data-code="key.code"
            >
              {{ key.label }}
            </div>
          </div>
        </div>
      </div>

      <div id="keyboard-test-instructions" class="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p v-if="focused" class="font-medium text-foreground">
          Testing — press keys. Press <kbd class="rounded border bg-muted px-1.5 py-0.5 text-xs">Esc</kbd> to leave the test area.
        </p>
        <p v-else class="text-muted-foreground">
          Click the keyboard or tab to it, then press keys. Esc leaves it again. Nothing you type is stored or sent.
        </p>
        <Button v-if="!focused" variant="secondary" class="h-11" @click="focusArea">
          <Keyboard class="size-4" /> Start typing
        </Button>
      </div>

      <ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Key colours">
        <li class="flex items-center gap-1.5">
          <span class="size-3 rounded-sm border border-primary bg-primary" aria-hidden="true" /> Held now
        </li>
        <li class="flex items-center gap-1.5">
          <span class="size-3 rounded-sm border border-primary/50 bg-primary/15" aria-hidden="true" /> Worked
        </li>
        <li class="flex items-center gap-1.5">
          <span class="size-3 rounded-sm border border-destructive bg-destructive/15" aria-hidden="true" /> Chatter detected
        </li>
        <li class="flex items-center gap-1.5">
          <span class="size-3 rounded-sm border border-border" aria-hidden="true" /> Not pressed yet
        </li>
      </ul>
    </section>

    <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Keyboard test results">
      <div class="rounded-2xl border bg-background p-4 dark:bg-input/30">
        <h2 class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Last key
        </h2>
        <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt class="text-muted-foreground">
            key
          </dt>
          <dd class="truncate font-mono" data-testid="key-key">
            {{ state.last ? describeKey(state.last.key) : '—' }}
          </dd>
          <dt class="text-muted-foreground">
            code
          </dt>
          <dd class="truncate font-mono" data-testid="key-code">
            {{ state.last?.code || '—' }}
          </dd>
          <dt class="text-muted-foreground">
            location
          </dt>
          <dd class="font-mono">
            {{ state.last ? describeLocation(state.last.location) : '—' }}
          </dd>
          <dt class="text-muted-foreground">
            repeat
          </dt>
          <dd class="font-mono">
            {{ state.last ? (state.last.repeat ? 'yes' : 'no') : '—' }}
          </dd>
        </dl>
      </div>

      <div class="rounded-2xl border bg-background p-4 dark:bg-input/30">
        <h2 class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Rollover
        </h2>
        <p class="mt-2 font-heading text-3xl tabular-nums" data-testid="key-rollover">
          {{ state.down.length }}
          <span class="text-base text-muted-foreground">held · max {{ state.maxRollover }}</span>
        </p>
        <p class="mt-1 truncate font-mono text-xs text-muted-foreground">
          {{ state.down.length ? state.down.join(' + ') : 'Hold several keys at once' }}
        </p>
      </div>

      <div class="rounded-2xl border bg-background p-4 dark:bg-input/30">
        <h2 class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Chatter
        </h2>
        <p v-if="!chattered.length" class="mt-2 text-sm text-muted-foreground">
          None detected. A key that registers twice within 30 ms is flagged here.
        </p>
        <template v-else>
          <ul class="mt-2 space-y-0.5 font-mono text-sm" data-testid="key-chatter">
            <li v-for="[code, count] in chattered" :key="code" class="text-destructive">
              {{ code }} × {{ count }}
            </li>
          </ul>
          <p v-if="state.lastChatter" class="mt-1 text-xs text-muted-foreground">
            Last: {{ state.lastChatter.code }}, {{ state.lastChatter.gap }} ms apart
          </p>
        </template>
      </div>

      <div class="rounded-2xl border bg-background p-4 dark:bg-input/30">
        <h2 class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Coverage
        </h2>
        <p class="mt-2 font-heading text-3xl tabular-nums">
          {{ stats.pressed }}<span class="text-base text-muted-foreground"> / {{ stats.total }} keys</span>
        </p>
        <p class="mt-1 text-xs text-muted-foreground">
          {{ state.total }} presses · {{ state.repeats }} auto-repeats
        </p>
        <p v-if="extras.length" class="mt-1 text-xs text-muted-foreground">
          Not on the drawing: <span class="font-mono">{{ extras.join(', ') }}</span>
        </p>
      </div>
    </section>
  </div>
</template>
