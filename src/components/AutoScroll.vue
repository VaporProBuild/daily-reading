<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { AUTO_SCROLL, useSettingsStore } from '@/stores/settings'

/*
 * Floating auto-scroll control. Scrolls at the reader's words-per-minute pace, worked out
 * from how tall the text is on screen. Any touch, wheel or navigation key on the page pauses
 * it, so it never fights the reader. Starting slides out a speed slider; a few seconds later
 * it tucks back into a small pause button so only the text has attention.
 */
const { content, words } = defineProps<{ content: HTMLElement | null; words: number }>()
/** Fired when scrolling reaches the bottom of the page on its own (not when paused) */
const emit = defineEmits<{ end: [] }>()

const MINIMIZE_AFTER_MS = 3000

const settings = useSettingsStore()
const root = ref<HTMLElement | null>(null)
const playing = ref(false)
const expanded = ref(false)
const nearEnd = ref(false)

const wpm = computed(() => settings.autoScrollWpm)

let frame = 0
let lastTime = 0
let position = 0
let lastSet = 0
let minimizeTimer: ReturnType<typeof setTimeout> | undefined

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
  if (position >= maxScroll() - 1) {
    stop()
    emit('end')
    return
  }
  frame = requestAnimationFrame(step)
}

/** Starts scrolling; `quiet` skips showing the speed slider (used when moving to a new chapter) */
function start(quiet = false) {
  position = window.scrollY
  lastSet = window.scrollY
  lastTime = 0
  playing.value = true
  if (!quiet) expand()
  frame = requestAnimationFrame(step)
  window.addEventListener('wheel', onUserInput, { passive: true })
  window.addEventListener('touchstart', onUserInput, { passive: true })
  window.addEventListener('keydown', onKey)
}

function stop() {
  playing.value = false
  expanded.value = false
  clearTimeout(minimizeTimer)
  cancelAnimationFrame(frame)
  window.removeEventListener('wheel', onUserInput)
  window.removeEventListener('touchstart', onUserInput)
  window.removeEventListener('keydown', onKey)
}

/** Slide the speed slider out, then tuck it away once the reader stops adjusting it */
function expand() {
  expanded.value = true
  scheduleMinimize()
}

function scheduleMinimize() {
  clearTimeout(minimizeTimer)
  if (playing.value) minimizeTimer = setTimeout(() => (expanded.value = false), MINIMIZE_AFTER_MS)
}

/** Keep the slider open while a finger or mouse is on it */
function holdOpen() {
  clearTimeout(minimizeTimer)
}

function insideControl(event: Event) {
  return event.target instanceof Node && Boolean(root.value?.contains(event.target))
}

