<script setup lang="ts">
import type { Input, Letter, LetterStatus, TestState } from '../../core'
import { MousePointerClick } from 'lucide-vue-next'
import { wordView } from '../../core'

const props = defineProps<{ test: TestState }>()
const emit = defineEmits<{
  input: [event: Input]
  value: [before: string, after: string]
}>()

/**
 * Words rendered ahead of the caret. A two-minute test draws 520 words; there
 * is no reason to build all of them before anyone has typed one.
 */
const AHEAD = 120

const field = ref<HTMLInputElement | null>(null)
const inner = ref<HTMLElement | null>(null)
const focused = ref(false)
const offset = ref(0)

/** What the field held when the test last saw it — the base for the next diff. */
let last = ''

const current = computed(() => props.test.typed[props.test.index] ?? '')
const visible = computed(() => props.test.config.words.slice(0, Math.min(props.test.config.words.length, props.test.index + AHEAD)))

function letters(i: number): Letter[] {
  return wordView(props.test.config.words[i] ?? '', props.test.typed[i] ?? '', i < props.test.index)
}

const LETTER_CLASS: Record<LetterStatus, string> = {
  correct: 'text-foreground',
  // Colour plus a solid underline: the mark survives any colour vision.
  incorrect: 'text-destructive underline decoration-2 underline-offset-[6px]',
  // Typed past the end of the word: struck through, as text to remove.
  extra: 'text-destructive line-through decoration-2',
  // Skipped: a dotted underline where the letters should have been.
  missed: 'text-muted-foreground underline decoration-dotted decoration-2 underline-offset-[6px]',
  pending: 'text-muted-foreground',
}

/** The upcoming words, for the field's description — read on focus, never announced. */
const upcoming = computed(() => {
  const words = props.test.config.words
  const next = words.slice(props.test.index + 1, props.test.index + 6).join(' ')
  return `Current word: ${words[props.test.index] ?? ''}.${next ? ` Then: ${next}.` : ''}`
})

// Keep the field holding exactly the word in progress, so the next change
// the browser reports diffs against what the test believes.
watch(current, (value) => {
  last = value
  if (field.value && field.value.value !== value)
    field.value.value = value
})

function process() {
  const el = field.value
  if (!el)
    return
  const before = last
  last = el.value
  emit('value', before, el.value)
}

function onInput(event: Event) {
  // Mid-composition (an IME, or a phone predicting a word) the value is not
  // final; it arrives whole at compositionend.
  if ((event as InputEvent).isComposing)
    return
  process()
}

/** Keys that would move the field's own cursor away from the end. */
const NAVIGATION = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'])

function onKeydown(event: KeyboardEvent) {
  // The test only ever types at the end of the word. A click on the words or
  // an arrow key could put the field's cursor mid-word, and typing there
  // would rewrite letters behind the caret the test shows.
  const el = field.value
  if (el)
    el.setSelectionRange(el.value.length, el.value.length)
  if (NAVIGATION.has(event.key)) {
    event.preventDefault()
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    return
  }
  // An empty field reports no change on Backspace, so it is sent directly:
  // this is what steps back into a mistyped previous word.
  if (event.key === 'Backspace' && field.value?.value === '') {
    event.preventDefault()
    emit('input', { type: event.ctrlKey || event.altKey || event.metaKey ? 'backspace-word' : 'backspace' })
  }
}

/** Keep the caret's line second from the top once the first line is done. */
function scroll() {
  const container = inner.value
  if (!container)
    return
  const word = container.querySelector<HTMLElement>(`[data-word="${props.test.index}"]`)
  if (!word) {
    offset.value = 0
    return
  }
  const line = word.offsetHeight
  offset.value = Math.max(0, word.offsetTop - line)
}

watch(() => [props.test.index, props.test.config] as const, () => nextTick(scroll))

/*
 * The caret's place, measured from the zero-width anchor the current word
 * renders before the next letter. Both rectangles share the scroll
 * transform, so their difference is the position inside the moving block.
 */
const caret = ref<{ x: number, y: number, height: number } | null>(null)

function place() {
  const container = inner.value
  const anchor = container?.querySelector<HTMLElement>('.caret-anchor')
  if (!container || !anchor) {
    caret.value = null
    return
  }
  const box = container.getBoundingClientRect()
  const at = anchor.getBoundingClientRect()
  caret.value = { x: at.left - box.left - 1, y: at.top - box.top + at.height * 0.05, height: at.height * 1.15 }
}

