import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { READING_GOALS, type ReadingGoal } from '@/data/library'
import { VERSIONS, findVersion, type VersionId } from '@/data/versions'

const STORAGE_KEY = 'daily-reading:settings'

export const THEMES = ['dark', 'light', 'greyscale', 'whitescale'] as const
export type Theme = (typeof THEMES)[number]

/** Auto-scroll speed range in words per minute */
export const AUTO_SCROLL = { min: 100, max: 750, step: 25, default: 200 } as const

interface Settings {
  theme: Theme
  version: VersionId
  /** Daily library reading goal in words */
  readingGoal: ReadingGoal
  /** Auto-scroll speed in words per minute */
  autoScrollWpm: number
  /** Show arrow buttons for changing chapter in the book reader (swiping always works) */
  chapterArrows: boolean
}

const DEFAULTS: Settings = {
  theme: 'dark',
  version: 'ESV',
  readingGoal: 4000,
  autoScrollWpm: AUTO_SCROLL.default,
  chapterArrows: true,
}

export function clampWpm(value: number): number {
  const stepped = Math.round(value / AUTO_SCROLL.step) * AUTO_SCROLL.step
  return Math.min(AUTO_SCROLL.max, Math.max(AUTO_SCROLL.min, stepped))
}

function load(): Settings {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULTS }
    const { theme, version, readingGoal, autoScrollWpm, chapterArrows } = parsed as Partial<
      Record<keyof Settings, unknown>
    >
    return {
      theme: THEMES.includes(theme as Theme) ? (theme as Theme) : DEFAULTS.theme,
      version: VERSIONS.some((v) => v.id === version) ? (version as VersionId) : DEFAULTS.version,
      readingGoal: READING_GOALS.some((g) => g.words === readingGoal)
        ? (readingGoal as ReadingGoal)
        : DEFAULTS.readingGoal,
      autoScrollWpm:
        typeof autoScrollWpm === 'number' ? clampWpm(autoScrollWpm) : DEFAULTS.autoScrollWpm,
      chapterArrows: typeof chapterArrows === 'boolean' ? chapterArrows : DEFAULTS.chapterArrows,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const initial = load()
  const theme = ref<Theme>(initial.theme)
  const version = ref<VersionId>(initial.version)
  const readingGoal = ref<ReadingGoal>(initial.readingGoal)
  const autoScrollWpm = ref(initial.autoScrollWpm)
  const chapterArrows = ref(initial.chapterArrows)

  const bibleVersion = computed(() => findVersion(version.value))

  // colors.css switches palettes on <html data-theme="...">
  watch(
    theme,
    (value) => {
      document.documentElement.dataset.theme = value
    },
    { immediate: true },
  )

  watch([theme, version, readingGoal, autoScrollWpm, chapterArrows], () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          theme: theme.value,
          version: version.value,
          readingGoal: readingGoal.value,
          autoScrollWpm: autoScrollWpm.value,
          chapterArrows: chapterArrows.value,
        }),
      )
    } catch {
      // Storage can be unavailable (private mode, quota); settings still apply for this session
    }
  })

  return { theme, version, readingGoal, autoScrollWpm, chapterArrows, bibleVersion }
})
