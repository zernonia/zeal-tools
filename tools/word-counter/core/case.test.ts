import { describe, expect, it } from 'vitest'
import { CASES, convertCase, identifierWords, isCaseId, sentenceCase, titleCase } from './case'
import { respond } from './index'

describe('every case', () => {
  it('turns "The quick brown fox" into its own example', () => {
    for (const option of CASES)
      expect(convertCase('The quick brown fox', option.id), option.id).toBe(option.example)
  })

  it('validates ids', () => {
    expect(isCaseId('snake')).toBe(true)
    expect(isCaseId('SNAKE')).toBe(false)
    expect(isCaseId(3)).toBe(false)
  })
})

describe('titleCase', () => {
  it('lowercases small words in the middle only', () => {
    expect(titleCase('the lord of the rings')).toBe('The Lord of the Rings')
    expect(titleCase('a tale of two cities')).toBe('A Tale of Two Cities')
    expect(titleCase('war and peace by the sea')).toBe('War and Peace by the Sea')
  })

  it('capitalises a small word after a colon or a sentence end', () => {
    expect(titleCase('star wars: a new hope')).toBe('Star Wars: A New Hope')
    expect(titleCase('stop. the end')).toBe('Stop. The End')
  })

  it('lowercases what was shouted, but keeps acronyms and brand capitals in mixed text', () => {
    expect(titleCase('THE LORD OF THE RINGS')).toBe('The Lord of the Rings')
    expect(titleCase('a guide to NASA and the iPhone')).toBe('A Guide to NASA and the iPhone')
  })

  it('capitalises every part of a hyphenated word and keeps contractions intact', () => {
    expect(titleCase('don\'t stop the well-known show')).toBe('Don\'t Stop the Well-Known Show')
  })

  it('leaves spacing, punctuation and line breaks exactly where they were', () => {
    expect(titleCase('  hello,   world!\nthe end ')).toBe('  Hello,   World!\nThe End ')
  })

  it('handles accented and non-Latin letters', () => {
    expect(titleCase('élan vital über alles')).toBe('Élan Vital Über Alles')
    expect(titleCase('привет мир')).toBe('Привет Мир')
  })
})

describe('sentenceCase', () => {
  it('capitalises the start of each sentence and line', () => {
    expect(sentenceCase('HELLO THERE. HOW ARE YOU? FINE!\nNEXT LINE')).toBe('Hello there. How are you? Fine!\nNext line')
  })

  it('restores the pronoun I and its contractions', () => {
    expect(sentenceCase('yes i think i\'m sure, i’ve said i\'d go')).toBe('Yes I think I\'m sure, I’ve said I\'d go')
  })

  it('keeps acronyms in mixed-case text', () => {
    expect(sentenceCase('We Met At The BBC In London')).toBe('We met at the BBC in london')
  })
})

describe('code cases', () => {
  it('splits camel humps, acronyms and punctuation', () => {
    expect(identifierWords('parseXMLHttpRequest')).toEqual(['parse', 'XML', 'Http', 'Request'])
    expect(identifierWords('user_id-value.name')).toEqual(['user', 'id', 'value', 'name'])
    expect(identifierWords('version2Beta')).toEqual(['version2', 'Beta'])
    expect(identifierWords('don\'t stop')).toEqual(['dont', 'stop'])
  })

  it('converts between identifier styles', () => {
    expect(convertCase('userAccountId', 'snake')).toBe('user_account_id')
    expect(convertCase('user_account_id', 'camel')).toBe('userAccountId')
    expect(convertCase('user-account-id', 'pascal')).toBe('UserAccountId')
    expect(convertCase('UserAccountID', 'kebab')).toBe('user-account-id')
    expect(convertCase('max retry count', 'constant')).toBe('MAX_RETRY_COUNT')
  })

  it('converts each line on its own', () => {
    expect(convertCase('first name\nlast name\r\nemail address', 'snake')).toBe('first_name\nlast_name\r\nemail_address')
  })

  it('keeps non-Latin letters', () => {
    expect(convertCase('café crème', 'kebab')).toBe('café-crème')
  })
})

describe('alternating and inverse', () => {
  it('alternates across letters only, skipping spaces and digits', () => {
    expect(convertCase('ab 1cd', 'alternating')).toBe('aB 1cD')
  })

  it('swaps every letter', () => {
    expect(convertCase('Hello World 123', 'inverse')).toBe('hELLO wORLD 123')
  })
})

describe('respond', () => {
  it('adds the converted text only when a case is asked for', () => {
    expect(respond({ text: 'hi there' }).converted).toBeUndefined()
    expect(respond({ text: 'hi there', case: 'upper' })).toMatchObject({ words: 2, converted: 'HI THERE' })
  })
})

describe('the examples the case converter page prints', () => {
  it.each([
    ['the lord of the rings', 'title', 'The Lord of the Rings'],
    ['star wars: a new hope', 'title', 'Star Wars: A New Hope'],
    ['HOW ARE YOU? I\'M FINE.', 'sentence', 'How are you? I\'m fine.'],
    ['user account id', 'camel', 'userAccountId'],
    ['parseXMLHttpRequest', 'snake', 'parse_xml_http_request'],
    ['Max Retry Count', 'constant', 'MAX_RETRY_COUNT'],
    ['Blog Post Title', 'kebab', 'blog-post-title'],
    ['first name', 'pascal', 'FirstName'],
    ['don\'t stop', 'snake', 'dont_stop'],
    ['élan', 'title', 'Élan'],
  ] as const)('%s → %s', (from, id, to) => {
    expect(convertCase(from, id)).toBe(to)
  })
})
