<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { AUTO_SCROLL, clampWpm, useSettingsStore } from '@/stores/settings'

/*
 * Floating auto-scroll control. Scrolls at the reader's words-per-minute pace, worked out
 * from how tall the text is on screen. Any touch, wheel or navigation key pauses it, so it
 * never fights the reader.
 */
const { content, words } = defineProps<{ content: HTMLElement | null; words: number }>()

const settings = useSettingsStore()
const root = ref<HTMLElement | null>(null)
const playing = ref(false)
const nearEnd = ref(false)

const wpm = computed(() => settings.autoScrollWpm)

let frame = 0
let lastTime = 0
let position = 0
let lastSet = 0

function pixelsPerSecond() {
  const height = content?.offsetHeight ?? 0
  if (!height || !words) return 40
  return (height / words) * (wpm.value / 60)
}

function maxScroll() {
  return document.documentElement.scrollHeight - window.innerHeight
}

function step(time: number) {
  if (!playing.value) return
  const seconds = lastTime ? Math.min(0.1, (time - lastTime) / 1000) : 0
  lastTime = time
  // The page moved without us (scrollbar drag, find in page): hand control back
  if (Math.abs(window.scrollY - lastSet) > 3) return stop()
  position = Math.min(maxScroll(), position + pixelsPerSecond() * seconds)
  window.scrollTo(0, position)
  lastSet = window.scrollY
  if (position >= maxScroll() - 1) return stop()
  frame = requestAnimationFrame(step)
}

function start() {
  position = window.scrollY
  lastSet = window.scrollY
  lastTime = 0
  playing.value = true
  frame = requestAnimationFrame(step)
  window.addEventListener('wheel', onUserInput, { passive: true })
  window.addEventListener('touchstart', onUserInput, { passive: true })
  window.addEventListener('keydown', onKey)
}

function stop() {
  playing.value = false
  cancelAnimationFrame(frame)
  window.removeEventListener('wheel', onUserInput)
  window.removeEventListener('touchstart', onUserInput)
  window.removeEventListener('keydown', onKey)
}

function insideControl(event: Event) {
  return event.target instanceof Node && Boolean(root.value?.contains(event.target))
}

function onUserInput(event: Event) {
  // Taps on the control itself shouldn't pause it
  if (!insideControl(event)) stop()
}

const NAV_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
  'Escape',
])
function onKey(event: KeyboardEvent) {
  if (NAV_KEYS.has(event.key) && !insideControl(event)) stop()
}

function changeSpeed(delta: number) {
  settings.autoScrollWpm = clampWpm(wpm.value + delta)
}

// Hide when there's nothing left to scroll, so it never covers the footer
function onScroll() {
  nearEnd.value = window.scrollY >= maxScroll() - 80
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  stop()
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div
    ref="root"
    class="auto-scroll"
    :class="{ playing, hidden: nearEnd && !playing }"
    role="group"
    aria-label="Auto-scroll"
  >
    <template v-if="playing">
      <button
        type="button"
        class="step"
        aria-label="Slower"
        :disabled="wpm <= AUTO_SCROLL.min"
        @click="changeSpeed(-AUTO_SCROLL.step)"
      >
        −
      </button>
      <span class="speed" aria-live="polite">{{ wpm }}<small> wpm</small></span>
      <button
        type="button"
        class="step"
        aria-label="Faster"
        :disabled="wpm >= AUTO_SCROLL.max"
        @click="changeSpeed(AUTO_SCROLL.step)"
      >
        +
      </button>
      <button type="button" class="main" aria-label="Pause auto-scroll" @click="stop">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" /></svg>
      </button>
    </template>
    <button
      v-else
      type="button"
      class="main"
      :aria-label="`Start auto-scroll at ${wpm} words per minute`"
      :title="`Auto-scroll (${wpm} wpm)`"
      @click="start"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 6l5 5 5-5M7 13l5 5 5-5" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.auto-scroll {
  position: fixed;
  z-index: 20;
  /* Sit beside the reading column on wide screens, in the corner on phones */
  right: max(1rem, calc((100vw - 44rem) / 2 - 4.5rem), env(safe-area-inset-right));
  bottom: calc(1rem + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 0.15rem;
  border-radius: 999px;
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.auto-scroll.playing {
  padding: 0.25rem;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  box-shadow: 0 6px 20px var(--c-shadow);
}

.auto-scroll.hidden {
  opacity: 0;
  transform: translateY(0.5rem);
  pointer-events: none;
}

button {
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  font: inherit;
  cursor: pointer;
}

.main {
  width: 2.75rem;
  height: 2.75rem;
  background: var(--c-accent);
  color: var(--c-on-accent);
  box-shadow: 0 4px 14px var(--c-shadow);
  opacity: 0.92;
}

.playing .main {
  width: 2.25rem;
  height: 2.25rem;
  box-shadow: none;
  opacity: 1;
}

.main:hover {
  background: var(--c-accent-hover);
  opacity: 1;
}

.main svg {
  width: 1.2rem;
  height: 1.2rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.step {
  width: 2.25rem;
  height: 2.25rem;
  background: none;
  color: var(--c-text);
  font-size: 1.3rem;
  line-height: 1;
}

.step:hover:not(:disabled) {
  background: var(--c-surface-hover);
}

.step:disabled {
  opacity: 0.35;
  cursor: default;
}

.speed {
  min-width: 4.2rem;
  font-size: 0.9rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: var(--c-text);
}

.speed small {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--c-text-muted);
}

/* Wide screens: sit in the margin beside the reading column and grow outward, never over text */
@media (min-width: 72rem) {
  .auto-scroll {
    right: auto;
    left: calc(50% + 23rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auto-scroll {
    transition: none;
  }
}
</style>
