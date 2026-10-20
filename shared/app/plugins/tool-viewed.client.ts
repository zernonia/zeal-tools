import { toolOfPath } from '#registry'

/**
 * `tool_viewed` for every tool page and variant, from one place.
 *
 * It used to be an `onMounted` call in each page, and only the QR generator's
 * four pages ever had one — so for months PostHog showed completions on every
 * tool but views on just that one, and a view-to-completion rate could only
 * be computed for a single tool. Deriving it from the route means a new tool
 * or variant is counted the day it ships, with nothing to remember.
 *
 * `page:finish` fires after the first render and after every client-side
 * navigation, so a visitor who moves between tools in one tab is counted on
 * each page they actually reach.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const { track } = useAnalytics()
  const router = useRouter()
  nuxtApp.hook('page:finish', () => {
    const page = toolOfPath(router.currentRoute.value.path)
    if (page)
      track('tool_viewed', page)
  })
})
