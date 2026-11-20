import { describe, expect, it } from 'vitest'
import {
  countLines,
  countParagraphs,
  countSentences,
  countWords,
  formatDuration,
  graphemeLength,
  textStats,
  topKeywords,
  utf8Length,
  words,
} from './stats'

describe('words', () => {
  it('counts plain English', () => {
    expect(countWords('The quick brown fox jumps over the lazy dog.')).toBe(9)
  })

  it('is zero for empty and whitespace-only text', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   \n\t  ')).toBe(0)
  })

  it('keeps contractions whole, with either apostrophe', () => {
    expect(words('don\'t it’s rock’n’roll l\'homme')).toEqual(['don\'t', 'it’s', 'rock’n’roll', 'l\'homme'])
  })

  it('keeps hyphenated compounds whole', () => {
    expect(words('e-mail co-op mother-in-law')).toEqual(['e-mail', 'co-op', 'mother-in-law'])
    // Unicode hyphen and non-breaking hyphen too.
    expect(words('e‐mail e‑mail')).toEqual(['e‐mail', 'e‑mail'])
  })

  it('splits at dashes and spaced hyphens', () => {
    expect(words('yes—no')).toEqual(['yes', 'no'])
    expect(words('pages 3–5')).toEqual(['pages', '3', '5'])
    expect(words('wait - what')).toEqual(['wait', 'what'])
    expect(words('a--b')).toEqual(['a', 'b'])
  })

  it('treats numbers with separators as one word', () => {
    expect(words('3.14 and 1,000')).toEqual(['3.14', 'and', '1,000'])
  })

  it('does not count punctuation, symbols or emoji on their own', () => {
    expect(countWords('!!! — 🎉 👍🏽 & …')).toBe(0)
    expect(countWords('Launch day 🚀 #shipit')).toBe(3)
  })

  it('splits Chinese, Japanese and Thai by dictionary, not by space', () => {
    expect(words('日本語の文章です')).toEqual(['日本語', 'の', '文章', 'です'])
    expect(countWords('你好世界')).toBe(2)
    expect(words('สวัสดีครับ')).toEqual(['สวัสดี', 'ครับ'])
  })

  it('counts accented and non-Latin scripts', () => {
    expect(countWords('Größe café naïve')).toBe(3)
    expect(countWords('Привет мир')).toBe(2)
    expect(countWords('مرحبا بالعالم')).toBe(2)
  })
})

describe('characters', () => {
  it('counts an emoji as one, however it is built', () => {
    expect(graphemeLength('👍🏽')).toBe(1)
    expect(graphemeLength('👨‍👩‍👧‍👦')).toBe(1)
    expect(graphemeLength('🇬🇧')).toBe(1)
    expect('👨‍👩‍👧‍👦'.length).toBe(11)
  })

  it('counts a decomposed accent as one', () => {
    expect(graphemeLength('é')).toBe(1)
  })

  it('reports spaces separately', () => {
    const stats = textStats('a b\tc\nd')
    expect(stats.characters).toBe(7)
    expect(stats.charactersNoSpaces).toBe(4)
  })
})

describe('utf8Length', () => {
  it('matches TextEncoder across every byte width', () => {
    for (const sample of ['', 'abc', 'é', '€', '日本', '😀', '👨‍👩‍👧‍👦 héllo €5']) {
      expect(utf8Length(sample)).toBe(new TextEncoder().encode(sample).length)
    }
  })

  it('counts a lone surrogate as the 3-byte replacement character', () => {
    expect(utf8Length('\uD83D')).toBe(3)
    expect(new TextEncoder().encode('\uD83D').length).toBe(3)
  })
})

