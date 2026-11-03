<template>
  <!-- Small book badge marking a day the library reading goal was reached -->
  <svg class="library-mark" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v15.5H8.5A2.5 2.5 0 0 1 6 18z" />
    <path d="M6 18a2.5 2.5 0 0 1 2.5-2.5h10" />
  </svg>
</template>

<style scoped>
.library-mark {
  position: absolute;
  top: 0.2rem;
  right: 0.2rem;
  width: 0.85rem;
  height: 0.85rem;
  fill: var(--c-accent);
  stroke: var(--c-bg);
  stroke-width: 1.5;
  stroke-linejoin: round;
}
</style>
