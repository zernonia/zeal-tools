/** Global open/close state for the Cmd+K palette. */
export function useSearchPalette() {
  const open = useState('search-palette-open', () => false)
  return {
    open,
    show: () => { open.value = true },
    hide: () => { open.value = false },
    toggle: () => { open.value = !open.value },
  }
}
