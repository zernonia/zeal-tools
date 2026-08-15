/**
 * Global open/close state for the Cmd+K palette.
 *
 * `mounted` exists so the layout can defer the palette's chunk (reka Dialog +
 * Listbox + the fuzzy scorer, ~32 KiB) until it is first opened. It latches on
 * and never resets — re-mounting on every open would refetch the chunk.
 */
export function useSearchPalette() {
  const open = useState('search-palette-open', () => false)
  const mounted = useState('search-palette-mounted', () => false)

  function show() {
    mounted.value = true
    open.value = true
  }

  return {
    open,
    mounted,
    show,
    hide: () => { open.value = false },
    toggle: () => (open.value ? (open.value = false) : show()),
  }
}
