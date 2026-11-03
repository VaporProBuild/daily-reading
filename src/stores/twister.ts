import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { isDateKey } from '@/lib/readingPlan'

const STORAGE_KEY = 'daily-reading:twister'

/** Saying the twister this many times completes the day (the page suggests 3 to 5) */
export const TWISTER_DONE_AT = 3
export const TWISTER_MAX = 5

function load(): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (!parsed || typeof parsed !== 'object') return {}
    return Object.fromEntries(
      Object.entries(parsed).filter(([key, value]) => isDateKey(key) && typeof value === 'number'),
    )
  } catch {
    return {}
  }
}

export const useTwisterStore = defineStore('twister', () => {
  /** Date key (YYYY-MM-DD) -> times the twister was said that day */
  const counts = ref<Record<string, number>>(load())

  // Practice lives in this browser only, so keep localStorage in sync with the store
  watch(
    counts,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        // Storage can be unavailable (private mode, quota); practice still works for this session
      }
    },
    { deep: true },
  )

  function count(date: string) {
    return counts.value[date] ?? 0
  }

  function isDone(date: string) {
    return count(date) >= TWISTER_DONE_AT
  }

  const daysDone = computed(
    () => Object.values(counts.value).filter((n) => n >= TWISTER_DONE_AT).length,
  )

  function said(date: string) {
    counts.value[date] = Math.min(TWISTER_MAX, count(date) + 1)
  }

  return { counts, count, isDone, daysDone, said }
})
