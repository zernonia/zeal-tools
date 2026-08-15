/**
 * Owns the global ⌘K / "/" shortcut so the palette component itself can stay
 * lazy. If this lived inside SearchPalette.vue the chunk would have to load on
 * every page just to register a keydown listener.
 */
export default defineNuxtPlugin(() => {
  const { open, show } = useSearchPalette()

  const onKeydown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      if (open.value)
        open.value = false
      else
        show()
      return
    }

    if (event.key === '/' && !open.value) {
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
        return
      event.preventDefault()
      show()
    }
  }

  window.addEventListener('keydown', onKeydown)
})
