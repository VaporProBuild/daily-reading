import { BOOKS, type Book } from '@/data/books'

/** The first day of the plan and the chapter read on that day. */
export const PLAN_START = '2026-11-03'
const START_BOOK = '1CO'
const START_CHAPTER = 1

export interface Reading {
  date: string
  /** 1-based day of the plan */
  day: number
  book: Book
  chapter: number
}

// Flatten the Bible into one ordered list of chapters so a day offset maps straight to a chapter
const CHAPTERS = BOOKS.flatMap((book) =>
  Array.from({ length: book.chapters }, (_, i) => ({ book, chapter: i + 1 })),
)
const START_INDEX = CHAPTERS.findIndex(
  (c) => c.book.code === START_BOOK && c.chapter === START_CHAPTER,
)

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
const MS_PER_DAY = 86_400_000

/** Local calendar date as YYYY-MM-DD. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayKey(): string {
  return toDateKey(new Date())
}

/** Parses YYYY-MM-DD as a local date (not UTC midnight). */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export function isDateKey(value: unknown): value is string {
  return (
    typeof value === 'string' && DATE_KEY.test(value) && toDateKey(fromDateKey(value)) === value
  )
}

export function addDays(key: string, days: number): string {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

/** Whole days from a to b, ignoring daylight saving shifts. */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by!, bm! - 1, bd!) - Date.UTC(ay!, am! - 1, ad!)) / MS_PER_DAY)
}

/**
 * The chapter for a date. The plan runs both ways from PLAN_START: forwards it wraps from
 * Revelation to Genesis, and earlier days step back through the chapters before 1 Corinthians 1.
 */
export function readingForDate(date: string): Reading {
  const offset = daysBetween(PLAN_START, date)
  const index = (((START_INDEX + offset) % CHAPTERS.length) + CHAPTERS.length) % CHAPTERS.length
  return { date, day: offset + 1, ...CHAPTERS[index]! }
}
