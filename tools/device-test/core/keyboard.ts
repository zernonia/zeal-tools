/**
 * Keyboard tester core: the physical layout, and the state a test session
 * accumulates. Pure data and pure reducers — the component feeds it
 * `KeyboardEvent` fields and renders what comes back.
 *
 * Keys are identified by `KeyboardEvent.code`, never `key`. `code` names the
 * physical position (the key in the Q position is `KeyQ` on an AZERTY board
 * too), which is what a hardware test is about; `key` is what the operating
 * system's layout made of it, and is shown beside it as a readout.
 */

export type LayoutId = 'ansi' | 'iso'

export interface KeyCap {
  code: string
  label: string
  /** Position and size in key units (1u = one letter key). */
  x: number
  y: number
  w: number
  h: number
}

export interface KeyboardLayout {
  id: LayoutId
  name: string
  keys: KeyCap[]
  /** Overall size in key units, for scaling the drawing. */
  width: number
  height: number
}

type Row = [code: string, label: string, w?: number][]

/** Lays a row out left to right from `x`, at height `y`. */
function row(y: number, x: number, keys: Row, h = 1): KeyCap[] {
  const out: KeyCap[] = []
  let at = x
  for (const [code, label, w = 1] of keys) {
    out.push({ code, label, x: at, y, w, h })
    at += w
  }
  return out
}

const letters = (codes: string): Row => [...codes].map(c => [`Key${c}`, c])

// Columns of the three blocks. A quarter-unit gutter between blocks is the
// usual full-size spacing.
const NAV_X = 15.25
const PAD_X = 18.5
const FN_Y = 0
const TOP = 1.5

function functionRow(): KeyCap[] {
  return [
    ...row(FN_Y, 0, [['Escape', 'Esc']]),
    ...row(FN_Y, 2, [['F1', 'F1'], ['F2', 'F2'], ['F3', 'F3'], ['F4', 'F4']]),
    ...row(FN_Y, 6.5, [['F5', 'F5'], ['F6', 'F6'], ['F7', 'F7'], ['F8', 'F8']]),
    ...row(FN_Y, 11, [['F9', 'F9'], ['F10', 'F10'], ['F11', 'F11'], ['F12', 'F12']]),
    ...row(FN_Y, NAV_X, [['PrintScreen', 'PrtSc'], ['ScrollLock', 'ScrLk'], ['Pause', 'Pause']]),
  ]
}

function navAndPad(): KeyCap[] {
  return [
    ...row(TOP, NAV_X, [['Insert', 'Ins'], ['Home', 'Home'], ['PageUp', 'PgUp']]),
    ...row(TOP + 1, NAV_X, [['Delete', 'Del'], ['End', 'End'], ['PageDown', 'PgDn']]),
    ...row(TOP + 3, NAV_X + 1, [['ArrowUp', '↑']]),
    ...row(TOP + 4, NAV_X, [['ArrowLeft', '←'], ['ArrowDown', '↓'], ['ArrowRight', '→']]),

    ...row(TOP, PAD_X, [['NumLock', 'Num'], ['NumpadDivide', '/'], ['NumpadMultiply', '*'], ['NumpadSubtract', '−']]),
    ...row(TOP + 1, PAD_X, [['Numpad7', '7'], ['Numpad8', '8'], ['Numpad9', '9']]),
    ...row(TOP + 1, PAD_X + 3, [['NumpadAdd', '+']], 2),
    ...row(TOP + 2, PAD_X, [['Numpad4', '4'], ['Numpad5', '5'], ['Numpad6', '6']]),
    ...row(TOP + 3, PAD_X, [['Numpad1', '1'], ['Numpad2', '2'], ['Numpad3', '3']]),
    ...row(TOP + 3, PAD_X + 3, [['NumpadEnter', 'Enter']], 2),
    ...row(TOP + 4, PAD_X, [['Numpad0', '0', 2], ['NumpadDecimal', '.']]),
  ]
}

const numberRow: Row = [
  ['Backquote', '`'],
  ['Digit1', '1'],
  ['Digit2', '2'],
  ['Digit3', '3'],
  ['Digit4', '4'],
  ['Digit5', '5'],
  ['Digit6', '6'],
  ['Digit7', '7'],
  ['Digit8', '8'],
  ['Digit9', '9'],
  ['Digit0', '0'],
  ['Minus', '-'],
  ['Equal', '='],
  ['Backspace', 'Backspace', 2],
]

