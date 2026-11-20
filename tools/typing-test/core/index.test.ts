import type { Input, TestConfig } from './index'
import { describe, expect, it } from 'vitest'
import {
  applyInput,
  buildConfig,
  compareWord,
  consistencyOf,
  createTest,
  DEFAULT_SETTINGS,
  diffInputs,
  generateWords,
  isNewBest,
  MAX_EXTRA,
  modeKey,
  modeLabel,
  mulberry32,
  normaliseSettings,
  replay,
  reviveBests,
  scoreTest,
  tick,
  WORDS,
  wordsForDuration,
  wordView,
  wpmFor,
} from './index'

const ch = (char: string): Input => ({ type: 'char', char })
const SPACE: Input = { type: 'space' }
const BACK: Input = { type: 'backspace' }

/** Type a string one key per `gap` ms from `start`; spaces become word breaks. */
function typing(text: string, start = 0, gap = 100): [Input, number][] {
  return [...text].map((c, i) => [c === ' ' ? SPACE : ch(c), start + i * gap])
}

const words = (list: string[], mode: 'time' | 'words' = 'words', duration = 30): TestConfig => ({ mode, duration, words: list })

describe('word list', () => {
  it('has 250 distinct lower-case words', () => {
    expect(WORDS).toHaveLength(250)
    expect(new Set(WORDS).size).toBe(250)
    for (const word of WORDS)
      expect(word).toMatch(/^[a-z]+$/)
  })
})

