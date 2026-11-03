<template>
  <!-- Small speech bubble marking a day the tongue twister was practised -->
  <svg class="twister-mark" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3.5 5h17v11h-10l-5 4v-4h-2z" />
  </svg>
</template>

<style scoped>
.twister-mark {
  position: absolute;
  top: 0.2rem;
  left: 0.2rem;
  width: 0.85rem;
  height: 0.85rem;
  fill: var(--c-accent);
  stroke: var(--c-bg);
  stroke-width: 1.5;
  stroke-linejoin: round;
}
</style>
