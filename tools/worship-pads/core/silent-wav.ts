/**
 * A minimal silent WAV, written by hand rather than shipped as a file.
 *
 * Browsers only expose OS media controls — the play/pause keys on a keyboard,
 * the macOS Control Centre widget, a phone lock screen — for pages that are
 * playing a *media element*. A page whose sound comes purely from Web Audio
 * does not qualify, so the pads would never appear there.
 *
 * Looping a silent element alongside the pads marks the page as media
 * playback and makes those controls light up. The pads themselves still go
 * straight to the audio destination, so nothing about the sound changes.
 */

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++)
    view.setUint8(offset + i, text.charCodeAt(i))
}

/**
 * 16-bit mono PCM containing nothing but zeroes. The sample rate is
 * deliberately low — this is never heard, so the smallest legal file wins.
 */
export function silentWav(seconds = 1, sampleRate = 8000): Uint8Array {
  const samples = Math.max(1, Math.round(seconds * sampleRate))
  const dataBytes = samples * 2
  const buffer = new ArrayBuffer(44 + dataBytes)
  const view = new DataView(buffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  writeAscii(view, 8, 'WAVE')

  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // PCM header length
  view.setUint16(20, 1, true) // format: PCM
  view.setUint16(22, 1, true) // channels: mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample

  writeAscii(view, 36, 'data')
  view.setUint32(40, dataBytes, true)
  // Samples are left at zero — an ArrayBuffer is already zero-filled.

  return new Uint8Array(buffer)
}

/** Data URI form, so no blob URL has to be created or revoked. */
export function silentWavDataUri(seconds = 1): string {
  const bytes = silentWav(seconds)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:audio/wav;base64,${btoa(binary)}`
}