describe('mulberry32', () => {
  it('matches the reference sequence for seed 1', () => {
    const random = mulberry32(1)
    expect([random(), random(), random()]).toEqual([0.6270739405881613, 0.002735721180215478, 0.5274470399599522])
  })

  it('stays in [0, 1)', () => {
    const random = mulberry32(123)
    for (let i = 0; i < 10_000; i++) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('generateWords', () => {
  it('is deterministic for a seed (golden)', () => {
    expect(generateWords({ seed: 42, count: 8 })).toEqual(['where', 'write', 'family', 'about', 'last', 'other', 'water', 'change'])
    expect(generateWords({ seed: 42, count: 12, punctuation: true })).toEqual(
      ['Where', 'family;', 'last', 'water', 'own', 'walk', 'over:', 'high.', 'The', 'move,', 'week,', 'them.'],
    )
    expect(generateWords({ seed: 7, count: 20, numbers: true })).toEqual([
      'as',
      'line',
      'was',
      'people',
      'face',
      'what',
      'early',
      'want',
      'left',
      'while',
      'open',
      'would',
      'look',
      '5983',
      'house',
      'between',
      'never',
      'it',
      'even',
      '4320',
    ])
  })

  it('differs between seeds', () => {
    expect(generateWords({ seed: 1, count: 20 })).not.toEqual(generateWords({ seed: 2, count: 20 }))
  })

  it('never repeats a word back to back, and draws only from the list', () => {
    const list = generateWords({ seed: 99, count: 1000 })
    expect(list).toHaveLength(1000)
    for (let i = 1; i < list.length; i++)
      expect(list[i]).not.toBe(list[i - 1])
    for (const word of list)
      expect(WORDS).toContain(word)
  })

  it('writes sentences when punctuation is on', () => {
    const list = generateWords({ seed: 5, count: 300, punctuation: true })
    expect(list[0]![0]).toMatch(/[A-Z]/)
    expect(list.at(-1)).toMatch(/[.?!]$/)
    for (let i = 1; i < list.length; i++) {
      // After a sentence ends, the next word opens with a capital.
      if (/[.?!]$/.test(list[i - 1]!))
        expect(list[i]).toMatch(/^[A-Z0-9]/)
    }
    expect(list.some(word => word.endsWith(','))).toBe(true)
  })

  it('mixes in numbers at roughly one word in ten', () => {
    const list = generateWords({ seed: 11, count: 1000, numbers: true })
    const numbers = list.filter(word => /^\d+$/.test(word))
    expect(numbers.length).toBeGreaterThan(60)
    expect(numbers.length).toBeLessThan(140)
    for (const number of numbers)
      expect(number).toMatch(/^(?:0|[1-9]\d{0,3})$/)
  })

  it('bounds the count', () => {
    expect(generateWords({ seed: 1, count: 0 })).toHaveLength(1)
    expect(generateWords({ seed: 1, count: 5000 })).toHaveLength(1000)
  })

  it('sizes timed tests for 250 WPM plus headroom', () => {
    expect(wordsForDuration(15)).toBe(83)
    expect(wordsForDuration(30)).toBe(145)
    expect(wordsForDuration(120)).toBe(520)
  })
})

describe('applyInput', () => {
  it('starts the clock on the first keystroke, not before', () => {
    let state = createTest(words(['hi']))
    state = applyInput(state, SPACE, 50)
    expect(state.startedAt).toBeNull()
    state = applyInput(state, ch('h'), 500)
    expect(state.startedAt).toBe(500)
    expect(state.log).toEqual([{ t: 0, correct: true }])
  })

  it('ignores a space with nothing typed', () => {
    const state = replay(words(['a', 'b']), [[ch('a'), 0], [SPACE, 100], [SPACE, 200]])
    expect(state.index).toBe(1)
    expect(state.log).toHaveLength(2)
  })

  it('finishes a word test on the last correct letter, without a space', () => {
    const state = replay(words(['the', 'cat']), typing('the cat', 0, 200))
    expect(state.finishedAt).toBe(1200)
    expect(state.typed).toEqual(['the', 'cat'])
  })

  it('finishes a word test on a space after a wrong last word', () => {
    const state = replay(words(['the', 'cat']), typing('the cab ', 0, 100))
    expect(state.finishedAt).toBe(700)
  })

  it('caps letters typed past the end of a word', () => {
    const state = replay(words(['a', 'b']), typing('a'.repeat(30)))
    expect(state.typed[0]).toHaveLength(1 + MAX_EXTRA)
  })

  it('backspaces within a word and does not count it as a keystroke', () => {
    const state = replay(words(['ab', 'cd']), [[ch('a'), 0], [ch('x'), 100], [BACK, 200], [ch('b'), 300]])
    expect(state.typed[0]).toBe('ab')
    expect(state.log.map(k => k.correct)).toEqual([true, false, true])
  })

  it('steps back into a wrong previous word but not a correct one', () => {
    const wrong = replay(words(['ab', 'cd']), [...typing('ax '), [BACK, 400]])
    expect(wrong.index).toBe(0)
    expect(wrong.typed).toEqual(['ax'])
    const fixed = applyInput(wrong, BACK, 500)
    expect(fixed.typed).toEqual(['a'])

    const right = replay(words(['ab', 'cd']), [...typing('ab '), [BACK, 400]])
    expect(right.index).toBe(1)
    expect(right.typed).toEqual(['ab', ''])
  })

  it('clears a word with backspace-word', () => {
    const state = replay(words(['hello', 'x']), [...typing('hel'), [{ type: 'backspace-word' }, 400]])
    expect(state.typed[0]).toBe('')
  })

  it('ends a timed test at its deadline and ignores later keys', () => {
    let state = replay(words(['a', 'b', 'c'], 'time', 15), [[ch('a'), 1000]])
    expect(tick(state, 15_999).finishedAt).toBeNull()
    state = tick(state, 16_500)
    expect(state.finishedAt).toBe(16_000)
    const after = applyInput(state, SPACE, 16_600)
    expect(after).toBe(state)
  })

  it('treats a key after the deadline as too late even without a tick', () => {
    const state = replay(words(['ab', 'c'], 'time', 15), [[ch('a'), 0], [ch('b'), 15_000]])
    expect(state.finishedAt).toBe(15_000)
    expect(state.typed[0]).toBe('a')
  })
})

describe('diffInputs', () => {
  it('turns appended text into characters and spaces', () => {
    expect(diffInputs('', 'hi there')).toEqual([ch('h'), ch('i'), SPACE, ch('t'), ch('h'), ch('e'), ch('r'), ch('e')])
  })

  it('turns a rewrite into backspaces then characters', () => {
    expect(diffInputs('teh', 'the')).toEqual([BACK, BACK, ch('h'), ch('e')])
    expect(diffInputs('abc', 'a')).toEqual([BACK, BACK])
    expect(diffInputs('abc', 'abc')).toEqual([])
  })
})

describe('scoring', () => {
  it('uses five characters per word', () => {
    expect(wpmFor(250, 60)).toBe(50)
    expect(wpmFor(100, 30)).toBe(40)
    expect(wpmFor(10, 0)).toBe(0)
  })

  it('compares a word letter by letter', () => {
    expect(compareWord('thw', 'the', true)).toEqual({ correct: 2, incorrect: 1, extra: 0, missed: 0 })
    expect(compareWord('th', 'the', true)).toEqual({ correct: 2, incorrect: 0, extra: 0, missed: 1 })
    expect(compareWord('th', 'the', false)).toEqual({ correct: 2, incorrect: 0, extra: 0, missed: 0 })
    expect(compareWord('thee', 'the', true)).toEqual({ correct: 3, incorrect: 0, extra: 1, missed: 0 })
  })

  it('scores a clean word test (golden)', () => {
    // "the cat", a key every 200 ms: 7 characters in 1.2 s = 1.4 words in 0.02 min.
    const result = scoreTest(replay(words(['the', 'cat']), typing('the cat', 0, 200)))
    expect(result.wpm).toBe(70)
    expect(result.raw).toBe(70)
    expect(result.accuracy).toBe(100)
    expect(result.seconds).toBe(1.2)
    expect(result.chars).toEqual({ correct: 6, incorrect: 0, extra: 0, missed: 0 })
    expect(result.spaces).toEqual({ correct: 1, total: 1 })
    // The 0.2 s tail is too short to chart.
    expect(result.series).toEqual([{ second: 1, wpm: 60, raw: 60 }])
    expect(result.consistency).toBeNull()
  })

  it('counts a corrected mistake against accuracy but not speed (golden)', () => {
    const result = scoreTest(replay(words(['ab', 'cd']), [
      [ch('a'), 0],
      [ch('x'), 100],
      [BACK, 200],
      [ch('b'), 300],
      [SPACE, 400],
      [ch('c'), 500],
      [ch('d'), 600],
    ]))
    // 5 correct characters in 0.6 s.
    expect(result.wpm).toBe(100)
    expect(result.raw).toBe(100)
    expect(result.keystrokes).toEqual({ correct: 5, total: 6 })
    expect(result.accuracy).toBe(83.33)
  })

  it('scores a timed test with wrong, short and long words (golden)', () => {
    let state = replay(words(['one', 'two', 'three', 'four'], 'time', 15), typing('on twoo threa'))
    state = tick(state, 15_000)
    const result = scoreTest(state)
    expect(result.seconds).toBe(15)
    expect(result.chars).toEqual({ correct: 9, incorrect: 1, extra: 1, missed: 1 })
    expect(result.spaces).toEqual({ correct: 0, total: 2 })
    // 9 correct letters, no correct spaces: 1.8 words in a quarter minute.
    expect(result.wpm).toBe(7.2)
    // 13 characters on the page.
    expect(result.raw).toBe(10.4)
    expect(result.keystrokes).toEqual({ correct: 9, total: 13 })
    expect(result.accuracy).toBe(69.23)
    expect(result.series).toHaveLength(15)
    expect(result.series[0]).toEqual({ second: 1, wpm: 84, raw: 120 })
    expect(result.series[1]).toEqual({ second: 2, wpm: 54, raw: 36 })
    expect(result.series[14]).toEqual({ second: 15, wpm: 7.2, raw: 0 })
    // A burst then nothing is as uneven as typing gets.
    expect(result.consistency).toBe(0)
  })

  it('scores nothing typed as zero', () => {
    const result = scoreTest(createTest(words(['a'])))
    expect(result.wpm).toBe(0)
    expect(result.accuracy).toBe(0)
    expect(result.series).toEqual([])
  })

  it('measures consistency as 100 × (1 − coefficient of variation)', () => {
    const point = (raw: number) => ({ second: 0, wpm: 0, raw })
    expect(consistencyOf([point(60), point(60), point(60)])).toBe(100)
    expect(consistencyOf([point(40), point(80)])).toBe(66.67)
    expect(consistencyOf([point(0), point(0)])).toBe(0)
    expect(consistencyOf([point(60)])).toBeNull()
  })

  it('gives an even typist high consistency over a real test', () => {
    const config = buildConfig({ ...DEFAULT_SETTINGS, mode: 'time', duration: 15 }, 3)
    const text = config.words.join(' ')
    // A key every 120 ms is 100 WPM if every key is right.
    let state = replay(config, typing(text.slice(0, 125), 0, 120))
    state = tick(state, 15_000)
    const result = scoreTest(state)
    expect(result.accuracy).toBe(100)
    expect(result.raw).toBeCloseTo(100, 0)
    expect(result.consistency).toBeGreaterThan(90)
  })
})

describe('settings and personal bests', () => {
  it('normalises settings from the address bar', () => {
    expect(normaliseSettings({ mode: 'words', duration: 7, words: 100, punctuation: true, numbers: 'yes' }))
      .toEqual({ mode: 'words', duration: 30, words: 100, punctuation: true, numbers: false })
    expect(normaliseSettings({})).toEqual(DEFAULT_SETTINGS)
  })

  it('files each mode separately', () => {
    expect(modeKey(DEFAULT_SETTINGS)).toBe('time-30')
    expect(modeKey({ ...DEFAULT_SETTINGS, mode: 'words', words: 25, punctuation: true, numbers: true })).toBe('words-25-punctuation-numbers')
    expect(modeLabel({ ...DEFAULT_SETTINGS, numbers: true })).toBe('30 seconds · numbers')
  })

  it('builds a config the right length for the mode', () => {
    expect(buildConfig({ ...DEFAULT_SETTINGS, mode: 'words', words: 25 }, 1).words).toHaveLength(25)
    expect(buildConfig({ ...DEFAULT_SETTINGS, duration: 60 }, 1).words).toHaveLength(270)
  })

  it('revives only well-formed records', () => {
    const good = { wpm: 80, accuracy: 97, raw: 84, date: '2026-11-20' }
    expect(reviveBests({
      'time-30': good,
      'time-45': good,
      'words-50': { ...good, wpm: 'fast' },
      'words-25-punctuation': { ...good, accuracy: 140 },
      'time-60-numbers': good,
    })).toEqual({ 'time-30': good, 'time-60-numbers': good })
    expect(reviveBests(null)).toEqual({})
    expect(reviveBests([good])).toEqual({})
  })

  it('records a best only for a real, accurate result', () => {
    const base = scoreTest(replay(words(['the', 'cat']), typing('the cat', 0, 200)))
    expect(isNewBest(base, undefined)).toBe(true)
    expect(isNewBest(base, { wpm: 69, accuracy: 100, raw: 70, date: '2026-11-01' })).toBe(true)
    expect(isNewBest(base, { wpm: 70, accuracy: 100, raw: 70, date: '2026-11-01' })).toBe(false)
    expect(isNewBest({ ...base, accuracy: 60 }, undefined)).toBe(false)
    expect(isNewBest({ ...base, wpm: 0 }, undefined)).toBe(false)
  })
})

describe('wordView', () => {
  it('marks each letter', () => {
    expect(wordView('the', 'tx', false)).toEqual([
      { char: 't', status: 'correct' },
      { char: 'h', status: 'incorrect' },
      { char: 'e', status: 'pending' },
    ])
    expect(wordView('the', 't', true).map(l => l.status)).toEqual(['correct', 'missed', 'missed'])
    expect(wordView('to', 'tooo', true)).toEqual([
      { char: 't', status: 'correct' },
      { char: 'o', status: 'correct' },
      { char: 'o', status: 'extra' },
      { char: 'o', status: 'extra' },
    ])
  })
})
