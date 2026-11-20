<script setup lang="ts">
import type { Input, Letter, LetterStatus, TestState } from '../../core'
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

let observer: ResizeObserver | null = null
onMounted(() => {
  observer = new ResizeObserver(() => scroll())
  if (inner.value)
    observer.observe(inner.value)
})
onBeforeUnmount(() => observer?.disconnect())

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
      class="typing-window relative h-[7.5rem] overflow-hidden font-mono text-xl leading-[2.5rem] sm:text-2xl"
      aria-hidden="true"
    >
      <div
        ref="inner"
        class="relative flex flex-wrap gap-x-[0.6em] motion-safe:transition-transform motion-safe:duration-150"
        :style="{ transform: `translateY(-${offset}px)` }"
      >
        <span
          v-for="(word, i) in visible"
          :key="i"
          v-memo="[test.typed[i], i === test.index, i < test.index, word, i === test.index && test.startedAt !== null]"
          :data-word="i"
          class="relative whitespace-nowrap rounded-md"
          :class="i === test.index && 'bg-muted px-1 -mx-1'"
        >
          <template v-for="(letter, j) in letters(i)" :key="j">
            <span v-if="i === test.index && j === (test.typed[i] ?? '').length" class="caret" :class="test.startedAt !== null && 'caret-solid'" />
            <span :class="LETTER_CLASS[letter.status]">{{ letter.char }}</span>
          </template>
          <span v-if="i === test.index && (test.typed[i] ?? '').length >= letters(i).length" class="caret" :class="test.startedAt !== null && 'caret-solid'" />
        </span>
      </div>
    </div>

    <p
      v-if="!focused"
      class="pointer-events-none absolute inset-x-0 bottom-0 z-20 mx-auto w-fit rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium shadow-sm"
    >
      {{ test.startedAt === null ? 'Click or tap the words to start typing' : 'Click the words to carry on' }}
    </p>
  </div>
</template>

<style scoped>
/*
 * The caret takes no width of its own, so the letters do not shift as it
 * moves; its bar is drawn just before the next letter.
 */
.caret {
  position: relative;
  display: inline-block;
  width: 0;
  height: 1em;
}

.caret::before {
  content: '';
  position: absolute;
  left: -1px;
  top: 0.05em;
  height: 1.15em;
  width: 2px;
  border-radius: 1px;
  background: var(--primary);
  animation: caret-blink 1s step-end infinite;
}

/* Solid while typing — a blinking caret under moving fingers is noise. */
.caret-solid::before {
  animation: none;
}

@keyframes caret-blink {
  50% {
    opacity: 0;
  }
}

/*
 * The global reduced-motion rule shortens animations to 0.01ms, which for an
 * infinite blink would become a flicker. Turn it off outright instead.
 */
@media (prefers-reduced-motion: reduce) {
  .caret::before {
    animation: none;
  }
}
</style>