const bottomRow: Row = [
  ['ControlLeft', 'Ctrl', 1.25],
  ['MetaLeft', 'Win / ⌘', 1.25],
  ['AltLeft', 'Alt', 1.25],
  ['Space', 'Space', 6.25],
  ['AltRight', 'Alt', 1.25],
  ['MetaRight', 'Win / ⌘', 1.25],
  ['ContextMenu', 'Menu', 1.25],
  ['ControlRight', 'Ctrl', 1.25],
]

function ansi(): KeyCap[] {
  return [
    ...functionRow(),
    ...row(TOP, 0, numberRow),
    ...row(TOP + 1, 0, [['Tab', 'Tab', 1.5], ...letters('QWERTYUIOP'), ['BracketLeft', '['], ['BracketRight', ']'], ['Backslash', '\\', 1.5]]),
    ...row(TOP + 2, 0, [['CapsLock', 'Caps', 1.75], ...letters('ASDFGHJKL'), ['Semicolon', ';'], ['Quote', '\''], ['Enter', 'Enter', 2.25]]),
    ...row(TOP + 3, 0, [['ShiftLeft', 'Shift', 2.25], ...letters('ZXCVBNM'), ['Comma', ','], ['Period', '.'], ['Slash', '/'], ['ShiftRight', 'Shift', 2.75]]),
    ...row(TOP + 4, 0, bottomRow),
    ...navAndPad(),
  ]
}

/**
 * ISO differs in three places: a tall Enter, the `Backslash` code moving down
 * beside it (it is the # key on a UK board), and an extra key between a short
 * left Shift and Z — `IntlBackslash`, the key ANSI boards do not have.
 *
 * The real ISO Enter is an inverted L; it is drawn as a 1.25u × 2u block,
 * which covers the same keys' worth of space without a non-rectangular shape.
 */
function iso(): KeyCap[] {
  return [
    ...functionRow(),
    ...row(TOP, 0, numberRow),
    ...row(TOP + 1, 0, [['Tab', 'Tab', 1.5], ...letters('QWERTYUIOP'), ['BracketLeft', '['], ['BracketRight', ']']]),
    ...row(TOP + 1, 13.75, [['Enter', 'Enter', 1.25]], 2),
    ...row(TOP + 2, 0, [['CapsLock', 'Caps', 1.75], ...letters('ASDFGHJKL'), ['Semicolon', ';'], ['Quote', '\''], ['Backslash', '#']]),
    ...row(TOP + 3, 0, [['ShiftLeft', 'Shift', 1.25], ['IntlBackslash', '\\'], ...letters('ZXCVBNM'), ['Comma', ','], ['Period', '.'], ['Slash', '/'], ['ShiftRight', 'Shift', 2.75]]),
    ...row(TOP + 4, 0, bottomRow),
    ...navAndPad(),
  ]
}

export const LAYOUTS: Record<LayoutId, KeyboardLayout> = {
  ansi: { id: 'ansi', name: 'ANSI (US)', keys: ansi(), width: PAD_X + 4, height: TOP + 5 },
  iso: { id: 'iso', name: 'ISO (UK / Europe)', keys: iso(), width: PAD_X + 4, height: TOP + 5 },
}

/**
 * Keys that, left alone, would scroll the page, move focus, open a menu or
 * reload — and so would end the test the moment they were tested. Only these
 * are prevented. Tab is among them while the test area has focus; Escape is
 * not, because Escape is how focus is handed back.
 */
const PREVENTED = new Set([
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  'Backspace',
  'Tab',
  'Slash',
  'Quote',
  'AltLeft',
  'AltRight',
  'ContextMenu',
  'F1',
  'F3',
  'F5',
  'F6',
  'F7',
  'F10',
])

export function shouldPreventDefault(code: string): boolean {
  return PREVENTED.has(code)
}

const MODIFIERS = new Set(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'CapsLock'])

export function isModifier(code: string): boolean {
  return MODIFIERS.has(code)
}

/**
 * Two registrations of one key closer together than this are not a person.
 *
 * Fast deliberate double-taps measure around 80–120 ms from press to press;
 * a worn switch bouncing produces a second press a few milliseconds after the
 * first. 30 ms sits well clear of both.
 */
export const CHATTER_MS = 30

export const KEY_LOCATIONS = ['Standard', 'Left', 'Right', 'Numpad'] as const

export interface KeyEventInfo {
  key: string
  code: string
  location: number
  repeat: boolean
}

export interface ChatterEvent {
  code: string
  /** Milliseconds between the two presses. */
  gap: number
}

