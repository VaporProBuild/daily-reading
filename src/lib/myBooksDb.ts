import type { BookText } from '@/composables/useLibrary'
import type { LibraryBook } from '@/data/library'

/*
 * Books the reader adds themselves live in this browser's IndexedDB and are never uploaded.
 * Metadata and text are stored separately so listing books doesn't load every book's text.
 */
const DB_NAME = 'daily-reading'
const META = 'my-books'
const TEXT = 'my-book-text'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(META, { keyPath: 'id' })
      req.result.createObjectStore(TEXT)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  dbPromise.catch(() => (dbPromise = null))
  return dbPromise
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

function result<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function listMyBooks(): Promise<LibraryBook[]> {
  const db = await openDb()
  return result(db.transaction(META).objectStore(META).getAll() as IDBRequest<LibraryBook[]>)
}

export async function getMyBookText(id: string): Promise<BookText | undefined> {
  const db = await openDb()
  return result(db.transaction(TEXT).objectStore(TEXT).get(id) as IDBRequest<BookText | undefined>)
}

export async function saveMyBook(book: LibraryBook, text: BookText): Promise<void> {
  const db = await openDb()
  const tx = db.transaction([META, TEXT], 'readwrite')
  tx.objectStore(META).put(book)
  tx.objectStore(TEXT).put(text, book.id)
  await done(tx)
}

export async function deleteMyBook(id: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction([META, TEXT], 'readwrite')
  tx.objectStore(META).delete(id)
  tx.objectStore(TEXT).delete(id)
  await done(tx)
}
