import { ref, watch, type Ref } from 'vue'
import { TEXTS, type TextId } from '@/data/versions'
import type { Reading } from '@/lib/readingPlan'

/** [verse number, text] */
export type Verse = [number, string]

// Each book file holds all of its chapters, so fetch it once and reuse it for later days
const bookCache = new Map<string, Promise<Verse[][]>>()

function loadBook(text: TextId, code: string): Promise<Verse[][]> {
  const key = `${text}/${code}`
  let book = bookCache.get(key)
  if (!book) {
    book = fetch(`${import.meta.env.BASE_URL}bible/${TEXTS[text].dir}/${code}.json`).then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${code} (${res.status})`)
      return res.json() as Promise<Verse[][]>
    })
    book.catch(() => bookCache.delete(key))
    bookCache.set(key, book)
  }
  return book
}

export function useChapter(reading: Ref<Reading>, text: Ref<TextId>) {
  const verses = ref<Verse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  watch(
    [reading, text],
    async ([current, currentText]) => {
      // Ignore results if the user has already moved to another day or text
      const isCurrent = () => reading.value === current && text.value === currentText
      verses.value = []
      error.value = null
      loading.value = true
      try {
        const chapters = await loadBook(currentText, current.book.code)
        if (isCurrent()) verses.value = chapters[current.chapter - 1] ?? []
      } catch {
        if (isCurrent()) error.value = 'Could not load this chapter. Please try again.'
      } finally {
        if (isCurrent()) loading.value = false
      }
    },
    { immediate: true },
  )

  return { verses, loading, error }
}
