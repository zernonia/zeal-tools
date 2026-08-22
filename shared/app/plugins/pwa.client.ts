/**
 * Registers the service worker and catches the install prompt.
 *
 * Both belong in a plugin rather than a component: `beforeinstallprompt` fires
 * early and only once, and a listener living inside the install button would
 * drag that button's chunk onto every page just to hear it.
 */
import type { InstallPromptEvent } from '../composables/useInstall'

export default defineNuxtPlugin(() => {
  const { capture, forget } = useInstall()

  window.addEventListener('beforeinstallprompt', (event) => {
    // Suppress Chrome's own mini-infobar so the offer appears in the sidebar,
    // where it can be ignored, rather than over the page.
    event.preventDefault()
    capture(event as InstallPromptEvent)
  })

  // Fired when it is installed by any route, including the browser's own menu.
  window.addEventListener('appinstalled', forget)

  if (!('serviceWorker' in navigator))
    return

  // After load, so registration never competes with first paint on a site
  // whose whole performance story is that the pages arrive prerendered.
  const register = () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) }
  if (document.readyState === 'complete')
    register()
  else
    window.addEventListener('load', register, { once: true })
})
