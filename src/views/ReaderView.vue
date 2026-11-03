<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AutoScroll from '@/components/AutoScroll.vue'
import CompletionCheck from '@/components/CompletionCheck.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import GoalProgress from '@/components/GoalProgress.vue'
import { useHideOnScroll } from '@/composables/useHideOnScroll'
import {
  blockWords,
  loadBookText,
  useLibraryCatalog,
  type BookText,
} from '@/composables/useLibrary'
import type { LibraryBook } from '@/data/library'
import { chapterOf, splitChapters } from '@/lib/chapters'
import { useLibraryStore } from '@/stores/library'
import { useMyBooksStore } from '@/stores/myBooks'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps<{ id: string }>()

const { findBook } = useLibraryCatalog()
const library = useLibraryStore()
const myBooks = useMyBooksStore()
const settings = useSettingsStore()
const router = useRouter()

const book = ref<LibraryBook | null>(null)
const text = ref<BookText | null>(null)
const status = ref<'loading' | 'ready' | 'missing' | 'error'>('loading')
const showMenu = ref(false)
const confirming = ref<'reset' | 'remove' | null>(null)
const celebrating = ref(false)

// Tuck the bar away while reading so only the text shows; it returns on the first scroll up
const { hidden: barHidden } = useHideOnScroll()
const barTucked = computed(() => barHidden.value && !showMenu.value)

const content = ref<HTMLElement | null>(null)
const bar = ref<HTMLElement | null>(null)
const autoScroll = ref<InstanceType<typeof AutoScroll> | null>(null)

/* ---------- Chapters: the book is shown one chapter at a time ---------- */

const chapters = computed(() => (text.value ? splitChapters(text.value.blocks) : []))
const chapterIndex = ref(0)
const chapter = computed(() => chapters.value[chapterIndex.value])
const hasPrev = computed(() => chapterIndex.value > 0)
const hasNext = computed(() => chapterIndex.value < chapters.value.length - 1)
/** Which way the new chapter slides in */
const slide = ref<'next' | 'prev'>('next')

/** The current chapter's blocks, each with its index in the whole book */
const chapterBlocks = computed(() => {
  const c = chapter.value
  if (!text.value || !c) return []
  return text.value.blocks
    .slice(c.start, c.end + 1)
    .map((block, i) => ({ block, index: c.start + i }))
})

/** Words before each block, for moving the reader's place */
const wordsBefore = computed(() => {
  const totals = [0]
  text.value?.blocks.forEach((b, i) => totals.push(totals[i]! + blockWords(b)))
  return totals
})

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
 * Big jumps (contents, moving your place, dragging the scrollbar) don't count skipped text.
 * Measurements cover the blocks on screen, i.e. the current chapter.
 */
const READ_LINE = 0.3
let elements: HTMLElement[] = []
let bottoms: number[] = []
let lastY = 0
/** Book-wide index of the last block counted as passed */
let lastReadUpTo = -1
let frame = 0
let saveTimer: ReturnType<typeof setTimeout> | undefined
const resizeObserver = new ResizeObserver(() => measure())
const nearChapterEnd = ref(false)

function measure() {
  elements = Array.from(content.value?.querySelectorAll<HTMLElement>('[data-block]') ?? [])
  bottoms = elements.map((el) => el.getBoundingClientRect().bottom + window.scrollY)
}

/** Index (within the chapter) of the last block whose bottom is at or above y, or -1. */
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

function chapterStart() {
  return chapter.value?.start ?? 0
}

function topOffset() {
  return (bar.value?.offsetHeight ?? 0) + 8
}

/** Book-wide index of the last block above the reading line */
function passedUpTo() {
  return chapterStart() + lastIndexAbove(window.scrollY + window.innerHeight * READ_LINE)
}

function resetBaseline() {
  lastY = window.scrollY
  lastReadUpTo = passedUpTo()
}

