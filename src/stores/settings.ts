import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { READING_GOALS, type ReadingGoal } from '@/data/library'
import { VERSIONS, findVersion, type VersionId } from '@/data/versions'

const STORAGE_KEY = 'daily-reading:settings'

export const THEMES = ['dark', 'light', 'greyscale', 'whitescale'] as const
export type Theme = (typeof THEMES)[number]

interface Settings {
  theme: Theme
  version: VersionId
  /** Daily library reading goal in words */
  readingGoal: ReadingGoal
}

const DEFAULTS: Settings = { theme: 'dark', version: 'ESV', readingGoal: 4000 }

function load(): Settings {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULTS }
    const { theme, version, readingGoal } = parsed as Partial<Record<keyof Settings, unknown>>
    return {
      theme: THEMES.includes(theme as Theme) ? (theme as Theme) : DEFAULTS.theme,
      version: VERSIONS.some((v) => v.id === version) ? (version as VersionId) : DEFAULTS.version,
      readingGoal: READING_GOALS.some((g) => g.words === readingGoal)
        ? (readingGoal as ReadingGoal)
        : DEFAULTS.readingGoal,
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

  const bibleVersion = computed(() => findVersion(version.value))

  // colors.css switches palettes on <html data-theme="...">
  watch(
    theme,
    (value) => {
      document.documentElement.dataset.theme = value
    },
    { immediate: true },
  )

  watch([theme, version, readingGoal], ([themeValue, versionValue, goalValue]) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ theme: themeValue, version: versionValue, readingGoal: goalValue }),
      )
    } catch {
      // Storage can be unavailable (private mode, quota); settings still apply for this session
    }
  })

  return { theme, version, readingGoal, bibleVersion }
})
