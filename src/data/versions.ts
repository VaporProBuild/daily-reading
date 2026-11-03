import type { Reading } from '@/lib/readingPlan'

export type VersionId = 'ESV' | 'NIV' | 'KJV' | 'CSB' | 'NLT'

/** Public-domain texts bundled in public/bible/<dir>/ */
export const TEXTS = {
  web: { dir: 'web', name: 'World English Bible' },
  kjv: { dir: 'kjv', name: 'King James Version' },
} as const

export type TextId = keyof typeof TEXTS

export interface BibleVersion {
  id: VersionId
  name: string
  /** The translation's home page */
  homeUrl: string
  /** Bundled text shown on the page. Copyrighted versions can't be bundled, so they show the WEB. */
  text: TextId
  chapterUrl: (reading: Reading) => string
}

function passage(reading: Reading) {
  return `${reading.book.name} ${reading.chapter}`
}

function bibleGateway(version: VersionId) {
  return (reading: Reading) =>
    `https://www.biblegateway.com/passage/?search=${encodeURIComponent(passage(reading))}&version=${version}`
}

export const VERSIONS: BibleVersion[] = [
  {
    id: 'ESV',
    name: 'English Standard Version',
    homeUrl: 'https://www.esv.org/',
    text: 'web',
    chapterUrl: (reading) =>
      `https://www.esv.org/${encodeURIComponent(passage(reading)).replace(/%20/g, '+')}/`,
  },
  {
    id: 'NIV',
    name: 'New International Version',
    homeUrl: 'https://www.thenivbible.com/',
    text: 'web',
    chapterUrl: bibleGateway('NIV'),
  },
  {
    id: 'KJV',
    name: 'King James Version',
    homeUrl: 'https://www.biblegateway.com/versions/King-James-Version-KJV-Bible/',
    text: 'kjv',
    chapterUrl: bibleGateway('KJV'),
  },
  {
    id: 'CSB',
    name: 'Christian Standard Bible',
    homeUrl: 'https://csbible.com/',
    text: 'web',
    chapterUrl: bibleGateway('CSB'),
  },
  {
    id: 'NLT',
    name: 'New Living Translation',
    homeUrl: 'https://www.tyndale.com/nlt/',
    text: 'web',
    chapterUrl: bibleGateway('NLT'),
  },
]

export function findVersion(id: VersionId): BibleVersion {
  return VERSIONS.find((v) => v.id === id) ?? VERSIONS[0]!
}
