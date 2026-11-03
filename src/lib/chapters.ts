import type { Block } from '@/composables/useLibrary'

export interface Chapter {
  /** Index of the chapter's first block in the whole book */
  start: number
  /** Index of its last block (inclusive) */
  end: number
  title: string
  words: number
}

/** Front matter shorter than this (title pages, "by …") joins the chapter after it */
const MIN_WORDS = 150
/** Chapters longer than this are split into parts of about PART_WORDS at paragraph breaks */
const MAX_WORDS = 8000
const PART_WORDS = 5000

function countWords(block: Block) {
  return block[0] === 'h' ? 0 : block[1].split(/\s+/).filter(Boolean).length
}

/** "CHAPTER 2" alone says little, so pair it with the heading after it */
const BARE_LABEL = /^(chapter|book|part|letter|section)\b[^a-z]*$|^[ivxlc]+\.?$|^\d+\.?$/i

function titleFrom(headings: string[]): string {
  const last = headings[headings.length - 1] ?? ''
  const before = headings[headings.length - 2]
  if (before && BARE_LABEL.test(before.trim())) return `${before} · ${last}`
  if (BARE_LABEL.test(last.trim()) && before) return `${before} · ${last}`
  return last
}

/** Breaks an overly long chapter into roughly equal parts, each ending at a paragraph */
function splitLong(chapter: Chapter, blocks: Block[]): Chapter[] {
  if (chapter.words <= MAX_WORDS) return [chapter]
  const count = Math.ceil(chapter.words / PART_WORDS)
  const target = chapter.words / count
  const parts: Chapter[] = []
  let current: Chapter = { ...chapter, end: chapter.start, words: 0 }
  for (let i = chapter.start; i <= chapter.end; i++) {
    current.end = i
    current.words += countWords(blocks[i]!)
    if (current.words >= target && parts.length < count - 1 && i < chapter.end) {
      parts.push(current)
      current = { ...chapter, start: i + 1, end: i + 1, words: 0 }
    }
  }
  parts.push(current)
  return parts.map((p, i) => ({ ...p, title: `${chapter.title} (${i + 1} of ${parts.length})` }))
}

/**
 * Splits a book into chapters at its headings. A run of headings in a row ("CHAPTER 1" then
 * "The Mountain") starts one chapter, tiny sections are merged so every page has reading on
 * it, and very long ones are split into parts. A book with no headings is split into parts.
 */
export function splitChapters(blocks: Block[]): Chapter[] {
  const raw: (Chapter & { headings: string[] })[] = []
  blocks.forEach((block, i) => {
    const startsRun = block[0] === 'h' && (i === 0 || blocks[i - 1]![0] !== 'h')
    if (startsRun || raw.length === 0) {
      raw.push({ start: i, end: i, title: '', words: 0, headings: [] })
    }
    const current = raw[raw.length - 1]!
    current.end = i
    current.words += countWords(block)
    if (block[0] === 'h' && current.words === 0) current.headings.push(block[1])
  })

  const merged: Chapter[] = []
  for (const { headings, ...chapter } of raw) {
    chapter.title = titleFrom(headings)
    const previous = merged[merged.length - 1]
    if (previous && previous.words < MIN_WORDS) {
      // Fold the short section into this one, keeping this chapter's title
      merged[merged.length - 1] = {
        ...chapter,
        start: previous.start,
        words: previous.words + chapter.words,
      }
    } else {
      merged.push(chapter)
    }
  }
  const last = merged[merged.length - 1]
  if (merged.length > 1 && last && last.words < MIN_WORDS) {
    const before = merged[merged.length - 2]!
    before.end = last.end
    before.words += last.words
    merged.pop()
  }
  return merged
    .map((c, i) => ({ ...c, title: c.title || `Part ${i + 1}` }))
    .flatMap((c) => splitLong(c, blocks))
}

/** Which chapter a block belongs to */
export function chapterOf(chapters: Chapter[], index: number): number {
  const found = chapters.findIndex((c) => index >= c.start && index <= c.end)
  return found === -1 ? 0 : found
}