function track() {
  frame = 0
  if (!book.value || !text.value) return
  const y = window.scrollY
  const upTo = passedUpTo()
  const jumped = Math.abs(y - lastY) > window.innerHeight * 1.5
  if (!jumped) {
    for (let i = lastReadUpTo + 1; i <= upTo; i++) {
      const block = text.value.blocks[i]
      if (block && blockWords(block) > 0 && library.markRead(book.value.id, i, blockWords(block))) {
        celebrating.value = true
      }
    }
  }
  // Scrolling the book's last block past the reading line finishes the book
  if (upTo >= text.value.blocks.length - 1) library.markFinished(book.value.id)
  lastReadUpTo = upTo
  lastY = y
  nearChapterEnd.value = y >= document.documentElement.scrollHeight - window.innerHeight - 120
  // Scrolling back up while waiting to move on means the reader wants to stay
  if (countdown.value !== null && !nearChapterEnd.value) cancelAdvance()
  clearTimeout(saveTimer)
  saveTimer = setTimeout(savePlace, 400)
}

function onScroll() {
  if (!frame) frame = requestAnimationFrame(track)
}

/** Book-wide index of the block at the top of the screen */
function topBlock() {
  const local = Math.min(lastIndexAbove(window.scrollY + topOffset()) + 1, elements.length - 1)
  return chapterStart() + Math.max(0, local)
}

function savePlace() {
  if (!book.value || !text.value || !elements.length) return
  library.savePosition(book.value.id, topBlock())
}

/** Scroll to a block in the current chapter; a chapter's first block shows the page from the top */
function scrollToBlock(index: number) {
  const local = index - chapterStart()
  const el = elements[local]
  if (!el || local === 0) {
    window.scrollTo({ top: 0 })
    return
  }
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - topOffset() })
}

/** Show a chapter (optionally at a particular block) without counting the move as reading */
async function showChapter(n: number, at?: number) {
  if (!book.value || n < 0 || n >= chapters.value.length) return
  cancelAdvance()
  if (n !== chapterIndex.value) slide.value = n > chapterIndex.value ? 'next' : 'prev'
  chapterIndex.value = n
  await nextTick()
  measure()
  const target = at ?? chapters.value[n]!.start
  scrollToBlock(target)
  resetBaseline()
  library.savePosition(book.value.id, target)
}

function nextChapter() {
  return showChapter(chapterIndex.value + 1)
}

function previousChapter() {
  return showChapter(chapterIndex.value - 1)
}

/** From the menu: jump to a block anywhere in the book */
function jumpTo(index: number) {
  showMenu.value = false
  void showChapter(chapterOf(chapters.value, index), index)
}

/* ---------- Auto-scroll: at the end of a chapter, wait 15 seconds, then carry on ---------- */

const ADVANCE_SECONDS = 15
const countdown = ref<number | null>(null)
let countdownTimer: ReturnType<typeof setInterval> | undefined

function onAutoScrollEnd() {
  // Never run two countdowns at once
  cancelAdvance()
  if (!hasNext.value) return
  countdown.value = ADVANCE_SECONDS
  countdownTimer = setInterval(() => {
    if (countdown.value === null) return
    countdown.value -= 1
    if (countdown.value <= 0) void advanceNow()
  }, 1000)
}

async function advanceNow() {
  if (countdown.value === null) return
  cancelAdvance()
  await nextChapter()
  // Keep reading hands-free in the new chapter, without popping the speed slider open
  autoScroll.value?.start(true)
}

function cancelAdvance() {
  clearInterval(countdownTimer)
  countdown.value = null
}

/* ---------- Swipe (or drag with a mouse) left for the next chapter, right for the previous ---------- */

const SWIPE_DISTANCE = 70
const dragX = ref(0)
let drag: { x: number; y: number; id: number; horizontal: boolean | null } | null = null

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  drag = { x: event.clientX, y: event.clientY, id: event.pointerId, horizontal: null }
}

