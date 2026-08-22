/**
 * Whether the browser is willing to install this site, and the means to ask.
 *
 * The prompt cannot be conjured on demand — Chrome hands it over once, in a
 * `beforeinstallprompt` event fired before any component has mounted, and it
 * can only be used from a real user gesture afterwards. So the event is caught
 * in a plugin and parked here.
 */

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Deliberately outside Vue state. This is a live event object with methods on
 * it, not data — a reactive proxy around it would wrap `prompt` and Chrome
 * rejects a call that does not arrive on the original instance.
 */
let deferred: InstallPromptEvent | null = null

export function useInstall() {
  /** True only where the browser has actually offered. Never on iOS. */
  const available = useState('pwa-installable', () => false)

  function capture(event: InstallPromptEvent) {
    deferred = event
    available.value = true
  }

  function forget() {
    deferred = null
    available.value = false
  }

  async function install(): Promise<'accepted' | 'dismissed' | null> {
    if (!deferred)
      return null
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    // Single use. Chrome fires a fresh event later if this one was dismissed,
    // which is what puts the button back.
    forget()
    return outcome
  }

  return { available, install, capture, forget }
}
