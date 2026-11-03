export const CATEGORIES = [
  'Stories & Allegory',
  'Prayer & Devotion',
  'Christian Living',
  'Faith & Reason',
] as const

export type Category = (typeof CATEGORIES)[number]

export interface LibraryBook {
  id: string
  title: string
  author: string
  /** First published */
  year: string
  /** Topic for bundled and Canadian books; books readers add themselves have none */
  category?: Category
  description: string
  words: number
  /**
   * 'bundled' books ship in public/library/. 'canada' books are public domain in Canada only
   * and are served by the separate Canadian host (see README). 'mine' books were added by the
   * reader and are stored only in their browser.
   */
  source: 'bundled' | 'canada' | 'mine'
  /** When a 'mine' book was added (ISO timestamp) */
  addedAt?: string
}

/** Pages are counted at 400 words, so 10 pages a day is 4,000 words */
export const WORDS_PER_PAGE = 400

export const READING_GOALS = [
  { words: 2000, pages: 5 },
  { words: 4000, pages: 10 },
  { words: 8000, pages: 20 },
] as const

export type ReadingGoal = (typeof READING_GOALS)[number]['words']

export const BUNDLED_BOOKS: LibraryBook[] = [
  {
    id: 'pilgrims-progress',
    title: "The Pilgrim's Progress",
    author: 'John Bunyan',
    year: '1678',
    category: 'Stories & Allegory',
    description:
      'Christian leaves the City of Destruction for the Celestial City in this famous allegory of the Christian life.',
    words: 57550,
    source: 'bundled',
  },
  {
    id: 'princess-and-the-goblin',
    title: 'The Princess and the Goblin',
    author: 'George MacDonald',
    year: '1872',
    category: 'Stories & Allegory',
    description:
      'Princess Irene, a brave miner’s son and a mysterious grandmother in the fairy tale that shaped C.S. Lewis.',
    words: 50625,
    source: 'bundled',
  },
  {
    id: 'princess-and-curdie',
    title: 'The Princess and Curdie',
    author: 'George MacDonald',
    year: '1883',
    category: 'Stories & Allegory',
    description: 'Curdie sets out on a quest to save the king and a kingdom gone rotten.',
    words: 55730,
    source: 'bundled',
  },
  {
    id: 'back-of-the-north-wind',
    title: 'At the Back of the North Wind',
    author: 'George MacDonald',
    year: '1871',
    category: 'Stories & Allegory',
    description:
      'Young Diamond, a coachman’s son, is befriended by the North Wind in a gentle story about goodness and trust.',
    words: 88304,
    source: 'bundled',
  },
  {
    id: 'in-his-steps',
    title: 'In His Steps',
    author: 'Charles M. Sheldon',
    year: '1896',
    category: 'Stories & Allegory',
    description:
      'A congregation pledges to ask “What would Jesus do?” before every decision for a whole year.',
    words: 82149,
    source: 'bundled',
  },
  {
    id: 'ben-hur',
    title: 'Ben-Hur: A Tale of the Christ',
    author: 'Lew Wallace',
    year: '1880',
    category: 'Stories & Allegory',
    description:
      'A Jewish prince is betrayed by his oldest friend, and his story crosses paths with the life of Christ.',
    words: 197133,
    source: 'bundled',
  },
  {
    id: 'practice-of-the-presence-of-god',
    title: 'The Practice of the Presence of God',
    author: 'Brother Lawrence',
    year: '1692',
    category: 'Prayer & Devotion',
    description:
      'Conversations and letters from a monastery cook on living every moment, even washing dishes, with God.',
    words: 10956,
    source: 'bundled',
  },
  {
    id: 'imitation-of-christ',
    title: 'The Imitation of Christ',
    author: 'Thomas à Kempis',
    year: 'c. 1427',
    category: 'Prayer & Devotion',
    description: 'Short, searching chapters on humility, inner peace and following Jesus.',
    words: 61724,
    source: 'bundled',
  },
  {
    id: 'power-through-prayer',
    title: 'Power Through Prayer',
    author: 'E. M. Bounds',
    year: '1907',
    category: 'Prayer & Devotion',
    description: 'A short, stirring call to make prayer the heart of Christian life.',
    words: 21662,
    source: 'bundled',
  },
  {
    id: 'humility',
    title: 'Humility: The Beauty of Holiness',
    author: 'Andrew Murray',
    year: '1895',
    category: 'Christian Living',
    description: 'A short book on humility as the root of every Christian virtue.',
    words: 20693,
    source: 'bundled',
  },
  {
    id: 'orthodoxy',
    title: 'Orthodoxy',
    author: 'G. K. Chesterton',
    year: '1908',
    category: 'Faith & Reason',
    description: 'Chesterton’s witty account of how he came to believe that Christianity is true.',
    words: 63705,
    source: 'bundled',
  },
]
