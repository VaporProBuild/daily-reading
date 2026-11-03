<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import GoalProgress from '@/components/GoalProgress.vue'
import { useLibraryCatalog } from '@/composables/useLibrary'
import { CATEGORIES, WORDS_PER_PAGE, type Category, type LibraryBook } from '@/data/library'
import { ACCEPTED_FILES } from '@/lib/bookImport'
import { useLibraryStore } from '@/stores/library'
import { useMyBooksStore } from '@/stores/myBooks'

const { books } = useLibraryCatalog()
const library = useLibraryStore()
const myBooks = useMyBooksStore()

const MY_BOOKS = 'My Books'
const filters = ['All', MY_BOOKS, ...CATEGORIES] as const
const filter = ref<Category | typeof MY_BOOKS | 'All'>('All')
const query = ref('')

function matches(book: LibraryBook) {
  const q = query.value.trim().toLowerCase()
  return !q || [book.title, book.author, book.description].some((f) => f.toLowerCase().includes(q))
}

const showMine = computed(() => filter.value === 'All' || filter.value === MY_BOOKS)
const mine = computed(() => myBooks.books.filter(matches))

const groups = computed(() =>
  CATEGORIES.filter((c) => filter.value === 'All' || filter.value === c)
    .map((category) => ({
      category,
      books: books.value.filter((b) => b.category === category && matches(b)),
    }))
    .filter((g) => g.books.length > 0),
)

const noResults = computed(
  () =>
    query.value.trim() !== '' &&
    groups.value.length === 0 &&
    (!showMine.value || !mine.value.length),
)

const adding = ref(false)
const addMessage = ref<{ text: string; error: boolean } | null>(null)

async function addBook(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  adding.value = true
  addMessage.value = null
  try {
    const book = await myBooks.add(file)
    addMessage.value = { text: `Added ${book.title}.`, error: false }
  } catch (e) {
    addMessage.value = {
      text: e instanceof Error ? e.message : "Couldn't add that book.",
      error: true,
    }
  } finally {
    adding.value = false
  }
}

// Sites with free public-domain Christian books in formats the importer reads
const RESOURCES = [
  {
    name: 'Christian Classics Ethereal Library',
    url: 'https://www.ccel.org/',
    note: 'The largest collection of classic Christian writing: Augustine, Spurgeon, the Puritans and more.',
  },
  {
    name: 'Project Gutenberg',
    url: 'https://www.gutenberg.org/ebooks/bookshelf/119',
    note: 'Free EPUBs of thousands of classics, including a Christianity bookshelf.',
  },
  {
    name: 'Standard Ebooks',
    url: 'https://standardebooks.org/',
    note: 'Beautifully formatted EPUBs, including Chesterton, Bunyan and Augustine.',
  },
  {
    name: 'Wikisource',
    url: 'https://en.wikisource.org/',
    note: 'Public domain texts you can download as EPUB from any page.',
  },
  {
    name: 'Fadedpage',
    url: 'https://www.fadedpage.com/',
    note: 'Books that are public domain in Canada, including C.S. Lewis. Check your own country’s rules before downloading.',
  },
]

function byline(book: LibraryBook) {
  return [book.author, book.year].filter(Boolean).join(' · ') || 'Added from your device'
}

const continueBook = computed(() => books.value.find((b) => b.id === library.lastBookId))

function percent(book: LibraryBook) {
  return Math.min(100, Math.round((library.progress(book.id).wordsRead / book.words) * 100))
}

