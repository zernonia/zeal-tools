<template>
  <!--
    The mark from public/logo.svg, inlined so it can take `currentColor`. The
    file itself is hardcoded to black, which would vanish against the dark
    theme — as an <img> there would be no way to recolour it.

    Its sixteen paths are the four sides of four boxes, grouped here so each
    box can be animated as one. `--i` carries the clockwise position, which is
    all the stagger in main.css needs.
  -->
  <svg
    class="site-logo"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <g style="--i: 0">
      <path d="M10.3333 11.6667V10.6667H6.33333L6.33333 11.6667H10.3333Z" />
      <path d="M6.33333 6.66666L5.33333 6.66666L5.33333 10.6667H6.33333V6.66666Z" />
      <path d="M10.3333 6.66666V5.66666L6.33333 5.66666V6.66666L10.3333 6.66666Z" />
      <path d="M11.3333 6.66666L10.3333 6.66666V10.6667H11.3333V6.66666Z" />
    </g>
    <g style="--i: 1">
      <path d="M13.3333 6.66666L12.3333 6.66666V10.6667H13.3333V6.66666Z" />
      <path d="M17.3333 6.66666V5.66666L13.3333 5.66666V6.66666L17.3333 6.66666Z" />
      <path d="M17.3333 11.6667V10.6667H13.3333V11.6667H17.3333Z" />
      <path d="M18.3333 6.66666L17.3333 6.66666V10.6667H18.3333V6.66666Z" />
    </g>
    <g style="--i: 2">
      <path d="M13.3333 13.6667H12.3333V17.6667H13.3333V13.6667Z" />
      <path d="M17.3333 18.6667V17.6667H13.3333V18.6667H17.3333Z" />
      <path d="M18.3333 13.6667H17.3333V17.6667H18.3333V13.6667Z" />
      <path d="M17.3333 13.6667V12.6667H13.3333V13.6667H17.3333Z" />
    </g>
    <g style="--i: 3">
      <path d="M6.33333 13.6667H5.33333L5.33333 17.6667H6.33333V13.6667Z" />
      <path d="M10.3333 13.6667V12.6667H6.33333V13.6667H10.3333Z" />
      <path d="M10.3333 18.6667V17.6667H6.33333L6.33333 18.6667H10.3333Z" />
      <path d="M11.3333 13.6667H10.3333V17.6667H11.3333V13.6667Z" />
    </g>
  </svg>
</template>
