<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import LibraryMark from '@/components/LibraryMark.vue'
import TwisterMark from '@/components/TwisterMark.vue'
import { dayRoute } from '@/lib/dayRoute'
import { addDays, fromDateKey, readingForDate, todayKey } from '@/lib/readingPlan'
import { useLibraryStore } from '@/stores/library'
import { useTwisterStore } from '@/stores/twister'
import { useProgressStore } from '@/stores/progress'

const props = defineProps<{ date: string }>()

const progress = useProgressStore()
const library = useLibraryStore()
const twister = useTwisterStore()
const today = todayKey()

// Sunday to Saturday of the week containing the selected day
const days = computed(() => {
  const sunday = addDays(props.date, -fromDateKey(props.date).getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(sunday, i)
    const date = fromDateKey(key)
    return {
      key,
      weekday: date.toLocaleDateString(undefined, { weekday: 'narrow' }),
      day: date.getDate(),
      reading: readingForDate(key),
      isSelected: key === props.date,
      isToday: key === today,
      isComplete: progress.isComplete(key),
      libraryGoal: library.goalMet(key),
      twisterDone: twister.isDone(key),
    }
  })
})

const prevWeek = computed(() => addDays(props.date, -7))
const nextWeek = computed(() => addDays(props.date, 7))
</script>

<template>
  <nav class="week" aria-label="Choose a day">
    <RouterLink :to="dayRoute(prevWeek)" class="arrow" aria-label="Previous week">‹</RouterLink>

    <ol class="days">
      <li v-for="d in days" :key="d.key">
        <RouterLink
          :to="dayRoute(d.key)"
          class="day"
          :class="{ selected: d.isSelected, today: d.isToday, complete: d.isComplete }"
          :aria-current="d.isSelected ? 'date' : undefined"
          :aria-label="`${fromDateKey(d.key).toLocaleDateString()}: ${d.reading.book.name} ${d.reading.chapter}${d.isComplete ? ', completed' : ''}${d.libraryGoal ? ', library goal reached' : ''}${d.twisterDone ? ', tongue twister done' : ''}`"
        >
          <TwisterMark v-if="d.twisterDone" />
          <LibraryMark v-if="d.libraryGoal" />
          <span class="weekday">{{ d.weekday }}</span>
          <span class="num">{{ d.day }}</span>
          <span class="mark" aria-hidden="true">
            <svg v-if="d.isComplete" viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9" /></svg>
          </span>
        </RouterLink>
      </li>
    </ol>

    <RouterLink :to="dayRoute(nextWeek)" class="arrow" aria-label="Next week">›</RouterLink>
  </nav>
</template>

<style scoped>
.week {
  display: grid;
  grid-template-columns: 2rem 1fr 2rem;
  align-items: center;
  gap: 0.25rem;
}

.arrow {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  font-size: 1.4rem;
  line-height: 1;
  color: var(--c-text-muted);
  text-decoration: none;
}

a.arrow:hover {
  background: var(--c-surface-hover);
  color: var(--c-text);
}

.days {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.3rem;
  padding: 0;
  list-style: none;
}

.day {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  padding: 0.4rem 0 0.35rem;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  background: var(--c-surface);
  color: var(--c-text);
  text-decoration: none;
  transition: background 0.15s;
}

a.day:hover {
  background: var(--c-surface-hover);
}

.weekday {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--c-text-muted);
}

.num {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
}

.mark {
  display: grid;
  place-items: center;
  width: 1.1rem;
  height: 1.1rem;
}

.complete .mark {
  border-radius: 50%;
  background: var(--c-success);
}

.mark svg {
  width: 75%;
  fill: none;
  stroke: var(--c-on-success);
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.today {
  border-color: var(--c-accent);
  border-width: 2px;
}

.selected {
  border-color: var(--c-accent);
  background: var(--c-accent);
  color: var(--c-on-accent);
}

.selected .weekday {
  color: var(--c-on-accent);
}

a.selected:hover {
  background: var(--c-accent-hover);
}

.selected.complete .mark {
  background: var(--c-on-accent);
}

.selected.complete .mark svg {
  stroke: var(--c-accent);
}

.complete :deep(.library-mark),
.selected :deep(.library-mark),
.complete :deep(.twister-mark),
.selected :deep(.twister-mark) {
  fill: var(--c-on-accent);
  stroke: var(--c-accent);
}
</style>