function pages(book: LibraryBook) {
  return Math.max(1, Math.round(book.words / WORDS_PER_PAGE))
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

function lastRead(book: LibraryBook) {
  const iso = library.progress(book.id).lastReadAt
  if (!iso) return null
  const minutes = Math.round((Date.parse(iso) - Date.now()) / 60_000)
  if (minutes > -1) return 'just now'
  if (minutes > -60) return relative.format(minutes, 'minute')
  if (minutes > -60 * 24) return relative.format(Math.round(minutes / 60), 'hour')
  return relative.format(Math.round(minutes / (60 * 24)), 'day')
}
</script>

<template>
  <section class="library">
    <header>
      <h1>Library</h1>
      <p class="stats">
        <strong>{{ library.totalWords.toLocaleString() }}</strong> words read ·
        <strong>{{ Math.round(library.totalWords / WORDS_PER_PAGE).toLocaleString() }}</strong>
        pages ·
        <strong>{{ library.booksFinished }}</strong>
        {{ library.booksFinished === 1 ? 'book' : 'books' }} finished
      </p>
      <p class="intro">
        Classic Christian books, free to read. There's no set portion: read as far as you like and
        your place is saved. Your daily goal can be changed in
        <RouterLink :to="{ name: 'settings' }">Settings</RouterLink>.
      </p>
    </header>

    <GoalProgress />

    <RouterLink
      v-if="continueBook"
      :to="{ name: 'book', params: { id: continueBook.id } }"
      class="continue"
    >
      <span class="continue-label">Continue reading</span>
      <strong>{{ continueBook.title }}</strong>
      <span class="meta">{{ percent(continueBook) }}% read · {{ lastRead(continueBook) }}</span>
    </RouterLink>

    <div class="search">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </svg>
      <input
        v-model="query"
        type="search"
        placeholder="Search by title, author or topic"
        aria-label="Search the library"
      />
    </div>

    <div class="filters" role="group" aria-label="Filter by topic">
      <button
        v-for="option in filters"
        :key="option"
        type="button"
        :class="{ active: filter === option }"
        :aria-pressed="filter === option"
        @click="filter = option"
      >
        {{ option }}
      </button>
    </div>

    <p v-if="noResults" class="empty">No books match “{{ query.trim() }}”.</p>

    <section v-if="showMine && !(query.trim() && !mine.length)" class="group">
      <div class="group-head">
        <h2>{{ MY_BOOKS }}</h2>
        <label v-if="myBooks.available" class="add" :class="{ busy: adding }">
          <input type="file" :accept="ACCEPTED_FILES" :disabled="adding" @change="addBook" />
          {{ adding ? 'Adding…' : '+ Add a book' }}
        </label>
      </div>
      <p v-if="addMessage" class="add-message" :class="{ error: addMessage.error }" role="status">
        {{ addMessage.text }}
      </p>
      <p v-if="!myBooks.available" class="hint">
        This browser can't store books (private browsing may block it).
      </p>
      <template v-else>
        <p v-if="!myBooks.books.length" class="hint">
          Add your own EPUB, TXT or HTML books. They stay on this device and are never uploaded.
        </p>
        <details class="resources" :open="!myBooks.books.length">
          <summary>Recommended public domain resource websites</summary>
          <ul>
            <li v-for="r in RESOURCES" :key="r.url">
              <a :href="r.url" target="_blank" rel="noopener">{{ r.name }} ↗</a>
              <span>{{ r.note }}</span>
            </li>
          </ul>
        </details>
      </template>
      <ul v-if="mine.length" class="books">
        <li v-for="book in mine" :key="book.id">
          <RouterLink :to="{ name: 'book', params: { id: book.id } }" class="book">
            <span class="title">{{ book.title }}</span>
            <span class="author">{{ byline(book) }}</span>
            <span class="footer">
              <span>About {{ pages(book) }} pages</span>
              <span v-if="percent(book) > 0">{{ percent(book) }}% read</span>
            </span>
            <span v-if="percent(book) > 0" class="book-bar" aria-hidden="true">
              <span :style="{ width: `${percent(book)}%` }" />
            </span>
          </RouterLink>
        </li>
      </ul>
    </section>

    <section v-for="group in groups" :key="group.category" class="group">
      <h2>{{ group.category }}</h2>
      <ul class="books">
        <li v-for="book in group.books" :key="book.id">
          <RouterLink :to="{ name: 'book', params: { id: book.id } }" class="book">
            <span class="title">{{ book.title }}</span>
            <span class="author">{{ byline(book) }}</span>
            <span class="description">{{ book.description }}</span>
            <span class="footer">
              <span>About {{ pages(book) }} pages</span>
              <span v-if="percent(book) > 0">{{ percent(book) }}% read</span>
            </span>
            <span v-if="percent(book) > 0" class="book-bar" aria-hidden="true">
              <span :style="{ width: `${percent(book)}%` }" />
            </span>
          </RouterLink>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.library {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h1 {
  font-family: var(--font-serif);
  font-size: clamp(1.6rem, 7vw, 2rem);
}

.stats {
  margin: 0.1rem 0 0.5rem;
  font-size: 0.8rem;
  color: var(--c-text-muted);
}

.stats strong {
  color: var(--c-accent);
  font-variant-numeric: tabular-nums;
}

.search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.9rem;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
}

.search:focus-within {
  border-color: var(--c-accent);
}

.search svg {
  flex: none;
  width: 1.1rem;
  height: 1.1rem;
  fill: none;
  stroke: var(--c-text-muted);
  stroke-width: 2;
  stroke-linecap: round;
}

.search input {
  flex: 1;
  min-width: 0;
  padding: 0.7rem 0;
  border: 0;
  outline: none;
  background: none;
  color: var(--c-text);
  font: inherit;
}

.search input::placeholder {
  color: var(--c-text-muted);
}

.empty,
.hint {
  color: var(--c-text-muted);
}

.hint {
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}

.resources {
  margin-bottom: 1rem;
  padding: 0.8rem 1rem;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  background: var(--c-surface);
  font-size: 0.9rem;
}

.resources summary {
  font-weight: 600;
  cursor: pointer;
}

.resources ul {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.75rem;
  padding: 0;
  list-style: none;
}

.resources li {
  display: flex;
  flex-direction: column;
}

.resources a {
  font-weight: 600;
}

.resources span {
  color: var(--c-text-muted);
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.group-head h2 {
  margin-bottom: 0;
}

.add {
  position: relative;
  padding: 0.35rem 0.9rem;
  border: 1px solid var(--c-accent);
  border-radius: 999px;
  color: var(--c-link);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.add:hover,
.add:focus-within {
  background: var(--c-accent);
  color: var(--c-on-accent);
}

.add.busy {
  opacity: 0.6;
  cursor: progress;
}

.add input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.add-message {
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
  color: var(--c-success-text);
}

.add-message.error {
  color: var(--c-danger);
}

.intro {
  color: var(--c-text-muted);
}

.continue {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 1rem 1.1rem;
  border-radius: 12px;
  background: var(--c-accent);
  color: var(--c-on-accent);
  text-decoration: none;
}

.continue:hover {
  background: var(--c-accent-hover);
}

.continue-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.continue strong {
  font-family: var(--font-serif);
  font-size: 1.25rem;
}

.continue .meta {
  font-size: 0.85rem;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

@media (max-width: 480px) {
  /* One row of topics that scrolls sideways, edge to edge */
  .filters {
    flex-wrap: nowrap;
    margin: 0 -1rem;
    padding: 0 1rem;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .filters::-webkit-scrollbar {
    display: none;
  }

  .filters button {
    flex: none;
  }
}

.filters button {
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  color: var(--c-text-muted);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.filters button {
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.filters button:hover {
  color: var(--c-text);
}

.filters button.active {
  border-color: var(--c-accent);
  background: var(--c-accent);
  color: var(--c-on-accent);
}

.group h2 {
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-accent);
}

.books {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 0.75rem;
  padding: 0;
  list-style: none;
}

.book {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  height: 100%;
  padding: 1rem 1.1rem;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  background: var(--c-surface);
  color: var(--c-text);
  text-decoration: none;
  transition: background 0.15s;
}

.book:hover {
  background: var(--c-surface-hover);
}

.title {
  font-family: var(--font-serif);
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.25;
}

.author {
  font-size: 0.85rem;
  color: var(--c-text-muted);
}

.description {
  flex: 1;
  font-size: 0.9rem;
}

.footer {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.4rem;
  font-size: 0.8rem;
  color: var(--c-text-muted);
}

.book-bar {
  height: 0.3rem;
  border-radius: 999px;
  background: var(--c-surface-hover);
  overflow: hidden;
}

.book-bar span {
  display: block;
  height: 100%;
  background: var(--c-success);
}
</style>