export interface KeyTestState {
  /** Codes held right now, in the order they went down. */
  down: string[]
  /** How many times each code has been pressed (repeats excluded). */
  presses: Record<string, number>
  /** Timestamp of each code's most recent press. */
  lastPress: Record<string, number>
  /** Chatter detections per code. */
  chatter: Record<string, number>
  lastChatter: ChatterEvent | null
  /** Most keys held at once this session. */
  maxRollover: number
  /** Total presses, repeats excluded. */
  total: number
  /** Auto-repeat events seen (holding a key down). */
  repeats: number
  last: KeyEventInfo | null
}

export function createKeyTestState(): KeyTestState {
  return {
    down: [],
    presses: {},
    lastPress: {},
    chatter: {},
    lastChatter: null,
    maxRollover: 0,
    total: 0,
    repeats: 0,
    last: null,
  }
}

/** A key went down at time `at` (milliseconds, e.g. `event.timeStamp`). */
export function keyDown(state: KeyTestState, event: KeyEventInfo, at: number): KeyTestState {
  if (!event.code)
    return { ...state, last: event }

  if (event.repeat)
    return { ...state, repeats: state.repeats + 1, last: event }

  const down = state.down.includes(event.code) ? state.down : [...state.down, event.code]
  const previous = state.lastPress[event.code]
  const gap = previous === undefined ? Infinity : at - previous
  const chattered = gap >= 0 && gap < CHATTER_MS

  return {
    ...state,
    down,
    presses: { ...state.presses, [event.code]: (state.presses[event.code] ?? 0) + 1 },
    lastPress: { ...state.lastPress, [event.code]: at },
    chatter: chattered ? { ...state.chatter, [event.code]: (state.chatter[event.code] ?? 0) + 1 } : state.chatter,
    lastChatter: chattered ? { code: event.code, gap: Math.round(gap) } : state.lastChatter,
    maxRollover: Math.max(state.maxRollover, down.length),
    total: state.total + 1,
    last: event,
  }
}

export interface KeyUpOptions {
  /**
   * macOS sends no keyup for other keys while ⌘ is held, so releasing ⌘ is
   * the only signal that they have gone up. Without this they would sit in
   * the held set for the rest of the session and inflate the rollover count.
   */
  metaSwallowsKeyup?: boolean
}

/**
 * Keys whose keydown the operating system keeps for itself. On Windows,
 * PrintScreen goes to the screenshot tool and the page only ever sees the
 * keyup — so for these alone, a keyup with no keydown counts as a press.
 */
const KEYUP_ONLY = new Set(['PrintScreen'])

export function keyUp(state: KeyTestState, code: string, options: KeyUpOptions = {}): KeyTestState {
  if (!state.down.includes(code)) {
    if (!KEYUP_ONLY.has(code))
      return state
    return {
      ...state,
      presses: { ...state.presses, [code]: (state.presses[code] ?? 0) + 1 },
      total: state.total + 1,
    }
  }
  let down = state.down.filter(c => c !== code)
  if (options.metaSwallowsKeyup && (code === 'MetaLeft' || code === 'MetaRight'))
    down = down.filter(isModifier)
  return { ...state, down }
}

/**
 * The test area lost focus. Keys still held will never send a keyup to it, so
 * forget them rather than leave them lit forever. History is kept.
 */
export function releaseAll(state: KeyTestState): KeyTestState {
  return state.down.length ? { ...state, down: [] } : state
}

/** Codes pressed this session that the drawn layout has no key for. */
export function unmappedCodes(state: KeyTestState, layout: KeyboardLayout): string[] {
  const known = new Set(layout.keys.map(k => k.code))
  return Object.keys(state.presses).filter(code => !known.has(code)).sort()
}

/** How much of the drawn layout has been pressed at least once. */
export function coverage(state: KeyTestState, layout: KeyboardLayout): { pressed: number, total: number } {
  const pressed = layout.keys.filter(k => (state.presses[k.code] ?? 0) > 0).length
  return { pressed, total: layout.keys.length }
}

/** `event.key` made readable: a space is invisible, a dead key says nothing. */
export function describeKey(key: string): string {
  if (key === ' ')
    return 'Space'
  if (key === 'Dead')
    return 'Dead (accent key)'
  if (key === '')
    return '—'
  return key
}

export function describeLocation(location: number): string {
  return KEY_LOCATIONS[location] ?? String(location)
}

/** The layout a code was pressed on implies, if any: only ISO has IntlBackslash. */
export function suggestLayout(code: string): LayoutId | null {
  return code === 'IntlBackslash' ? 'iso' : null
}
