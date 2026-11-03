<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import CompletionCheck from '@/components/CompletionCheck.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import GoalProgress from '@/components/GoalProgress.vue'
import {
  blockWords,
  loadBookText,
  useLibraryCatalog,
  type BookText,
} from '@/composables/useLibrary'
import type { LibraryBook } from '@/data/library'
import { useLibraryStore } from '@/stores/library'
import { useMyBooksStore } from '@/stores/myBooks'

const props = defineProps<{ id: string }>()

const { findBook } = useLibraryCatalog()
const library = useLibraryStore()
const myBooks = useMyBooksStore()
const router = useRouter()

const book = ref<LibraryBook | null>(null)
const text = ref<BookText | null>(null)
const status = ref<'loading' | 'ready' | 'missing' | 'error'>('loading')
const showMenu = ref(false)
const confirming = ref<'reset' | 'remove' | null>(null)
const celebrating = ref(false)

const content = ref<HTMLElement | null>(null)
const bar = ref<HTMLElement | null>(null)

const headings = computed(
  () =>
    text.value?.blocks.flatMap((b, index) => (b[0] === 'h' ? [{ index, text: b[1] }] : [])) ?? [],
)
const percent = computed(() =>
  book.value
    ? Math.min(
        100,
        Math.round((library.progress(book.value.id).wordsRead / book.value.words) * 100),
      )
    : 0,
)
const celebrationDetail = computed(
  () => `${library.wordsToday.toLocaleString()} words today. Keep going if you like!`,
)

/*
 * Reading tracking. A block counts as read once its bottom edge scrolls above the "reading
 * line" (30% down the screen), so the goal is only ever reached at the end of a paragraph.
 * Big jumps (contents links, dragging the scrollbar) don't count the text skipped over.
 */
const READ_LINE = 0.3
let elements: HTMLElement[] = []
let bottoms: number[] = []
let lastY = 0
let lastReadUpTo = -1
let frame = 0
let saveTimer: ReturnType<typeof setTimeout> | undefined
let resizeObserver: ResizeObserver | undefined

function measure() {
  elements = Array.from(content.value?.querySelectorAll<HTMLElement>('[data-block]') ?? [])
  bottoms = elements.map((el) => el.getBoundingClientRect().bottom + window.scrollY)
}

/** Index of the last block whose bottom is at or above y (document coordinates), or -1. */
function lastIndexAbove(y: number) {
  let lo = 0
  let hi = bottoms.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (bottoms[mid]! <= y) {
      found = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return found
}

function topOffset() {
  return (bar.value?.offsetHeight ?? 0) + 8
}

function track() {
  frame = 0
  if (!book.value || !text.value) return
  const y = window.scrollY
  const upTo = lastIndexAbove(y + window.innerHeight * READ_LINE)
  const jumped = Math.abs(y - lastY) > window.innerHeight * 1.5
  if (!jumped) {
    for (let i = lastReadUpTo + 1; i <= upTo; i++) {
      const block = text.value.blocks[i]
      if (block && blockWords(block) > 0 && library.markRead(book.value.id, i, blockWords(block))) {
        celebrating.value = true
      }
    }
  }
  // Scrolling the last block past the reading line finishes the book
  if (text.value.blocks.length && upTo >= text.value.blocks.length - 1) {
    library.markFinished(book.value.id)
  }
  lastReadUpTo = upTo
  lastY = y
  clearTimeout(saveTimer)
  saveTimer = setTimeout(savePlace, 400)
}

function onScroll() {
  if (!frame) frame = requestAnimationFrame(track)
}

function savePlace() {
  if (!book.value || !text.value || !elements.length) return
  const top = Math.min(lastIndexAbove(window.scrollY + topOffset()) + 1, elements.length - 1)
  library.savePosition(book.value.id, top)
}

function scrollToBlock(index: number) {
  const el = elements[index]
  if (!el) return
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - topOffset() })
}

/** Scroll to a block without counting the jump as reading */
function jumpTo(index: number) {
  showMenu.value = false
  scrollToBlock(index)
  lastY = window.scrollY
  lastReadUpTo = lastIndexAbove(lastY + window.innerHeight * READ_LINE)
}

function resetProgress() {
  confirming.value = null
  if (!book.value) return
  library.resetProgress(book.value.id)
  jumpTo(0)
  library.savePosition(book.value.id, 0)
}

async function removeBook() {
  confirming.value = null
  if (!book.value) return
  const id = book.value.id
  book.value = null
  await myBooks.remove(id)
  await router.push({ name: 'library' })
}

function onHidden() {
  if (document.visibilityState === 'hidden') savePlace()
}

async function open(id: string) {
  status.value = 'loading'
  text.value = null
  const found = await findBook(id)
  if (!found) {
    status.value = 'missing'
    return
  }
  book.value = found
  try {
    text.value = await loadBookText(found)
  } catch {
    status.value = 'error'
    return
  }
  status.value = 'ready'
  await nextTick()
  measure()
  // Reopen where the reader left off, without counting the jump as reading
  scrollToBlock(library.progress(found.id).position)
  lastY = window.scrollY
  lastReadUpTo = lastIndexAbove(lastY + window.innerHeight * READ_LINE)
  library.savePosition(found.id, library.progress(found.id).position)
  resizeObserver?.disconnect()
  resizeObserver = new ResizeObserver(() => measure())
  if (content.value) resizeObserver.observe(content.value)
}

