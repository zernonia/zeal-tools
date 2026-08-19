<script setup lang="ts">
defineProps<{ title?: string, description?: string }>()
</script>

<template>
  <!--
    Rendered by satori at build time, not in the browser, so this is a
    deliberately plain subset of CSS: explicit flex everywhere, no gap
    shorthand on text, no CSS variables. The palette is written out in hex for
    the same reason — satori never sees our theme tokens.

    Geist, not the pixel display face: see the note in nuxt.config for why the
    latter cannot reach satori without dragging in another font module.
  -->
  <div style="width:1200px;height:630px;display:flex;flex-direction:column;justify-content:space-between;background:#1c1917;padding:80px;font-family:'Geist'">
    <div style="display:flex;align-items:center">
      <svg width="72" height="72" viewBox="0 0 24 24" fill="#fafaf9">
        <path d="M10.3333 11.6667V10.6667H6.33333L6.33333 11.6667H10.3333Z" />
        <path d="M6.33333 6.66666L5.33333 6.66666L5.33333 10.6667H6.33333V6.66666Z" />
        <path d="M10.3333 6.66666V5.66666L6.33333 5.66666V6.66666L10.3333 6.66666Z" />
        <path d="M11.3333 6.66666L10.3333 6.66666V10.6667H11.3333V6.66666Z" />
        <path d="M13.3333 6.66666L12.3333 6.66666V10.6667H13.3333V6.66666Z" />
        <path d="M17.3333 6.66666V5.66666L13.3333 5.66666V6.66666L17.3333 6.66666Z" />
        <path d="M17.3333 11.6667V10.6667H13.3333V11.6667H17.3333Z" />
        <path d="M18.3333 6.66666L17.3333 6.66666V10.6667H18.3333V6.66666Z" />
        <path d="M6.33333 13.6667H5.33333L5.33333 17.6667H6.33333V13.6667Z" />
        <path d="M10.3333 13.6667V12.6667H6.33333V13.6667H10.3333Z" />
        <path d="M10.3333 18.6667V17.6667H6.33333L6.33333 18.6667H10.3333Z" />
        <path d="M11.3333 13.6667H10.3333V17.6667H11.3333V13.6667Z" />
        <path d="M13.3333 13.6667H12.3333V17.6667H13.3333V13.6667Z" />
        <path d="M17.3333 18.6667V17.6667H13.3333V18.6667H17.3333Z" />
        <path d="M18.3333 13.6667H17.3333V17.6667H18.3333V13.6667Z" />
        <path d="M17.3333 13.6667V12.6667H13.3333V13.6667H17.3333Z" />
      </svg>
      <div style="display:flex;margin-left:24px;font-size:38px;color:#fafaf9">
        zeal.tools
      </div>
    </div>

    <div style="display:flex;flex-direction:column">
      <div style="display:flex;font-size:68px;color:#fafaf9;line-height:1.15">
        {{ title || 'Free tools, made with zeal.' }}
      </div>
      <div v-if="description" style="display:flex;margin-top:24px;font-size:30px;color:#a8a29e;line-height:1.35">
        {{ description }}
      </div>
    </div>

    <div style="display:flex;font-size:26px;color:#78716c">
      No sign-up · No watermark · Open source
    </div>
  </div>
</template>