function onPointerMove(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return
  const dx = event.clientX - drag.x
  const dy = event.clientY - drag.y
  if (drag.horizontal === null && Math.hypot(dx, dy) > 10) {
    drag.horizontal = Math.abs(dx) > Math.abs(dy) * 1.5
  }
  if (drag.horizontal) {
    // Follow the finger a little, with resistance where there's no chapter to go to
    const blocked = (dx < 0 && !hasNext.value) || (dx > 0 && !hasPrev.value)
    dragX.value = dx * (blocked ? 0.12 : 0.35)
  }
}

function onPointerUp(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return
  const dx = event.clientX - drag.x
  const dy = event.clientY - drag.y
  const horizontal = drag.horizontal
  drag = null
  dragX.value = 0
  // A mouse drag that selected text was a selection, not a swipe
  if (event.pointerType === 'mouse' && !window.getSelection()?.isCollapsed) return
  if (!horizontal || Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * 2) return
  if (dx < 0) void nextChapter()
  else void previousChapter()
}

function onPointerCancel() {
  drag = null
  dragX.value = 0
}

function onKey(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (confirming.value || target?.closest('input, textarea, select, dialog')) return
  if (event.key === 'ArrowRight') void nextChapter()
  else if (event.key === 'ArrowLeft') void previousChapter()
}

/** Side arrows stay on screen whenever they're turned on (tucked away only while the menu is open) */
const showArrows = computed(
  () => settings.chapterArrows && chapters.value.length > 1 && !showMenu.value,
)

/* ---------- Your place: move progress back or forward ---------- */

const placeMessage = ref('')
/** Slider position, in tenths of a percent of the book's words */
const placeSlider = ref(0)

const sliderTarget = computed(() => {
  if (!text.value) return 0
  const total = wordsBefore.value[wordsBefore.value.length - 1] || 1
  const goal = (placeSlider.value / 1000) * total
  const index = wordsBefore.value.findIndex((w) => w >= goal)
  return Math.min(Math.max(0, index), text.value.blocks.length - 1)
})
const sliderChapterTitle = computed(
  () => chapters.value[chapterOf(chapters.value, sliderTarget.value)]?.title ?? '',
)

function openMenu() {
  showMenu.value = !showMenu.value
  if (showMenu.value && book.value) {
    placeMessage.value = ''
    const total = wordsBefore.value[wordsBefore.value.length - 1] || 1
    placeSlider.value = Math.round((library.progress(book.value.id).wordsRead / total) * 1000)
  }
}

/** Words in a range list, using the running totals */
function wordsIn(ranges: [number, number][]) {
  return ranges.reduce((sum, [a, b]) => sum + wordsBefore.value[b + 1]! - wordsBefore.value[a]!, 0)
}

/**
 * Moves the reader's place to a block. Everything after it becomes unread. With
 * `readBefore`, everything before it also counts as read ("I've read up to here").
 */
function setPlaceAt(index: number, readBefore: boolean) {
  if (!book.value) return
  const kept: [number, number][] = readBefore
    ? index > 0
      ? [[0, index - 1]]
      : []
    : library
        .progress(book.value.id)
        .read.filter(([a]) => a < index)
        .map(([a, b]) => [a, Math.min(b, index - 1)])
  library.setPlace(book.value.id, index, kept, wordsIn(kept))
}

/** "I scrolled too far": make everything after the top of the screen unread */
function setProgressHere() {
  setPlaceAt(topBlock(), false)
  resetBaseline()
  placeMessage.value = `Progress set to ${percent.value}%.`
}

function moveToSlider() {
  const target = sliderTarget.value
  setPlaceAt(target, true)
  showMenu.value = false
  void showChapter(chapterOf(chapters.value, target), target)
}

/* ---------- Reset and remove ---------- */

function resetProgress() {
  confirming.value = null
  showMenu.value = false
  if (!book.value) return
  library.resetProgress(book.value.id)
  void showChapter(0)
}

async function removeBook() {
  confirming.value = null
  if (!book.value) return
  const id = book.value.id
  book.value = null
  await myBooks.remove(id)
  await router.push({ name: 'library' })
}