describe('sentences', () => {
  it('counts terminal punctuation', () => {
    expect(countSentences('One. Two! Three? Four')).toBe(4)
  })

  it('does not end a sentence at a title or a decimal', () => {
    expect(countSentences('Dr. Smith paid 3.50 for it. Mr. Jones did not.')).toBe(2)
    expect(countSentences('Use a tool, e.g. this one. Then stop.')).toBe(2)
  })

  it('follows Unicode in not breaking before a lower-case letter', () => {
    expect(countSentences('the end. and then more.')).toBe(1)
    expect(countSentences('The end. And then more.')).toBe(2)
  })

  it('ignores runs with no words', () => {
    expect(countSentences('Hello. !!! 🎉')).toBe(1)
    expect(countSentences('')).toBe(0)
  })
})

describe('paragraphs and lines', () => {
  it('splits paragraphs on blank lines', () => {
    expect(countParagraphs('One\nstill one\n\nTwo\n \nThree')).toBe(3)
    expect(countParagraphs('\n\n  \n')).toBe(0)
    expect(countParagraphs('a\r\n\r\nb')).toBe(2)
  })

  it('counts every line, blank ones included', () => {
    expect(countLines('')).toBe(0)
    expect(countLines('one')).toBe(1)
    expect(countLines('one\n\nthree')).toBe(3)
    expect(countLines('a\r\nb\rc')).toBe(3)
  })
})

describe('keywords', () => {
  it('leaves out stop words, numbers and single characters, folds case and apostrophes', () => {
    const list = words('The cat and the Cat. A cat’s hat, the cat\'s 2024 hat. x x x')
    expect(topKeywords(list)).toEqual([
      { word: 'cat', count: 2, density: expect.any(Number) },
      { word: 'cat\'s', count: 2, density: expect.any(Number) },
      { word: 'hat', count: 2, density: expect.any(Number) },
    ])
  })

  it('breaks ties by first appearance and limits the list', () => {
    const list = words('zebra apple zebra apple mango')
    expect(topKeywords(list, 2).map(k => k.word)).toEqual(['zebra', 'apple'])
  })

  it('gives density as a percentage of all words', () => {
    expect(topKeywords(words('river river stone the'))[0]).toEqual({ word: 'river', count: 2, density: 50 })
  })
})

describe('textStats', () => {
  it('measures a short paragraph', () => {
    const stats = textStats('Hello world. Hello again!\n\nA new paragraph.')
    expect(stats).toMatchObject({
      words: 7,
      sentences: 3,
      paragraphs: 2,
      lines: 3,
      uniqueWords: 6,
      longestWord: 'paragraph',
    })
    expect(stats.utf16Length).toBe(43)
    expect(stats.utf8Bytes).toBe(43)
  })

  it('is all zeros for empty text', () => {
    expect(textStats('')).toMatchObject({
      words: 0,
      characters: 0,
      charactersNoSpaces: 0,
      sentences: 0,
      paragraphs: 0,
      lines: 0,
      uniqueWords: 0,
      averageWordLength: 0,
      readingSeconds: 0,
      speakingSeconds: 0,
      longestWord: '',
      keywords: [],
    })
  })

  it('separates characters, UTF-16 units and UTF-8 bytes', () => {
    const stats = textStats('Hi 👋🏽')
    expect(stats.characters).toBe(4)
    expect(stats.utf16Length).toBe(7)
    expect(stats.utf8Bytes).toBe(11)
  })

  it('times reading at 238 wpm and speaking at 130 wpm', () => {
    const text = Array.from({ length: 238 }).fill('word').join(' ')
    const stats = textStats(text)
    expect(stats.readingSeconds).toBe(60)
    expect(stats.speakingSeconds).toBe(110)
  })

  it('measures average length in characters, and the longest word by them', () => {
    const stats = textStats('ab abcd 日本語')
    expect(stats.averageWordLength).toBe(3)
    expect(stats.longestWord).toBe('abcd')
  })
})

describe('formatDuration', () => {
  it('reads naturally at each scale', () => {
    expect(formatDuration(0)).toBe('0 sec')
    expect(formatDuration(45)).toBe('45 sec')
    expect(formatDuration(150)).toBe('3 min')
    expect(formatDuration(4320)).toBe('1 h 12 min')
  })
})
