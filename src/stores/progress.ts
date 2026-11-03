import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { addDays, isDateKey, todayKey } from '@/lib/readingPlan'

const STORAGE_KEY = 'daily-reading:progress'

/** Date key (YYYY-MM-DD) -> ISO timestamp of when the chapter was marked complete */
type CompletedDays = Record<string, string>

function load(): CompletedDays {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (!parsed || typeof parsed !== 'object') return {}
    return Object.fromEntries(
      Object.entries(parsed).filter(([key, value]) => isDateKey(key) && typeof value === 'string'),
    )
  } catch {
    return {}
  }
}

export const useProgressStore = defineStore('progress', () => {
  const completed = ref<CompletedDays>(load())

  // Progress lives in this browser only, so keep localStorage in sync with the store
  watch(
    completed,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        // Storage can be unavailable (private mode, quota); progress still works for this session
      }
    },
    { deep: true },
  )

  const totalCompleted = computed(() => Object.keys(completed.value).length)

  /** Consecutive completed days ending today, or yesterday if today isn't done yet. */
  const streak = computed(() => {
    let day = todayKey()
    if (!completed.value[day]) day = addDays(day, -1)
    let count = 0
    while (completed.value[day]) {
      count++
      day = addDays(day, -1)
    }
    return count
  })

  function isComplete(date: string) {
    return Boolean(completed.value[date])
  }

  function markComplete(date: string) {
    completed.value[date] = new Date().toISOString()
  }

  function markIncomplete(date: string) {
    delete completed.value[date]
  }

  return { completed, totalCompleted, streak, isComplete, markComplete, markIncomplete }
})
