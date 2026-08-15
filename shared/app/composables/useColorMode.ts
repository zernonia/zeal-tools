export type ColorMode = 'light' | 'dark' | 'system'

/** Must stay in sync with the pre-paint script in nuxt.config.ts. */
export const COLOR_MODE_STORAGE_KEY = 'zeal-theme'

function isColorMode(value: unknown): value is ColorMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

function prefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Single place that decides what "system" resolves to, and writes the class. */
function apply(mode: ColorMode) {
  const dark = mode === 'dark' || (mode === 'system' && prefersDark())
  document.documentElement.classList.toggle('dark', dark)
  // Keeps native widgets (scrollbars, form controls) on the same side.
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

export function useColorMode() {
  // Server renders 'system'; the real value is read on mount, and the pre-paint
  // script has already applied the correct class by then — so no flash.
  const mode = useState<ColorMode>('color-mode', () => 'system')

  onMounted(() => {
    const stored = localStorage.getItem(COLOR_MODE_STORAGE_KEY)
    if (isColorMode(stored))
      mode.value = stored
    apply(mode.value)

    // Follow the OS live, but only while the user hasn't pinned a mode.
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = () => {
      if (mode.value === 'system')
        apply('system')
    }
    media.addEventListener('change', onSystemChange)
    onUnmounted(() => media.removeEventListener('change', onSystemChange))
  })

  function set(next: ColorMode) {
    mode.value = next
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, next)
    apply(next)
  }

  function cycle() {
    set(mode.value === 'light' ? 'dark' : mode.value === 'dark' ? 'system' : 'light')
  }

  return { mode, set, cycle }
}