watch(
  () => props.id,
  (id, previous) => {
    if (previous) savePlace()
    void open(id)
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('pagehide', savePlace)
  document.addEventListener('visibilitychange', onHidden)
})

onBeforeUnmount(() => {
  savePlace()
  clearTimeout(saveTimer)
  cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('pagehide', savePlace)
  document.removeEventListener('visibilitychange', onHidden)
})
</script>

<template>
  <article class="reader">
    <div ref="bar" class="bar">
      <RouterLink :to="{ name: 'library' }" class="back" aria-label="Back to library">‹</RouterLink>
      <div class="bar-title">
        <strong>{{ book?.title ?? 'Library' }}</strong>
        <span v-if="book">{{ percent }}% read</span>
      </div>
      <GoalProgress compact />
      <button
        v-if="text"
        type="button"
        class="menu-button"
        :aria-expanded="showMenu"
        aria-controls="book-menu"
        @click="showMenu = !showMenu"
      >
        Menu
      </button>
    </div>

    <div v-if="showMenu" id="book-menu" class="menu">
      <nav v-if="headings.length > 1" class="contents" aria-label="Contents">
        <p class="menu-label">Contents</p>
        <button v-for="h in headings" :key="h.index" type="button" @click="jumpTo(h.index)">
          {{ h.text }}
        </button>
      </nav>
      <div class="menu-actions">
        <button type="button" @click="confirming = 'reset'">Reset progress</button>
        <button v-if="book?.source === 'mine'" type="button" @click="confirming = 'remove'">
          Remove from My Books
        </button>
      </div>
    </div>

    <ConfirmDialog
      v-if="confirming === 'reset'"
      title="Reset your progress?"
      :message="`Are you sure you want to remove your progress on ${book?.title ?? 'this book'}? Your place and the paragraphs you've read will be cleared. This can't be undone.`"
      confirm-label="Reset progress"
      @confirm="resetProgress"
      @cancel="confirming = null"
    />
    <ConfirmDialog
      v-if="confirming === 'remove'"
      title="Remove this book?"
      :message="`Are you sure you want to remove ${book?.title ?? 'this book'} from My Books? It will be deleted from this device along with your progress. This can't be undone.`"
      confirm-label="Remove book"
      @confirm="removeBook"
      @cancel="confirming = null"
    />

    <p v-if="status === 'loading'" class="status">Loading…</p>
    <p v-else-if="status === 'missing'" class="status">
      This book isn't available.
      <RouterLink :to="{ name: 'library' }">Back to the library</RouterLink>
    </p>
    <p v-else-if="status === 'error'" class="status error">
      Could not load this book. Please try again.
    </p>

    <div v-if="text" ref="content" class="text">
      <template v-for="(block, i) in text.blocks" :key="i">
        <h2 v-if="block[0] === 'h'" :data-block="i">{{ block[1] }}</h2>
        <p v-else :data-block="i" :class="{ verse: block[0] === 'v' }">{{ block[1] }}</p>
      </template>
      <footer class="end">
        <p>The end</p>
        <RouterLink :to="{ name: 'library' }">Back to the library</RouterLink>
      </footer>
    </div>

    <CompletionCheck
      v-if="celebrating"
      message="Daily reading goal reached!"
      :detail="celebrationDetail"
      @done="celebrating = false"
    />
  </article>
</template>

<style scoped>
.bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: -1.5rem -1rem 0;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-bg);
}

.back {
  display: grid;
  place-items: center;
  flex: none;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  font-size: 1.6rem;
  line-height: 1;
  color: var(--c-text-muted);
  text-decoration: none;
}

.back:hover {
  background: var(--c-surface-hover);
  color: var(--c-text);
}

.bar-title {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}

.bar-title strong {
  overflow: hidden;
  font-family: var(--font-serif);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar-title span {
  font-size: 0.75rem;
  color: var(--c-text-muted);
}

.menu-button {
  flex: none;
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  color: var(--c-text);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.menu {
  position: sticky;
  top: 3.6rem;
  z-index: 9;
  display: flex;
  flex-direction: column;
  max-height: 65vh;
  margin: 0 -1rem;
  padding: 0.5rem;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
  overflow-y: auto;
}

.menu-label {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-accent);
}

.contents {
  display: flex;
  flex-direction: column;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--c-border);
}

.menu button {
  padding: 0.5rem 0.75rem;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--c-text);
  font: inherit;
  font-size: 0.9rem;
  text-align: left;
  cursor: pointer;
}

.menu button:hover {
  background: var(--c-surface-hover);
}

.menu-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding-top: 0.5rem;
}

.menu-actions button {
  color: var(--c-danger);
  font-weight: 600;
}

.text {
  padding-top: 1.5rem;
  font-family: var(--font-serif);
  font-size: 1.15rem;
  line-height: 1.85;
}

.text h2 {
  margin: 2.25rem 0 1rem;
  font-size: 1.35rem;
  line-height: 1.3;
  text-align: center;
}

.text p {
  margin-bottom: 1rem;
}

.text .verse {
  padding-left: 1.5rem;
  font-style: italic;
  white-space: pre-line;
}

.end {
  /* Room to scroll the final paragraphs past the reading line */
  min-height: 70vh;
  padding-top: 2rem;
  font-family: var(--font-sans);
  text-align: center;
}

.end p {
  font-family: var(--font-serif);
  font-size: 1.25rem;
  font-style: italic;
}

.status {
  padding-top: 2rem;
  text-align: center;
  color: var(--c-text-muted);
}

.error {
  color: var(--c-danger);
}
</style>
