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

  /**
   * Never in development.
   *
   * The worker serves `/_nuxt/**` cache-first, which is only safe because
   * those filenames are content-hashed in a build. Vite's dev server puts
   * mutable module URLs under the same prefix and re-optimises dependencies
   * behind them, so a cache hit there hands back a stale module — in practice
   * a 504 "Outdated Optimize Dep", or a JS request answered with the CSS that
   * URL used to be. `nuxt.config` also clears any worker left behind on a dev
   * origin, because by the time this plugin would run the app has usually
   * already failed to boot.
   */
  if (import.meta.dev)
    return

  // After load, so registration never competes with first paint on a site
  // whose whole performance story is that the pages arrive prerendered.
  const register = () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) }
  if (document.readyState === 'complete')
    register()
  else
    window.addEventListener('load', register, { once: true })
})
