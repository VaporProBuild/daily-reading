<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import LibraryMark from '@/components/LibraryMark.vue'
import TwisterMark from '@/components/TwisterMark.vue'
import { dayRoute } from '@/lib/dayRoute'
import { readingForDate, toDateKey, todayKey } from '@/lib/readingPlan'
import { useLibraryStore } from '@/stores/library'
import { useTwisterStore } from '@/stores/twister'
import { useProgressStore } from '@/stores/progress'

const progress = useProgressStore()
const library = useLibraryStore()
const twister = useTwisterStore()
const today = todayKey()

// First day of the month being shown: ?month=YYYY-MM when opened from a reading, else this month
function initialMonth(): Date {
  const param = useRoute().query.month
  const match = typeof param === 'string' ? /^(\d{4})-(\d{2})$/.exec(param) : null
  if (match && Number(match[2]) >= 1 && Number(match[2]) <= 12) {
    return new Date(Number(match[1]), Number(match[2]) - 1, 1)
  }
  return new Date(new Date().getFullYear(), new Date().getMonth(), 1)
}

const month = ref(initialMonth())

const monthLabel = computed(() =>
  month.value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
)

const weekdays = computed(() =>
  // 2023-01-01 was a Sunday
  Array.from({ length: 7 }, (_, i) =>
    new Date(2023, 0, 1 + i).toLocaleDateString(undefined, { weekday: 'short' }),
  ),
)

const cells = computed(() => {
  const year = month.value.getFullYear()
  const m = month.value.getMonth()
  const leading = new Date(year, m, 1).getDay()
  const daysInMonth = new Date(year, m + 1, 0).getDate()

  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const key = toDateKey(new Date(year, m, i + 1))
      return {
        key,
        day: i + 1,
        reading: readingForDate(key),
        isToday: key === today,
        isComplete: progress.isComplete(key),
        libraryGoal: library.goalMet(key),
        twisterDone: twister.isDone(key),
      }
    }),
  ]
})

function shiftMonth(delta: number) {
  month.value = new Date(month.value.getFullYear(), month.value.getMonth() + delta, 1)
}
</script>

<template>
  <section class="calendar">
    <div class="stats">
      <div class="stat">
        <strong>{{ progress.streak }}</strong>
        <span>day streak</span>
      </div>
      <div class="stat">
        <strong>{{ progress.totalCompleted }}</strong>
        <span>chapters read</span>
      </div>
      <div class="stat">
        <strong>{{ library.goalDays }}</strong>
        <span>library goals met</span>
      </div>
      <div class="stat">
        <strong>{{ twister.daysDone }}</strong>
        <span>tongue twisters</span>
      </div>
    </div>

    <header class="month-nav">
      <button type="button" class="arrow" aria-label="Previous month" @click="shiftMonth(-1)">
        ‹
      </button>
      <h1>{{ monthLabel }}</h1>
      <button type="button" class="arrow" aria-label="Next month" @click="shiftMonth(1)">›</button>
    </header>

    <div class="grid" role="grid">
      <div v-for="name in weekdays" :key="name" class="weekday" role="columnheader">
        {{ name }}
      </div>
      <template v-for="(cell, i) in cells" :key="cell?.key ?? `blank-${i}`">
        <div v-if="!cell" class="cell blank" />
        <RouterLink
          v-else
          :to="dayRoute(cell.key)"
          class="cell"
          :class="{ today: cell.isToday, complete: cell.isComplete }"
          :aria-label="`${cell.reading.book.name} ${cell.reading.chapter}${cell.isComplete ? ', completed' : ''}${cell.libraryGoal ? ', library goal reached' : ''}${cell.twisterDone ? ', tongue twister done' : ''}`"
        >
          <span class="num">{{ cell.day }}</span>
          <span class="ref">{{ cell.reading.book.abbr }} {{ cell.reading.chapter }}</span>
          <span class="marks" aria-hidden="true">
            <svg v-if="cell.isComplete" class="check" viewBox="0 0 24 24">
              <path d="M6 12.5l4 4 8-9" />
            </svg>
            <LibraryMark v-if="cell.libraryGoal" />
            <TwisterMark v-if="cell.twisterDone" />
          </span>
        </RouterLink>
      </template>
    </div>

    <ul class="key" aria-label="Calendar key">
      <li>
        <svg class="key-check" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 12.5l4 4 8-9" />
        </svg>
        Bible chapter
      </li>
      <li>
        <svg class="key-mark" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v15.5H8.5A2.5 2.5 0 0 1 6 18z" />
        </svg>
        Library goal
      </li>
      <li>
        <svg class="key-mark" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3.5 5h17v11h-10l-5 4v-4h-2z" />
        </svg>
        Tongue twister
      </li>
    </ul>
  </section>