function onUserInput(event: Event) {
  // Touches on the control itself shouldn't pause it
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

// Hide when there's nothing left to scroll, so it never covers the footer
function onScroll() {
  nearEnd.value = window.scrollY >= maxScroll() - 80
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

defineExpose({ start, stop, playing })

onBeforeUnmount(() => {
  stop()
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div
    ref="root"
    class="auto-scroll"
    :class="{ playing, open: playing && expanded, hidden: nearEnd && !playing }"
    role="group"
    aria-label="Auto-scroll"
    @pointerdown="holdOpen"
    @pointerup="scheduleMinimize"
    @pointercancel="scheduleMinimize"
    @focusin="holdOpen"
    @focusout="scheduleMinimize"
  >
    <div class="panel" :inert="!(playing && expanded)">
      <input
        v-model.number="settings.autoScrollWpm"
        class="slider"
        type="range"
        :min="AUTO_SCROLL.min"
        :max="AUTO_SCROLL.max"
        :step="AUTO_SCROLL.step"
        aria-label="Auto-scroll speed"
        :aria-valuetext="`${wpm} words per minute`"
      />
      <span class="speed" aria-hidden="true">{{ wpm }}<small> wpm</small></span>
    </div>
    <button
      type="button"
      class="main"
      :aria-label="playing ? 'Pause auto-scroll' : `Start auto-scroll at ${wpm} words per minute`"
      :title="playing ? 'Pause' : `Auto-scroll (${wpm} wpm)`"
      @click="playing ? stop() : start()"
    >
      <svg class="icon play" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 6l5 5 5-5M7 13l5 5 5-5" />
      </svg>
      <svg class="icon pause" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5v14M16 5v14" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
/* One element that morphs between three states:
   idle (accent start button) → open (slider + speed + pause) → working (small quiet pause) */
.auto-scroll {
  --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
  position: fixed;
  z-index: 20;
  /* Sit beside the reading column on wide screens, in the corner on phones */
  right: max(1rem, calc((100vw - 44rem) / 2 - 4.5rem), env(safe-area-inset-right));
  bottom: calc(1rem + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  padding: 0.2rem;
  border: 1px solid transparent;
  border-radius: 999px;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  animation: appear 0.35s var(--ease) both;
  transition:
    background-color 0.3s var(--ease),
    border-color 0.3s var(--ease),
    box-shadow 0.3s var(--ease),
    opacity 0.3s var(--ease),
    transform 0.3s var(--ease);
}

.auto-scroll.open {
  border-color: var(--c-border);
  background: var(--c-surface);
  box-shadow: 0 6px 20px var(--c-shadow);
}

.auto-scroll.hidden {
  opacity: 0;
  transform: translateY(0.75rem);
  pointer-events: none;
}

/* Slider and speed slide out of the button and tuck back in */
.panel {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 0;
  overflow: hidden;
  opacity: 0;
  transition:
    max-width 0.4s var(--ease),
    opacity 0.2s ease,
    padding 0.4s var(--ease);
}

.open .panel {
  max-width: 15rem;
  padding: 0 0.5rem 0 0.6rem;
  opacity: 1;
  transition:
    max-width 0.4s var(--ease),
    opacity 0.3s ease 0.1s,
    padding 0.4s var(--ease);
}

.slider {
  width: min(9rem, 38vw);
  height: 2.25rem;
  margin: 0;
  accent-color: var(--c-accent);
  cursor: pointer;
}

.speed {
  min-width: 3.4rem;
  font-size: 0.85rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--c-text);
}

.speed small {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--c-text-muted);
}

.main {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  width: 2.75rem;
  height: 2.75rem;
  border: 0;
  border-radius: 999px;
  background: var(--c-accent);
  color: var(--c-on-accent);
  box-shadow: 0 4px 14px var(--c-shadow);
  cursor: pointer;
  transition:
    width 0.35s var(--ease),
    height 0.35s var(--ease),
    background-color 0.3s var(--ease),
    color 0.3s var(--ease),
    box-shadow 0.3s var(--ease);
}

.main:hover {
  background: var(--c-accent-hover);
}

/* Working: a small, quiet pause button */
.playing .main {
  width: 2.25rem;
  height: 2.25rem;
  background: var(--c-surface);
  color: var(--c-accent);
  box-shadow: 0 3px 10px var(--c-shadow);
}

.playing .main:hover {
  background: var(--c-surface-hover);
}

.open .main {
  background: var(--c-accent);
  color: var(--c-on-accent);
  box-shadow: none;
}

/* Play and pause icons cross-fade with a little turn */
.icon {
  position: absolute;
  width: 1.2rem;
  height: 1.2rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition:
    opacity 0.25s ease,
    transform 0.35s var(--ease);
}

.pause {
  opacity: 0;
  transform: rotate(-90deg) scale(0.6);
}

.playing .play {
  opacity: 0;
  transform: rotate(90deg) scale(0.6);
}

.playing .pause {
  opacity: 1;
  transform: none;
}

@keyframes appear {
  from {
    opacity: 0;
    transform: translateY(0.75rem) scale(0.9);
  }
}

/* Wide screens: sit in the margin beside the reading column and grow outward, never over text */
@media (min-width: 72rem) {
  .auto-scroll {
    right: auto;
    left: calc(50% + 23rem);
    flex-direction: row-reverse;
  }

  .open .panel {
    padding: 0 0.6rem 0 0.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auto-scroll,
  .panel,
  .open .panel,
  .main,
  .icon {
    animation: none;
    transition: none;
  }
}
</style>