/** Solid while keys are landing; the blink returns after a short pause. */
const typing = ref(false)
let pause: ReturnType<typeof setTimeout> | undefined

watch(() => [props.test.index, props.test.typed[props.test.index], props.test.config] as const, () => {
  if (props.test.startedAt !== null) {
    typing.value = true
    clearTimeout(pause)
    pause = setTimeout(() => typing.value = false, 600)
  }
  nextTick(place)
})

let observer: ResizeObserver | null = null
onMounted(() => {
  nextTick(place)
  observer = new ResizeObserver(() => {
    scroll()
    place()
  })
  if (inner.value)
    observer.observe(inner.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(pause)
})

function focus() {
  field.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div
    class="relative rounded-xl px-1 outline-offset-4 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-ring"
  >
    <!--
      text-base keeps the field at 16px, below which iOS zooms the page on focus.
      The field that takes the typing. It covers the text and is transparent,
      so a tap on the words focuses it directly — which is what makes a phone
      raise its keyboard — and a keyboard user reaches it with Tab. Paste is
      refused: pasting the words would not be typing them.
    -->
    <input
      ref="field"
      type="text"
      class="absolute inset-0 z-10 size-full cursor-text text-base opacity-0"
      aria-label="Typing test: type the words shown"
      aria-describedby="typing-upcoming"
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
      enterkeyhint="next"
      @input="onInput"
      @compositionend="process"
      @keydown="onKeydown"
      @paste.prevent
      @drop.prevent
      @focus="focused = true"
      @blur="focused = false"
    >
    <p id="typing-upcoming" class="sr-only">
      {{ upcoming }}
    </p>

    <div
      class="typing-window relative h-[7.5rem] overflow-hidden font-mono text-xl leading-[2.5rem] motion-safe:transition-[filter,opacity] motion-safe:duration-200 sm:text-2xl"
      :class="!focused && 'opacity-50 blur-[3px]'"
      aria-hidden="true"
    >
      <div
        ref="inner"
        class="relative flex flex-wrap gap-x-[0.6em] motion-safe:transition-transform motion-safe:duration-150"
        :style="{ transform: `translateY(-${offset}px)` }"
      >
        <!--
          One caret for the whole passage, moved rather than redrawn: it glides
          from letter to letter instead of jumping, and only blinks once the
          typing stops.
        -->
        <span
          v-if="caret"
          class="smooth-caret"
          :class="!typing && 'smooth-caret-idle'"
          :style="{ transform: `translate(${caret.x}px, ${caret.y}px)`, height: `${caret.height}px` }"
        />
        <span
          v-for="(word, i) in visible"
          :key="i"
          v-memo="[test.typed[i], i === test.index, i < test.index, word, i === test.index && test.startedAt !== null]"
          :data-word="i"
          class="relative whitespace-nowrap rounded-md"
          :class="i === test.index && 'bg-muted px-1 -mx-1'"
        >
          <template v-for="(letter, j) in letters(i)" :key="j">
            <span v-if="i === test.index && j === (test.typed[i] ?? '').length" class="caret-anchor" />
            <span :class="LETTER_CLASS[letter.status]">{{ letter.char }}</span>
          </template>
          <span v-if="i === test.index && (test.typed[i] ?? '').length >= letters(i).length" class="caret-anchor" />
        </span>
      </div>
    </div>

    <!-- Over blurred words, centred: it never sits on top of text someone is reading. -->
    <div
      v-if="!focused"
      class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
    >
      <p class="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm">
        <MousePointerClick class="size-4 text-muted-foreground" aria-hidden="true" />
        {{ test.startedAt === null ? 'Click or tap here to start typing' : 'Click here to carry on' }}
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Takes no width, so the letters never shift; it only marks where the caret goes. */
.caret-anchor {
  display: inline-block;
  width: 0;
  height: 1em;
  vertical-align: baseline;
}

.smooth-caret {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  width: 2.5px;
  border-radius: 1px;
  background: var(--primary);
  box-shadow: 0 0 6px 1px color-mix(in oklab, var(--primary) 25%, transparent);
  pointer-events: none;
  will-change: transform;
  transition: transform 200ms cubic-bezier(0.33, 1, 0.68, 1);
}

.smooth-caret-idle {
  animation: caret-fade 1s ease-in-out infinite;
}

@keyframes caret-fade {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

/*
 * The global reduced-motion rule already makes the glide instant. An infinite
 * blink shortened to 0.01ms would flicker, so it is turned off outright.
 */
@media (prefers-reduced-motion: reduce) {
  .smooth-caret-idle {
    animation: none;
  }
}
</style>
