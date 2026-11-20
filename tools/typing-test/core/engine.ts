/**
 * The typing test as a pure state machine.
 *
 * Every keystroke is an `Input` applied to a `TestState` at a time `now`
 * (milliseconds on any monotonic clock), returning a new state. Nothing here
 * touches the DOM or a timer, so the whole of a test — including the timing —
 * can be replayed in a unit test from a list of inputs.
 *
 * Two records are kept, because they answer different questions:
 *
 * - `typed` is the text as it stands: what is on screen, after corrections.
 *   The speed and the character counts are read from it.
 * - `log` is every keystroke as it happened, including the ones later
 *   rubbed out. Accuracy is read from it, which is why fixing a mistake does
 *   not erase it — you still made it, and it still cost you time.
 */

export type TestMode = 'time' | 'words'

export interface TestConfig {
  mode: TestMode
  /** Seconds, for a timed test. */
  duration: number
  words: string[]
}

export type Input
  = | { type: 'char', char: string }
    | { type: 'space' }
    | { type: 'backspace' }
    /** Ctrl/Alt+Backspace: clear the word being typed. */
    | { type: 'backspace-word' }

export interface Keystroke {
  /** Milliseconds since the first keystroke. */
  t: number
  correct: boolean
}

export interface TestState {
  config: TestConfig
  /** What has been typed for each word reached so far; the last is in progress. */
  typed: string[]
  /** Index of the word being typed. */
  index: number
  startedAt: number | null
  finishedAt: number | null
  log: Keystroke[]
}

/**
 * How far past the end of a word you can type before further letters are
 * ignored. Enough to show clearly that something has gone wrong; not so many
 * that a stuck key wraps the whole display.
 */
export const MAX_EXTRA = 10

export function createTest(config: TestConfig): TestState {
  return { config, typed: [''], index: 0, startedAt: null, finishedAt: null, log: [] }
}

export function isFinished(state: TestState): boolean {
  return state.finishedAt !== null
}

/** When a timed test runs out, in the same clock as `startedAt`. */
export function deadline(state: TestState): number | null {
  if (state.config.mode !== 'time' || state.startedAt === null)
    return null
  return state.startedAt + state.config.duration * 1000
}

/**
 * Let the clock catch up: a timed test whose time is up is finished at
 * exactly its deadline, however late this is called. The UI calls it on
 * every animation frame; a keystroke calls it first, so a key pressed after
 * the bell never counts.
 */
export function tick(state: TestState, now: number): TestState {
  const end = deadline(state)
  if (end === null || state.finishedAt !== null || now < end)
    return state
  return { ...state, finishedAt: end }
}

function target(state: TestState): string {
  return state.config.words[state.index] ?? ''
}

function withCurrent(state: TestState, value: string): string[] {
  const typed = state.typed.slice()
  typed[state.index] = value
  return typed
}

export function applyInput(previous: TestState, input: Input, now: number): TestState {
  let state = tick(previous, now)
  if (state.finishedAt !== null)
    return state

  const current = state.typed[state.index] ?? ''
  const word = target(state)

  if (input.type === 'char') {
    // One character at a time: an IME or a paste hands over a string, and
    // the caller splits it, so that every character is a keystroke here.
    if (input.char.length === 0 || /\s/.test(input.char))
      return state
    if (current.length >= word.length + MAX_EXTRA)
      return state

    if (state.startedAt === null)
      state = { ...state, startedAt: now }
    const position = current.length
    const correct = position < word.length && word[position] === input.char
    const next = current + input.char
    const log = [...state.log, { t: now - state.startedAt!, correct }]
    state = { ...state, typed: withCurrent(state, next), log }

    // A word count test ends the moment the last word is right — nobody
    // should have to press space after the final word to stop the clock.
    const last = state.index === state.config.words.length - 1
    if (last && next === word)
      state = { ...state, finishedAt: now }
    return state
  }

  if (input.type === 'space') {
    // A space with nothing typed is a slip, not an attempt at the word.
    if (current.length === 0 || state.startedAt === null)
      return state
    const correct = current === word
    const log = [...state.log, { t: now - state.startedAt, correct }]
    const last = state.index === state.config.words.length - 1
    if (last)
      return { ...state, log, finishedAt: now }
    return { ...state, log, index: state.index + 1, typed: [...state.typed, ''] }
  }

  // Backspace. Corrections are not keystrokes for accuracy: the mistake was
  // counted when it was made, and deleting it is neither right nor wrong.
  if (current.length > 0) {
    const next = input.type === 'backspace-word' ? '' : current.slice(0, -1)
    return { ...state, typed: withCurrent(state, next) }
  }

  // At the start of a word, step back into the previous one — but only if
  // that one is wrong. A finished correct word is done; letting backspace
  // reopen it would only invite fiddling with words that cannot improve.
  if (state.index > 0) {
    const before = state.typed[state.index - 1] ?? ''
    if (before !== state.config.words[state.index - 1]) {
      const typed = state.typed.slice(0, state.index)
      if (input.type === 'backspace-word')
        typed[state.index - 1] = ''
      return { ...state, index: state.index - 1, typed }
    }
  }
  return state
}

/** Apply a run of inputs, each with its time — the shape tests are written in. */
export function replay(config: TestConfig, inputs: readonly (readonly [Input, number])[]): TestState {
  let state = createTest(config)
  for (const [input, now] of inputs)
    state = applyInput(state, input, now)
  return state
}

/**
 * Turn the difference between two values of a text field into inputs.
 *
 * Phones do not reliably send key events — an on-screen keyboard reports
 * "something changed" and autocorrect may rewrite a whole word at once — so
 * the UI reads the field's value instead and diffs it against what the test
 * last saw. Whatever was removed becomes backspaces, whatever was added
 * becomes characters and spaces. An autocorrected word therefore counts as
 * the corrections it really was.
 */
export function diffInputs(before: string, after: string): Input[] {
  let common = 0
  while (common < before.length && common < after.length && before[common] === after[common])
    common++
  const inputs: Input[] = []
  for (let i = common; i < before.length; i++)
    inputs.push({ type: 'backspace' })
  for (const char of after.slice(common))
    inputs.push(/\s/.test(char) ? { type: 'space' } : { type: 'char', char })
  return inputs
}
