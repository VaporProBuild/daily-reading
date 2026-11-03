import { computed, ref } from 'vue'
import { BUNDLED_BOOKS, CATEGORIES, type Category, type LibraryBook } from '@/data/library'
import { getMyBookText } from '@/lib/myBooksDb'
import { useMyBooksStore } from '@/stores/myBooks'

/** [kind, text]: "h" heading, "p" paragraph, "v" verse (lines separated by \n) */
export type Block = ['h' | 'p' | 'v', string]

export interface BookText {
  words: number
  blocks: Block[]
}

// Books that are public domain only in Canada are served by a separate Canadian host.
// Without this setting (or if the host refuses the visitor), they simply don't appear.
const CANADA_URL = (import.meta.env.VITE_CANADA_LIBRARY_URL ?? '').replace(/\/+$/, '')

const canadaBooks = ref<LibraryBook[]>([])
let canadaRequest: Promise<void> | null = null

function parseCatalog(value: unknown): LibraryBook[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry): LibraryBook[] => {
    const b = entry as Partial<LibraryBook>
    const valid =
      typeof b.id === 'string' &&
      /^[a-z0-9-]+$/.test(b.id) &&
      typeof b.title === 'string' &&
      typeof b.author === 'string' &&
      typeof b.words === 'number' &&
      CATEGORIES.includes(b.category as Category)
    if (!valid) return []
    return [
      {
        id: b.id!,
        title: b.title!,
        author: b.author!,
        year: String(b.year ?? ''),
        category: b.category!,
        description: typeof b.description === 'string' ? b.description : '',
        words: b.words!,
        source: 'canada',
      },
    ]
  })
}

function loadCanadaCatalog(): Promise<void> {
  if (!CANADA_URL) return Promise.resolve()
  canadaRequest ??= fetch(`${CANADA_URL}/catalog.json`)
    .then((res) => (res.ok ? res.json() : []))
    .then((list: unknown) => {
      canadaBooks.value = parseCatalog(list)
    })
    .catch(() => {
      // Host unreachable or visitor outside Canada: show bundled books only
    })
  return canadaRequest
}

export function useLibraryCatalog() {
  const myBooks = useMyBooksStore()
  const ready = Promise.all([loadCanadaCatalog(), myBooks.ready])
  const books = computed(() => [...myBooks.books, ...BUNDLED_BOOKS, ...canadaBooks.value])

  async function findBook(id: string): Promise<LibraryBook | undefined> {
    await ready
    return books.value.find((b) => b.id === id)
  }

  return { books, ready, findBook }
}

const textCache = new Map<string, Promise<BookText>>()

export function loadBookText(book: LibraryBook): Promise<BookText> {
  if (book.source === 'mine') {
    return getMyBookText(book.id).then((text) => {
      if (!text) throw new Error(`Book ${book.id} is no longer on this device`)
      return text
    })
  }
  let text = textCache.get(book.id)
  if (!text) {
    const url =
      book.source === 'canada'
        ? `${CANADA_URL}/${book.id}.json`
        : `${import.meta.env.BASE_URL}library/${book.id}.json`
    text = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${book.id} (${res.status})`)
      return res.json() as Promise<BookText>
    })
    text.catch(() => textCache.delete(book.id))
    textCache.set(book.id, text)
  }
  return text
}

export function blockWords(block: Block): number {
  return block[0] === 'h' ? 0 : block[1].split(/\s+/).filter(Boolean).length
}
