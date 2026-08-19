import type { RouterConfig } from '@nuxt/schema'

/**
 * The app shell scrolls an inner card, not the window.
 *
 * Vue Router's default scroll behaviour drives `window.scrollTo`, and the
 * window here never scrolls — so hash links silently did nothing. They looked
 * fine only because the two anchors that existed both sat past the end of the
 * scroll range and so landed at the bottom either way; adding a third section
 * broke the coincidence and left `/#api` off screen entirely.
 */
export default <RouterConfig>{
  async scrollBehavior(to, _from, savedPosition) {
    const scroller = document.querySelector('main')?.closest('.overflow-auto') as HTMLElement | null
    if (!scroller)
      return savedPosition ?? { top: 0 }

    // Two frames: one for the incoming page to render, one for its layout to
    // settle, so the target's offset is real before we measure it.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    if (to.hash) {
      const target = document.querySelector(to.hash) as HTMLElement | null
      if (target) {
        const top = target.getBoundingClientRect().top
          - scroller.getBoundingClientRect().top
          + scroller.scrollTop
          - 24
        scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
        return false
      }
    }

    scroller.scrollTo({ top: savedPosition?.top ?? 0 })
    return false
  },
}
