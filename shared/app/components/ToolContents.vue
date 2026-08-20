<script setup lang="ts">
export interface ContentsItem {
  /** The id of the heading this jumps to — already on every section's h2. */
  id: string
  label: string
}

const props = defineProps<{ items: ContentsItem[] }>()

const active = ref('')

/**
 * The wide screen was the problem, not the solution.
 *
 * Every tool page put its prose in the same 1152px column as the tool, which
 * ran body copy to about 147 characters a line — roughly double a comfortable
 * measure. Capping the text alone would have left a wide empty gutter, so the
 * spare width becomes navigation instead: the reading column narrows to 68
 * characters and the room it gives up holds a contents rail.
 *
 * Below `lg` there is no spare width to spend, so the rail becomes a
 * disclosure above the prose and the viewport enforces the measure by itself.
 *
 * The two magic numbers are measured, not chosen. `33rem` is 75 characters of
 * the 14px prose these sections actually use — `ch` was the obvious unit and
 * the wrong one, because it resolves against this wrapper's inherited 16px and
 * silently ran 20 characters long. `top-20` clears the 61px sticky page
 * header; at `top-6` the first entry sat behind it.
 */
onMounted(() => {
  // The app shell scrolls an inner card, not the window, so the observer has
  // to watch that container — against the viewport nothing would ever
  // intersect and no entry would ever light up.
  const root = document.querySelector('main')?.closest('.overflow-auto') ?? null

  const headings = props.items
    .map(item => document.getElementById(item.id))
    .filter((el): el is HTMLElement => el !== null)

  if (headings.length === 0)
    return

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting)
          active.value = entry.target.id
      }
    },
    {
      root,
      // A band near the top: a heading counts as current once it reaches the
      // upper quarter, so the highlight moves with reading rather than lagging
      // until a section fills the screen.
      rootMargin: '0px 0px -75% 0px',
      threshold: 0,
    },
  )

  headings.forEach(heading => observer.observe(heading))
  onScopeDispose(() => observer.disconnect())
})

const linkClass = 'block rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-muted hover:text-foreground'
</script>

<template>
  <div class="mt-16 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-14">
    <!--
      Plain anchors, not NuxtLink: vue-router never intercepts them, so the
      browser does its own in-page scroll and honours the scroll-margin set on
      heading targets in main.css. Routing through the hash would need the
      custom scrollBehavior and gains nothing.
    -->
    <nav class="hidden lg:sticky lg:top-20 lg:block" aria-labelledby="contents-heading">
      <p id="contents-heading" class="px-2.5 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Table of contents
      </p>
      <ul class="flex flex-col gap-0.5">
        <li v-for="item in items" :key="item.id">
          <a
            :href="`#${item.id}`"
            :class="[linkClass, active === item.id ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground']"
            :aria-current="active === item.id ? 'true' : undefined"
          >
            {{ item.label }}
          </a>
        </li>
      </ul>
    </nav>

    <!--
      Closed by default. An open list of five links on a phone pushes the
      first section a full screen down, and `open` cannot be made responsive
      without a flash of the wrong state on load.
    -->
    <details class="group mb-8 rounded-2xl border bg-background dark:bg-input/30 lg:hidden">
      <summary class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        Table of contents
        <svg
          class="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <ul class="flex flex-col gap-0.5 px-2 pb-2">
        <li v-for="item in items" :key="item.id">
          <a :href="`#${item.id}`" class="text-muted-foreground" :class="[linkClass]">
            {{ item.label }}
          </a>
        </li>
      </ul>
    </details>

    <div class="space-y-12">
      <slot />
    </div>
  </div>
</template>
