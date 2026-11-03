<script setup lang="ts">
import { computed } from 'vue'
import { READING_GOALS, WORDS_PER_PAGE } from '@/data/library'
import { useLibraryStore } from '@/stores/library'
import { useSettingsStore } from '@/stores/settings'

const { compact = false } = defineProps<{ compact?: boolean }>()

const library = useLibraryStore()
const settings = useSettingsStore()

const goal = computed(() => settings.readingGoal)
const pages = computed(() => READING_GOALS.find((g) => g.words === goal.value)?.pages ?? 0)
const words = computed(() => library.wordsToday)
const percent = computed(() => Math.min(100, Math.round((words.value / goal.value) * 100)))
const done = computed(() => words.value >= goal.value)
const fmt = (n: number) => n.toLocaleString()
</script>

<template>
  <div class="goal" :class="{ compact, done }">
    <div class="label">
      <template v-if="compact">{{ fmt(words) }} / {{ fmt(goal) }}</template>
      <template v-else-if="done">
        <strong>Daily goal reached</strong>
        <span>{{ fmt(words) }} words today · goal {{ fmt(goal) }}</span>
      </template>
      <template v-else>
        <strong>{{ fmt(words) }} of {{ fmt(goal) }} words today</strong>
        <span
          >About {{ Math.floor(words / WORDS_PER_PAGE) }} of {{ pages }} pages ·
          {{ fmt(goal - words) }} words to go</span
        >
      </template>
    </div>
    <div
      class="bar"
      role="progressbar"
      :aria-valuenow="percent"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="Daily reading goal"
    >
      <span :style="{ width: `${percent}%` }" />
    </div>
  </div>
</template>

<style scoped>
.goal {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  background: var(--c-surface);
}

.label {
  display: flex;
  flex-direction: column;
}

.label span {
  font-size: 0.85rem;
  color: var(--c-text-muted);
}

.done strong {
  color: var(--c-success-text);
}

.bar {
  height: 0.5rem;
  border-radius: 999px;
  background: var(--c-surface-hover);
  overflow: hidden;
}

.bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--c-success);
  transition: width 0.4s ease;
}

.compact {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  padding: 0;
  border: 0;
  background: none;
}

.compact .label {
  font-size: 0.75rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--c-text-muted);
  white-space: nowrap;
}

.compact.done .label {
  color: var(--c-success-text);
}

.compact .bar {
  width: 3.5rem;
  height: 0.35rem;
}
</style>