</template>

<style scoped>
.calendar {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.6rem;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.7rem 0.5rem;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  background: var(--c-surface);
  text-align: center;
}

.stat strong {
  font-size: 1.5rem;
  line-height: 1.1;
  color: var(--c-success);
}

.stat span {
  font-size: 0.75rem;
  line-height: 1.3;
  color: var(--c-text-muted);
}

.month-nav {
  display: grid;
  grid-template-columns: 2.75rem 1fr 2.75rem;
  align-items: center;
  text-align: center;
}

h1 {
  font-size: 1.25rem;
}

.arrow {
  width: 2.75rem;
  height: 2.75rem;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--c-text-muted);
  font-size: 1.75rem;
  line-height: 1;
  cursor: pointer;
}

.arrow:hover:not(:disabled) {
  background: var(--c-surface-hover);
  color: var(--c-text);
}

.arrow:disabled {
  opacity: 0.3;
  cursor: default;
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.35rem;
}

.weekday {
  padding-bottom: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
  color: var(--c-text-muted);
}

.cell {
  /* Every cell is the same height: date at the top, chapter in the middle, marks at the bottom */
  display: grid;
  grid-template-rows: auto 1fr auto;
  justify-items: center;
  align-items: center;
  height: 4.75rem;
  min-width: 0;
  padding: 0.35rem 0.15rem 0.3rem;
  border: 1px solid var(--c-border);
  border-radius: 10px;
  background: var(--c-surface);
  color: var(--c-text);
  text-decoration: none;
  transition: background 0.15s;
}

a.cell:hover {
  background: var(--c-surface-hover);
}

.blank {
  border: 0;
  background: none;
}

.num {
  font-size: 0.85rem;
  font-weight: 600;
}

.ref {
  overflow: hidden;
  max-width: 100%;
  font-size: 0.65rem;
  color: var(--c-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.today {
  border: 2px solid var(--c-accent);
}

.complete {
  border-color: var(--c-success);
  background: var(--c-success);
  color: var(--c-on-success);
}

a.complete:hover {
  background: var(--c-success-strong);
}

.marks {
  display: flex;
  gap: 0.15rem;
  height: 0.9rem;
  color: var(--c-accent);
}

.complete .marks {
  color: var(--c-on-success);
}

.check {
  width: 0.9rem;
  height: 0.9rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.complete .ref {
  color: var(--c-on-success);
}

@media (max-width: 480px) {
  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stat {
    flex-direction: row;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.5rem;
  }

  .stat strong {
    font-size: 1.2rem;
  }

  .grid {
    gap: 0.25rem;
  }

  /* No room for the chapter on a phone; the day page shows it */
  .ref {
    visibility: hidden;
  }

  .cell {
    height: 3.4rem;
    border-radius: 8px;
  }

  /* Up to three marks share a ~45px cell */
  .marks {
    gap: 0;
    height: 0.7rem;
  }

  .check,
  .marks :deep(.library-mark),
  .marks :deep(.twister-mark) {
    width: 0.7rem;
    height: 0.7rem;
  }
}

.key {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem 1.25rem;
  padding: 0;
  font-size: 0.8rem;
  color: var(--c-text-muted);
  list-style: none;
}

.key li {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.key svg {
  width: 1rem;
  height: 1rem;
}

.key-check {
  padding: 0.15rem;
  border-radius: 50%;
  background: var(--c-success);
  fill: none;
  stroke: var(--c-on-success);
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.key-mark {
  fill: var(--c-accent);
}
</style>
