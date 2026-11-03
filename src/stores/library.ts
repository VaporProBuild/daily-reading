import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { isDateKey, todayKey } from '@/lib/readingPlan'
import { addIndex, hasIndex, type Ranges } from '@/lib/ranges'
import { useSettingsStore } from '@/stores/settings'

const STORAGE_KEY = 'daily-reading:library'

interface BookProgress {
  /** Index of the block at the top of the screen when the reader last scrolled */
  position: number
  /** Blocks already counted, so re-reading never counts words twice */
  read: Ranges
  wordsRead: number
  /** ISO timestamp of when the book was last closed or scrolled */
  lastReadAt: string | null
}

interface DayLog {
  words: number
  /** ISO timestamp of when the daily goal was reached */
  goalMetAt?: string
}

interface LibraryState {
  books: Record<string, BookProgress>
  days: Record<string, DayLog>
  /** Book id -> ISO timestamp of when it was first finished. Kept when progress is reset. */
  finished: Record<string, string>
}

function load(): LibraryState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<LibraryState>
    const books = parsed.books && typeof parsed.books === 'object' ? parsed.books : {}
    const days = Object.fromEntries(
      Object.entries(parsed.days && typeof parsed.days === 'object' ? parsed.days : {}).filter(
        ([key, value]) => isDateKey(key) && typeof value?.words === 'number',
      ),
    )
    const finished = parsed.finished && typeof parsed.finished === 'object' ? parsed.finished : {}
    return { books, days, finished }
  } catch {
    return { books: {}, days: {}, finished: {} }
  }
}

function emptyProgress(): BookProgress {
  return { position: 0, read: [], wordsRead: 0, lastReadAt: null }
}

export const useLibraryStore = defineStore('library', () => {
  const settings = useSettingsStore()
  const initial = load()
  const books = ref<Record<string, BookProgress>>(initial.books)
  const days = ref<Record<string, DayLog>>(initial.days)
  const finished = ref<Record<string, string>>(initial.finished)

  // Reading progress lives in this browser only, so keep localStorage in sync with the store
  watch(
    [books, days, finished],
    () => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ books: books.value, days: days.value, finished: finished.value }),
        )
      } catch {
        // Storage can be unavailable (private mode, quota); progress still works for this session
      }
    },
    { deep: true },
  )

  function progress(bookId: string): BookProgress {
    return books.value[bookId] ?? emptyProgress()
  }

  function ensure(bookId: string): BookProgress {
    return (books.value[bookId] ??= emptyProgress())
  }

  const wordsToday = computed(() => days.value[todayKey()]?.words ?? 0)

  function goalMet(date: string) {
    return Boolean(days.value[date]?.goalMetAt)
  }

  /** All-time words read, from the daily logs (unaffected by resetting a book) */
  const totalWords = computed(() => Object.values(days.value).reduce((sum, d) => sum + d.words, 0))
  const booksFinished = computed(() => Object.keys(finished.value).length)

  /** Called when the reader reaches the end of a book */
  function markFinished(bookId: string) {
    finished.value[bookId] ??= new Date().toISOString()
  }

  const goalDays = computed(() => Object.values(days.value).filter((d) => d.goalMetAt).length)

  /** The book read most recently, for the "continue reading" card */
  const lastBookId = computed(() => {
    let latest: [string, string] | null = null
    for (const [id, p] of Object.entries(books.value)) {
      if (p.lastReadAt && (!latest || p.lastReadAt > latest[1])) latest = [id, p.lastReadAt]
    }
    return latest?.[0] ?? null
  })

  function savePosition(bookId: string, position: number) {
    const book = ensure(bookId)
    book.position = position
    book.lastReadAt = new Date().toISOString()
  }

  /**
   * Forgets the place and read paragraphs for one book. Days already logged keep their words,
   * so past goals stay on the calendar.
   */
  function resetProgress(bookId: string) {
    delete books.value[bookId]
  }

  /**
   * Counts a finished block towards today's goal. Returns true when this block is the one
   * that reaches the goal, so the reader can congratulate at the end of that paragraph.
   */
  function markRead(bookId: string, index: number, words: number): boolean {
    const book = ensure(bookId)
    if (hasIndex(book.read, index)) return false
    book.read = addIndex(book.read, index)
    book.wordsRead += words

    const today = todayKey()
    const day = (days.value[today] ??= { words: 0 })
    day.words += words
    if (!day.goalMetAt && day.words >= settings.readingGoal) {
      day.goalMetAt = new Date().toISOString()
      return true
    }
    return false
  }

  return {
    books,
    days,
    finished,
    wordsToday,
    totalWords,
    booksFinished,
    goalDays,
    lastBookId,
    progress,
    goalMet,
    savePosition,
    markRead,
    resetProgress,
    markFinished,
  }
})
