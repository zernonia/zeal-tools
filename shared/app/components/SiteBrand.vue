<template>
  <!--
    The wordmark shares the display face with page titles. No `font-semibold`
    or `tracking-tight` here: Geist Pixel ships a single weight, so a heavier
    request would be synthesised and smear the grid, and negative tracking
    closes up glyphs that are already tightly gridded.
  -->
  <NuxtLink to="/" class="flex items-center gap-2 font-heading">
    <span class="grid size-7 place-items-center rounded-lg bg-primary text-sm text-primary-foreground">z</span>
    <span>zeal<span class="text-primary">.tools</span></span>
  </NuxtLink>
</template>
