<script lang="ts" setup>
const route = useRoute()

/** The sidebar (and the header inside it) is collapsed on the homepage. */
const isHome = computed(() => route.path === '/')
</script>

<template>
  <div class="bg-background p-5 h-screen flex">
    <!-- sidebar menu only open when not in homepage -->
    <SiteSidebar />

    <div class="bg-card border rounded-xl grow flex flex-col overflow-auto scrollbar-thumb-muted-foreground/10">
      <a
        href="#main"
        class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <!--
        Homepage has no sidebar, so the bar carries the brand and GitHub link.
        Everywhere else the sidebar already shows those, so the bar shows the
        breadcrumb instead.
      -->
      <header class="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-3 sticky z-10 top-0 bg-card/70 backdrop-blur-2xl">
        <template v-if="isHome">
          <SiteBrand />
          <SiteGithubButton />
        </template>
        <SiteBreadcrumb v-else />
      </header>

      <main id="main" class="flex-1">
        <slot />
      </main>
      <SiteFooter />
      <SearchPalette />
    </div>
  </div>
</template>