/* ---------- Loading and lifecycle ---------- */

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
  // Reopen where the reader left off, in that chapter
  const position = library.progress(found.id).position
  chapterIndex.value = chapterOf(chapters.value, position)
  await nextTick()
  measure()
  scrollToBlock(position)
  resetBaseline()
  library.savePosition(found.id, position)
}

watch(content, (el, previous) => {
  if (previous) resizeObserver.unobserve(previous)
  if (el) resizeObserver.observe(el)
})

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
  window.addEventListener('keydown', onKey)
  document.addEventListener('visibilitychange', onHidden)
})

onBeforeUnmount(() => {
  savePlace()
  cancelAdvance()
  clearTimeout(saveTimer)
  cancelAnimationFrame(frame)
  resizeObserver.disconnect()
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('pagehide', savePlace)
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('visibilitychange', onHidden)
})
</script>

<template>
  <article class="reader">
    <div ref="bar" class="bar" :class="{ tucked: barTucked }">
      <RouterLink :to="{ name: 'library' }" class="back" aria-label="Back to library">‹</RouterLink>
      <div class="bar-title">
        <strong>{{ book?.title ?? 'Library' }}</strong>
        <span v-if="book && chapters.length > 1"
          >Chapter {{ chapterIndex + 1 }} of {{ chapters.length }} · {{ percent }}% read</span
        >
        <span v-else-if="book">{{ percent }}% read</span>
      </div>
      <GoalProgress compact />
      <button
        v-if="text"
        type="button"
        class="menu-button"
        :aria-expanded="showMenu"
        aria-controls="book-menu"
        :aria-label="showMenu ? 'Close book menu' : 'Open book menu'"
        :title="showMenu ? 'Close menu' : 'Contents and options'"
        @click="openMenu"
      >
        <!-- Three lines that fold into an X while the menu is open -->
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path class="line top" d="M4 7h16" />
          <path class="line middle" d="M4 12h16" />
          <path class="line bottom" d="M4 17h16" />
        </svg>
      </button>
    </div>

    <Transition name="menu">
      <div v-if="showMenu" id="book-menu" class="menu">
        <section class="place" aria-label="Your place">
          <p class="menu-label">Your place</p>
          <p class="place-help">
            Scrolled too far by accident? Scroll back to where you were, then set your progress
            there. Or drag to move your place anywhere in the book.
          </p>
          <button type="button" class="place-button" @click="setProgressHere">
            Set my progress to here
          </button>
          <p v-if="placeMessage" class="place-message" role="status">{{ placeMessage }}</p>
          <label class="place-slider">
            <span>Move my place to {{ (placeSlider / 10).toFixed(0) }}%</span>
            <input
              v-model.number="placeSlider"
              type="range"
              min="0"
              max="1000"
              step="1"
              :aria-valuetext="`${(placeSlider / 10).toFixed(0)}%, ${sliderChapterTitle}`"
            />
            <small>{{ sliderChapterTitle }}</small>
          </label>
          <button type="button" class="place-button" @click="moveToSlider">Move here</button>
        </section>

        <nav v-if="chapters.length > 1" class="contents" aria-label="Chapters">
          <p class="menu-label">Chapters</p>
          <button
            v-for="(c, i) in chapters"
            :key="c.start"
            type="button"
            :class="{ current: i === chapterIndex }"
            :aria-current="i === chapterIndex ? 'true' : undefined"
            @click="jumpTo(c.start)"
          >
            {{ c.title }}
          </button>
        </nav>

        <div class="menu-actions">
          <button type="button" @click="confirming = 'reset'">Reset progress</button>
          <button v-if="book?.source === 'mine'" type="button" @click="confirming = 'remove'">
            Remove from My Books
          </button>
        </div>
      </div>
    </Transition>

    <Transition name="dialog">
      <ConfirmDialog
        v-if="confirming === 'reset'"
        title="Reset your progress?"
        :message="`Are you sure you want to remove your progress on ${book?.title ?? 'this book'}? Your place, the paragraphs you've read and the words this book added to your daily totals will all be removed. This can't be undone.`"
        confirm-label="Reset progress"
        @confirm="resetProgress"
        @cancel="confirming = null"
      />
    </Transition>
    <Transition name="dialog">
      <ConfirmDialog
        v-if="confirming === 'remove'"
        title="Remove this book?"
        :message="`Are you sure you want to remove ${book?.title ?? 'this book'} from My Books? It will be deleted from this device along with your progress. This can't be undone.`"
        confirm-label="Remove book"
        @confirm="removeBook"
        @cancel="confirming = null"
      />
    </Transition>

    <p v-if="status === 'loading'" class="status">Loading…</p>
    <p v-else-if="status === 'missing'" class="status">
      This book isn't available.
      <RouterLink :to="{ name: 'library' }">Back to the library</RouterLink>
    </p>
    <p v-else-if="status === 'error'" class="status error">
      Could not load this book. Please try again.
    </p>

    <div
      v-if="text && chapter"
      class="swipe-area"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <Transition :name="`chapter-${slide}`" @after-enter="measure">
        <div
          :key="chapterIndex"
          ref="content"
          class="text"
          :class="{ dragging: dragX !== 0 }"
          :style="dragX ? { transform: `translateX(${dragX}px)` } : undefined"
        >
          <template v-for="{ block, index } in chapterBlocks" :key="index">
            <h2 v-if="block[0] === 'h'" :data-block="index">{{ block[1] }}</h2>
            <p v-else :data-block="index" :class="{ verse: block[0] === 'v' }">{{ block[1] }}</p>
          </template>

          <footer class="end">
            <template v-if="hasNext">
              <p class="end-label">End of {{ chapter.title }}</p>
              <div v-if="countdown !== null" class="countdown" role="status">
                <p>Next chapter in {{ countdown }}s</p>
                <div class="end-buttons">
                  <button type="button" class="end-button" @click="cancelAdvance">Stay here</button>
                  <button type="button" class="end-button primary" @click="advanceNow">
                    Go now
                  </button>
                </div>
              </div>
              <div v-else-if="settings.chapterArrows" class="end-buttons">
                <button v-if="hasPrev" type="button" class="end-button" @click="previousChapter">
                  ‹ Previous
                </button>
                <button type="button" class="end-button primary" @click="nextChapter">
                  Next chapter ›
                </button>
              </div>
              <p v-else class="swipe-hint">Swipe left for the next chapter</p>
            </template>
            <template v-else>
              <p class="end-label the-end">The end</p>
              <RouterLink :to="{ name: 'library' }">Back to the library</RouterLink>
            </template>
          </footer>
        </div>
      </Transition>
    </div>

    <Transition name="arrows">
      <div v-if="showArrows" class="chapter-arrows">
        <button
          type="button"
          class="arrow prev"
          :disabled="!hasPrev"
          aria-label="Previous chapter"
          @click="previousChapter"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <button
          type="button"
          class="arrow next"
          :disabled="!hasNext"
          aria-label="Next chapter"
          @click="nextChapter"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </Transition>

    <AutoScroll
      v-if="text && chapter"
      ref="autoScroll"
      :content="content"
      :words="chapter.words"
      @end="onAutoScrollEnd"
    />
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
  transition: transform 0.3s ease;
}

