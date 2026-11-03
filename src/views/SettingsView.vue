<script setup lang="ts">
import { computed } from 'vue'
import { READING_GOALS } from '@/data/library'
import { TEXTS, VERSIONS } from '@/data/versions'
import { readingForDate, todayKey } from '@/lib/readingPlan'
import { AUTO_SCROLL, useSettingsStore, type Theme } from '@/stores/settings'

const settings = useSettingsStore()
const today = computed(() => readingForDate(todayKey()))

const themes: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'greyscale', label: 'Greyscale' },
  { value: 'whitescale', label: 'Whitescale' },
]
</script>

<template>
  <section class="settings">
    <h1>Settings</h1>

    <fieldset class="group">
      <legend>Appearance</legend>
      <div class="segmented themes" role="radiogroup" aria-label="Theme">
        <label v-for="t in themes" :key="t.value" :class="{ active: settings.theme === t.value }">
          <input v-model="settings.theme" type="radio" name="theme" :value="t.value" />
          {{ t.label }}
        </label>
      </div>
    </fieldset>

    <fieldset class="group">
      <legend>Daily reading goal</legend>
      <p class="hint">
        How much to read each day in the Library. When you finish the paragraph that reaches your
        goal, you'll get a congratulations and a book mark on the calendar.
      </p>
      <div class="segmented" role="radiogroup" aria-label="Daily reading goal">
        <label
          v-for="g in READING_GOALS"
          :key="g.words"
          :class="{ active: settings.readingGoal === g.words }"
        >
          <input v-model="settings.readingGoal" type="radio" name="goal" :value="g.words" />
          {{ g.pages }} pages
          <span class="sub">{{ g.words.toLocaleString() }} words</span>
        </label>
      </div>
    </fieldset>

    <fieldset class="group">
      <legend>Auto-scroll speed</legend>
      <p class="hint">
        Tap the arrow button in the corner while reading to scroll hands-free. Touching or scrolling
        the page pauses it. You can also change the speed while it's scrolling.
      </p>
      <div class="speed">
        <input
          v-model.number="settings.autoScrollWpm"
          type="range"
          :min="AUTO_SCROLL.min"
          :max="AUTO_SCROLL.max"
          :step="AUTO_SCROLL.step"
          aria-label="Auto-scroll speed in words per minute"
        />
        <output>{{ settings.autoScrollWpm }} words per minute</output>
      </div>
    </fieldset>

    <fieldset class="group">
      <legend>Bible version</legend>
      <p class="hint">
        The {{ TEXTS.kjv.name }} is public domain, so its text appears right on the page. The ESV,
        NIV, CSB and NLT are copyrighted, so the page shows the {{ TEXTS.web.name }} for those, with
        a link under each chapter to read it in your version.
      </p>

      <ul class="versions">
        <li v-for="v in VERSIONS" :key="v.id">
          <label class="version" :class="{ active: settings.version === v.id }">
            <input v-model="settings.version" type="radio" name="version" :value="v.id" />
            <span class="version-name">
              <strong>{{ v.id }}</strong>
              <span>{{ v.name }}</span>
            </span>
            <span class="badge">{{ v.text === 'kjv' ? 'Text on page' : 'Link out' }}</span>
          </label>
          <div class="links">
            <a :href="v.chapterUrl(today)" target="_blank" rel="noopener"
              >Today's chapter in the {{ v.id }} ↗</a
            >
            <a :href="v.homeUrl" target="_blank" rel="noopener">About the {{ v.id }} ↗</a>
          </div>
        </li>
      </ul>
    </fieldset>
  </section>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

h1 {
  font-family: var(--font-serif);
  font-size: clamp(1.6rem, 7vw, 2rem);
}

.group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
  padding: 0;
  border: 0;
}

legend {
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-accent);
}

.hint {
  font-size: 0.9rem;
  color: var(--c-text-muted);
}

input[type='radio'] {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.segmented {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr));
  gap: 0.25rem;
  max-width: 32rem;
  padding: 0.25rem;
  border: 1px solid var(--c-border);
  border-radius: 1.4rem;
  background: var(--c-surface);
}

.segmented label {
  padding: 0.45rem 0.75rem;
  text-align: center;
  border-radius: 999px;
  font-weight: 600;
  color: var(--c-text-muted);
  cursor: pointer;
}

.segmented .sub {
  display: block;
  font-size: 0.7rem;
  font-weight: 500;
}

.segmented label.active {
  background: var(--c-accent);
  color: var(--c-on-accent);
}

.segmented label:has(input:focus-visible),
.version:has(input:focus-visible) {
  outline: 2px solid var(--c-accent);
  outline-offset: 2px;
}

.versions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0;
  list-style: none;
}

.versions li {
  border: 1px solid var(--c-border);
  border-radius: 12px;
  background: var(--c-surface);
  overflow: hidden;
}

.version {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem 1rem;
  cursor: pointer;
}

.version:hover {
  background: var(--c-surface-hover);
}

.version::before {
  content: '';
  flex: none;
  width: 1.1rem;
  height: 1.1rem;
  border: 2px solid var(--c-border);
  border-radius: 50%;
}

.version.active::before {
  border: 5px solid var(--c-accent);
}

.version-name {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.6rem;
}

.version-name span {
  font-size: 0.9rem;
  color: var(--c-text-muted);
}

.badge {
  flex: none;
  padding: 0.15rem 0.6rem;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--c-text-muted);
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.25rem;
  padding: 0 1rem 0.8rem 2.85rem;
  font-size: 0.85rem;
}

.themes {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

@media (max-width: 480px) {
  .themes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.speed {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  max-width: 32rem;
}

.speed input {
  flex: 1 1 12rem;
  accent-color: var(--c-accent);
}

.speed output {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
