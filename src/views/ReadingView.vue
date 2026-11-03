<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import CompletionCheck from '@/components/CompletionCheck.vue'
import AutoScroll from '@/components/AutoScroll.vue'
import WeekStrip from '@/components/WeekStrip.vue'
import { useChapter } from '@/composables/useChapter'
import { TEXTS } from '@/data/versions'
import { dayRoute } from '@/lib/dayRoute'
import { addDays, fromDateKey, isDateKey, readingForDate, todayKey } from '@/lib/readingPlan'
import { useProgressStore } from '@/stores/progress'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps<{ date?: string }>()

const router = useRouter()
const progress = useProgressStore()
const settings = useSettingsStore()

const today = todayKey()
const date = computed(() => (isDateKey(props.date) ? props.date : today))
const reading = computed(() => readingForDate(date.value))
const version = computed(() => settings.bibleVersion)
const text = computed(() => version.value.text)
const { verses, loading, error } = useChapter(reading, text)
const textEl = ref<HTMLElement | null>(null)
const chapterWords = computed(() =>
  verses.value.reduce((sum, [, t]) => sum + t.split(/\s+/).filter(Boolean).length, 0),
)

const isToday = computed(() => date.value === today)
const isComplete = computed(() => progress.isComplete(date.value))
const prevDate = computed(() => addDays(date.value, -1))
const nextDate = computed(() => addDays(date.value, 1))

const dateLabel = computed(() =>
  fromDateKey(date.value).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }),
)

const celebrating = ref(false)

function complete() {
  progress.markComplete(date.value)
  celebrating.value = true
}

// Once the checkmark has played, move straight on to the next chapter
function celebrationDone() {
  celebrating.value = false
  router.push(dayRoute(nextDate.value))
}
</script>

<template>
  <article class="reading">
    <nav class="day-nav" aria-label="Change day">
      <RouterLink :to="dayRoute(prevDate)" class="arrow" aria-label="Previous day">‹</RouterLink>
      <div class="day-label">
        <RouterLink
          :to="{ name: 'calendar', query: { month: date.slice(0, 7) } }"
          class="date"
          title="Open the calendar"
          >{{ dateLabel }}</RouterLink
        >
        <RouterLink v-if="!isToday" :to="{ name: 'today' }" class="back-today"
          >Back to today</RouterLink
        >
      </div>
      <RouterLink :to="dayRoute(nextDate)" class="arrow" aria-label="Next day">›</RouterLink>
    </nav>

    <WeekStrip :date="date" />

    <header class="title">
      <!-- Days before the plan start have no day number -->
      <p v-if="reading.day > 0" class="eyebrow">Day {{ reading.day }}</p>
      <h1>
        {{ reading.book.name }} {{ reading.chapter }}
        <span v-if="isComplete" class="done-badge" title="Completed">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4 8-9" /></svg>
          <span class="sr-only">Completed</span>
        </span>
      </h1>
    </header>

    <p v-if="loading" class="status">Loading…</p>
    <p v-else-if="error" class="status error">{{ error }}</p>
    <div v-else ref="textEl" class="text">
      <p>
        <span v-for="[n, text] in verses" :key="n" class="verse"
          ><sup>{{ n }}</sup
          >{{ text }}
        </span>
      </p>
      <p class="translation">
        {{ TEXTS[text].name }} (public domain)
        <template v-if="version.text !== 'kjv'">
          ·
          <a :href="version.chapterUrl(reading)" target="_blank" rel="noopener"
            >Read this chapter in the {{ version.id }} ↗</a
          >
        </template>
      </p>
    </div>

    <footer class="actions">
      <template v-if="isComplete">
        <p class="completed-note">You finished this chapter. Well done!</p>
        <RouterLink :to="dayRoute(nextDate)" class="next-link">Next chapter ›</RouterLink>
        <button type="button" class="link-button" @click="progress.markIncomplete(date)">
          Undo
        </button>
      </template>
      <button v-else type="button" class="complete-button" :disabled="loading" @click="complete">
        I've finished this chapter
      </button>
    </footer>

    <AutoScroll v-if="verses.length" :content="textEl" :words="chapterWords" />
    <CompletionCheck v-if="celebrating" @done="celebrationDone" />
  </article>
</template>

<style scoped>
.reading {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.day-nav {
  display: grid;
  grid-template-columns: 2.75rem 1fr 2.75rem;
  align-items: center;
  text-align: center;
}

.arrow {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  font-size: 1.75rem;
  line-height: 1;
  color: var(--c-text-muted);
  text-decoration: none;
}

a.arrow:hover {
  background: var(--c-surface-hover);
  color: var(--c-text);
}

.date {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  font-weight: 600;
  color: var(--c-text);
  text-decoration: none;
}

.date:hover {
  background: var(--c-surface-hover);
}

.back-today {
  display: block;
  font-size: 0.875rem;
}

.title {
  text-align: center;
}

.eyebrow {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-accent);
}

h1 {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0.25rem 0 0.5rem;
  font-family: var(--font-serif);
  font-size: clamp(2rem, 6vw, 2.75rem);
  line-height: 1.15;
}

.done-badge {
  display: inline-grid;
  place-items: center;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 50%;
  background: var(--c-success);
}

.done-badge svg {
  width: 70%;
  fill: none;
  stroke: var(--c-on-success);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.text {
  font-family: var(--font-serif);
  font-size: 1.15rem;
  line-height: 1.85;
}

sup {
  margin-right: 0.2em;
  font-family: var(--font-sans);
  font-size: 0.65em;
  font-weight: 600;
  color: var(--c-text-muted);
}

.translation {
  margin-top: 1rem;
  font-family: var(--font-sans);
  font-size: 0.8rem;
  color: var(--c-text-muted);
}

.actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 0 1rem;
  border-top: 1px solid var(--c-border);
}

.complete-button {
  padding: 0.9rem 1.75rem;
  border: 0;
  border-radius: 999px;
  background: var(--c-success);
  color: var(--c-on-success);
  font: inherit;
  font-weight: 700;
  font-size: 1.05rem;
  cursor: pointer;
  box-shadow: 0 6px 18px var(--c-success-glow);
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}

.complete-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px var(--c-success-glow);
}

.complete-button:disabled {
  opacity: 0.6;
  cursor: default;
}

.completed-note {
  font-weight: 600;
  color: var(--c-success-text);
}

.next-link {
  padding: 0.6rem 1.4rem;
  border-radius: 999px;
  background: var(--c-accent);
  color: var(--c-on-accent);
  font-weight: 600;
  text-decoration: none;
}

.next-link:hover {
  background: var(--c-accent-hover);
}

.link-button {
  border: 0;
  background: none;
  color: var(--c-text-muted);
  font: inherit;
  font-size: 0.875rem;
  text-decoration: underline;
  cursor: pointer;
}

.status {
  text-align: center;
  color: var(--c-text-muted);
}

.error {
  color: var(--c-danger);
}
</style>