.bar.tucked {
  transform: translateY(-100%);
}

@media (prefers-reduced-motion: reduce) {
  .bar {
    transition: none;
  }
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
  display: grid;
  place-items: center;
  flex: none;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid var(--c-border);
  border-radius: 50%;
  background: var(--c-surface);
  color: var(--c-text);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.menu-button:hover,
.menu-button[aria-expanded='true'] {
  border-color: var(--c-accent);
  background: var(--c-surface-hover);
}

.menu-button svg {
  width: 1.2rem;
  height: 1.2rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  overflow: visible;
}

.menu-button .line {
  transform-origin: 12px 12px;
  transition:
    transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.2s ease;
}

.menu-button[aria-expanded='true'] .top {
  transform: translateY(5px) rotate(45deg);
}

.menu-button[aria-expanded='true'] .middle {
  opacity: 0;
  transform: scaleX(0.2);
}

.menu-button[aria-expanded='true'] .bottom {
  transform: translateY(-5px) rotate(-45deg);
}

/* Menu slides down from under the bar and back up */
.menu-enter-active,
.menu-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-0.75rem);
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

.contents button.current {
  background: var(--c-surface-hover);
  color: var(--c-accent);
  font-weight: 700;
}

.place {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem 0.75rem;
  border-bottom: 1px solid var(--c-border);
}

