<script setup lang="ts">
import type { CoinSide } from '../../core'

/**
 * One face of the coin: a milled rim, a domed field and a raised letter.
 * Heads is struck in the primary colour and tails in a muted one, so the two
 * read apart at a glance in either theme — and the letter is there for anyone
 * who cannot tell the colours apart. Decorative; the caller says the result.
 *
 * `lg` is the coin in the air, with its legend around the edge; `sm` is a
 * token in a batch or the history strip.
 */
const props = withDefaults(defineProps<{ side: CoinSide, size?: 'lg' | 'sm' }>(), { size: 'lg' })

const legend = computed(() => `${(props.side === 'heads' ? 'HEADS · ' : 'TAILS · ').repeat(4)}`)
const pathId = useId()
</script>

<template>
  <div class="coin-art" :class="[side === 'heads' ? 'coin-heads' : 'coin-tails-face', size === 'lg' ? 'coin-lg' : 'coin-sm']" aria-hidden="true">
    <svg v-if="size === 'lg'" viewBox="0 0 100 100" class="coin-legend">
      <defs>
        <path :id="pathId" d="M50,50 m-31,0 a31,31 0 1,1 62,0 a31,31 0 1,1 -62,0" />
      </defs>
      <!-- Stretched to the whole circumference, so the legend runs all the way round. -->
      <text font-size="6.6" font-weight="700">
        <textPath :href="`#${pathId}`" startOffset="0" textLength="193" lengthAdjust="spacing">{{ legend }}</textPath>
      </text>
    </svg>
    <span class="coin-letter">{{ side === 'heads' ? 'H' : 'T' }}</span>
  </div>
</template>

<style scoped>
.coin-art {
  --face: var(--primary);
  --ink: var(--primary-foreground);
  position: relative;
  container-type: inline-size;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  /* The milled edge: fine alternating ridges all the way round. */
  background: repeating-conic-gradient(
    color-mix(in oklab, var(--face) 78%, var(--ink)) 0deg 2.5deg,
    color-mix(in oklab, var(--face) 92%, black) 2.5deg 5deg
  );
  box-shadow:
    0 1px 0 color-mix(in oklab, var(--face) 60%, black),
    0 10px 24px -14px rgb(0 0 0 / 0.6);
}

.coin-tails-face {
  --face: color-mix(in oklab, var(--muted-foreground) 30%, var(--card));
  --ink: var(--foreground);
}

/* The domed field, lit from the top left. */
.coin-art::before {
  content: '';
  position: absolute;
  inset: 7%;
  border-radius: inherit;
  background: radial-gradient(
    circle at 32% 26%,
    color-mix(in oklab, var(--face) 72%, white) 0%,
    var(--face) 52%,
    color-mix(in oklab, var(--face) 82%, black) 100%
  );
  box-shadow:
    inset 0 2px 2px rgb(255 255 255 / 0.22),
    inset 0 -3px 6px rgb(0 0 0 / 0.28);
}

/* A beaded ring just inside the rim, as on most real coins. */
.coin-lg::after {
  content: '';
  position: absolute;
  inset: 9.5%;
  border-radius: inherit;
  border: 2px dotted color-mix(in oklab, var(--ink) 45%, transparent);
}

.coin-legend {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  fill: color-mix(in oklab, var(--ink) 70%, transparent);
  font-family: var(--font-sans);
}

.coin-letter {
  position: relative;
  color: var(--ink);
  font-weight: 800;
  line-height: 1;
  /* Struck, not printed: a highlight above and a shadow below the letter. */
  text-shadow:
    0 -1px 0 rgb(255 255 255 / 0.25),
    0 2px 2px rgb(0 0 0 / 0.35);
}

.coin-lg .coin-letter {
  font-size: 34cqw;
}

.coin-sm .coin-letter {
  font-size: 42cqw;
  text-shadow: none;
}

.coin-sm {
  box-shadow: 0 1px 0 color-mix(in oklab, var(--face) 60%, black);
}

.coin-sm::before {
  inset: 10%;
  box-shadow: inset 0 -1px 2px rgb(0 0 0 / 0.25);
}
</style>
