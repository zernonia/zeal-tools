/** Global open/close state for the navigation drawer shown below `lg`. */
export function useSidebar() {
  const open = useState('sidebar-open', () => false)
  return {
    open,
    show: () => { open.value = true },
    hide: () => { open.value = false },
    toggle: () => { open.value = !open.value },
  }
}
