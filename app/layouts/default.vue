<script lang="ts" setup>
const route = useRoute()
const { open: drawerOpen } = useSidebar()
const { mounted: paletteMounted } = useSearchPalette()

/**
 * The homepage is the tool index, so it gets no sidebar and no breadcrumb —
 * the header carries the brand there instead. Below `lg` the sidebar is a
 * drawer, so the header carries the brand on every route.
 */
const isHome = computed(() => route.path === '/')

// NOTE: the card below needs `relative`. `.sr-only` is position:absolute, and
// overflow only clips absolutely-positioned descendants whose containing block
// is inside it — without it the sr-only file input escapes to the initial
// containing block and stretches the document into a second scrollbar.
</script>

<template>
  <div class="bg-background p-5 h-screen flex">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
    >
      Skip to content
    </a>

    <SiteSidebar />

    <div
      class="bg-card border rounded-xl grow flex flex-col overflow-auto relative transition-transform duration-300 ease-out scrollbar-thumb-muted-foreground/10 shadow"
      :class="drawerOpen ? 'scale-[0.97] lg:scale-100' : 'scale-100'"
    >
      <header class="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-3 sticky z-10 top-0 bg-card/70 backdrop-blur-2xl">
        <div class="flex min-w-0 items-center gap-2">
          <SiteBrand :class="{ 'lg:hidden': !isHome }" />
          <SiteSidebarTrigger />
          <SiteBreadcrumb v-if="!isHome" class="hidden lg:block" />
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <SiteSearchButton />
          <SiteThemeToggle />
          <SiteGithubButton />
        </div>
      </header>

      <main id="main" tabindex="-1" class="flex-1 outline-none">
        <slot />
      </main>
      <SiteFooter />
      <LazySearchPalette v-if="paletteMounted" />
    </div>
  </div>
</template>