.place .menu-label {
  padding: 0.25rem 0 0;
}

.place-help {
  font-size: 0.85rem;
  color: var(--c-text-muted);
}

.menu .place-button {
  align-self: flex-start;
  padding: 0.45rem 1rem;
  border: 1px solid var(--c-accent);
  border-radius: 999px;
  color: var(--c-link);
  font-weight: 600;
}

.menu .place-button:hover {
  background: var(--c-accent);
  color: var(--c-on-accent);
}

.place-message {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--c-success-text);
}

.place-slider {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-top: 0.4rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.place-slider input {
  width: 100%;
  accent-color: var(--c-accent);
}

.place-slider small {
  overflow: hidden;
  font-weight: 400;
  color: var(--c-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
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

.end .end-label {
  margin-bottom: 1rem;
  font-family: var(--font-serif);
  font-size: 1.1rem;
  font-style: italic;
  color: var(--c-text-muted);
}

.end .the-end {
  font-size: 1.25rem;
  color: var(--c-text);
}

.end-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
}

.end-button {
  padding: 0.65rem 1.3rem;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  color: var(--c-text);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.end-button:hover {
  background: var(--c-surface-hover);
}

.end-button.primary {
  border-color: var(--c-accent);
  background: var(--c-accent);
  color: var(--c-on-accent);
}

.end-button.primary:hover {
  background: var(--c-accent-hover);
}

.countdown p {
  margin-bottom: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--c-text);
}

.swipe-hint {
  font-size: 0.9rem;
  color: var(--c-text-muted);
}

/* Vertical scrolling stays native; horizontal drags change chapter */
.swipe-area {
  touch-action: pan-y pinch-zoom;
  overflow-x: clip;
}

.text {
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.text.dragging {
  transition: none;
}

/* The new chapter slides in from the side it came from */
.chapter-next-enter-active,
.chapter-prev-enter-active {
  transition:
    opacity 0.25s ease,
    transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* The old chapter disappears at once so it never shifts the new one's layout */
.chapter-next-leave-active,
.chapter-prev-leave-active {
  display: none;
}

.chapter-next-enter-from {
  opacity: 0;
  transform: translateX(2rem);
}

.chapter-prev-enter-from {
  opacity: 0;
  transform: translateX(-2rem);
}

/* Side arrows: always there when turned on, kept quiet so they don't pull focus */
.chapter-arrows .arrow {
  position: fixed;
  top: 50%;
  z-index: 15;
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  margin-top: -1.25rem;
  border: 1px solid var(--c-border);
  border-radius: 50%;
  background: var(--c-surface);
  color: var(--c-text);
  box-shadow: 0 3px 10px var(--c-shadow);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease;
}

.chapter-arrows .arrow:hover:not(:disabled) {
  background: var(--c-surface-hover);
}

.chapter-arrows .arrow:disabled {
  opacity: 0;
  pointer-events: none;
}

.chapter-arrows .prev {
  left: max(0.4rem, calc((100vw - 44rem) / 2 - 3.5rem));
}

.chapter-arrows .next {
  right: max(0.4rem, calc((100vw - 44rem) / 2 - 3.5rem));
}

.chapter-arrows svg {
  width: 1.2rem;
  height: 1.2rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.arrows-enter-active,
.arrows-leave-active {
  transition: opacity 0.25s ease;
}

.arrows-enter-from,
.arrows-leave-to {
  opacity: 0;
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
