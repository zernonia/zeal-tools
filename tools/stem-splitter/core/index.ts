/**
 * Stem splitter — pure, isomorphic audio arithmetic.
 *
 * The network is the one part we cannot own (see the allow-list in
 * CONTRIBUTING.md). Everything around it lives here: cutting a track into the
 * model's window, crossfading the results back together, mixing stems, and
 * writing WAV files.
 *
 * No DOM, no Vue, no npm — the composable hands these functions plain arrays.
 */
export * from './mix'
export * from './model'
export * from './segments'
export * from './spectrogram'
export * from './wav'

/** `song.mp3` + `vocals` → `song-vocals.wav`. */
export function stemFileName(source: string, part: string): string {
  const base = source.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|\p{Cc}]+/gu, '').trim() || 'track'
  return `${base}-${part}.wav`
}
