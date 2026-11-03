import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { LibraryBook } from '@/data/library'
import { importBookFile } from '@/lib/bookImport'
import { deleteMyBook, listMyBooks, saveMyBook } from '@/lib/myBooksDb'
import { useLibraryStore } from '@/stores/library'

export const useMyBooksStore = defineStore('myBooks', () => {
  const books = ref<LibraryBook[]>([])
  /** False when this browser can't store books (e.g. some private windows) */
  const available = ref(true)

  const ready = listMyBooks()
    .then((list) => {
      books.value = list.sort((a, b) => (b.addedAt ?? '').localeCompare(a.addedAt ?? ''))
    })
    .catch(() => {
      available.value = false
    })

  async function add(file: File): Promise<LibraryBook> {
    const { title, author, text } = await importBookFile(file)
    const book: LibraryBook = {
      id: `mine-${crypto.randomUUID()}`,
      title,
      author,
      year: '',
      description: '',
      words: text.words,
      source: 'mine',
      addedAt: new Date().toISOString(),
    }
    try {
      await saveMyBook(book, text)
    } catch {
      throw new Error("Couldn't save the book on this device. Storage may be full or turned off.")
    }
    books.value.unshift(book)
    return book
  }

  async function remove(id: string) {
    await deleteMyBook(id)
    books.value = books.value.filter((b) => b.id !== id)
    useLibraryStore().resetProgress(id)
  }

  return { books, available, ready, add, remove }
})
