<script lang="ts" setup>
import { SidebarInset, SidebarProvider } from '../../shared/app/components/ui/sidebar'

const route = useRoute()
const { mounted: paletteMounted } = useSearchPalette()

/**
 * The homepage is the tool index, so it gets a brand rather than a breadcrumb.
 */
const isHome = computed(() => route.path === '/')

// NOTE: the scroll container below needs `relative`. `.sr-only` is
// position:absolute, and overflow only clips absolutely-positioned descendants
// whose containing block is inside it — without it the sr-only file input in
// the QR tool escapes and stretches the document into a second scrollbar.
</script>

<template>
  <SidebarProvider>
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
    >
      Skip to content
    </a>

    <SiteSidebar />

    <SidebarInset class="relative overflow-auto scrollbar-thumb-muted-foreground/10">
      <header class="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border/70 bg-card/70 px-5 py-3 backdrop-blur-2xl">
        <div class="flex min-w-0 items-center gap-2">
          <SiteSidebarTrigger />
          <SiteBrand v-if="isHome" />
          <SiteBreadcrumb v-else class="hidden lg:block" />
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
    </SidebarInset>
  </SidebarProvider>
</template>
