/**
 * How each letter of a word should be shown, as data.
 *
 * Kept here rather than in the template so the rules are tested: which
 * letters are wrong, which were skipped, which were typed past the end.
 * The UI turns each status into colour *and* a second cue — an underline, a
 * strike-through — so the display never depends on telling red from green.
 */

export type LetterStatus = 'correct' | 'incorrect' | 'extra' | 'missed' | 'pending'

export interface Letter {
  char: string
  status: LetterStatus
}

/**
 * Letters of `target` as typed so far. `submitted` means the word was moved
 * on from, so untyped letters are missed rather than still to come.
 */
export function wordView(target: string, typed: string, submitted: boolean): Letter[] {
  const letters: Letter[] = []
  for (let i = 0; i < target.length; i++) {
    const char = target[i]!
    if (i < typed.length)
      // A wrong letter shows the letter that was wanted, so the word stays
      // readable; the mark says it was not what was typed.
      letters.push({ char, status: typed[i] === char ? 'correct' : 'incorrect' })
    else
      letters.push({ char, status: submitted ? 'missed' : 'pending' })
  }
  for (const char of typed.slice(target.length))
    letters.push({ char, status: 'extra' })
  return letters
}
