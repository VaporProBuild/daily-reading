import type { Block, BookText } from '@/composables/useLibrary'

/*
 * Converts a book file chosen by the reader (EPUB, plain text or HTML) into the reader's
 * block format, entirely in the browser. Mirrors scripts/convert_book.py.
 */

export interface ImportedBook {
  title: string
  author: string
  text: BookText
}

export const ACCEPTED_FILES = '.epub,.txt,.html,.htm,.xhtml'
const MAX_BYTES = 30 * 1024 * 1024

const SKIP_TAGS = new Set(['script', 'style', 'table', 'head', 'title', 'nav', 'figure', 'svg'])
const SKIP_CLASSES = [
  'pagenum',
  'pageno',
  'page',
  'fnanchor',
  'toc',
  'tnote',
  'transnote',
  'caption',
]
const VERSE_CLASSES = ['poem', 'stanza', 'verse', 'poetry']
const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4'])
const CREDIT =
  /^(this e-?text|produced by|e-?text prepared|transcriber'?s? note|transcribed from|proofread)/i

const squash = (s: string) => s.replace(/\s+/g, ' ').trim()

function hasClass(el: Element, names: string[]) {
  return names.some((n) => el.classList.contains(n))
}

/** Text of a verse element, keeping one line per <br>, <div> or <p>. */
function verseText(el: Element): string {
  const copy = el.cloneNode(true) as Element
  copy.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
  copy.querySelectorAll('div, p').forEach((line) => line.append('\n'))
  return (copy.textContent ?? '').split('\n').map(squash).filter(Boolean).join('\n')
}

/** Contents entries are paragraphs made only of internal links. */
function onlyInternalLinks(el: Element) {
  const links = Array.from(el.querySelectorAll('a[href^="#"]'))
  if (!links.length) return false
  const copy = el.cloneNode(true) as Element
  copy.querySelectorAll('a[href^="#"]').forEach((a) => a.remove())
  return !/[A-Za-z]{2,}/.test(copy.textContent ?? '')
}

function walk(el: Element, blocks: Block[]) {
  for (const child of Array.from(el.children)) {
    const tag = child.tagName.toLowerCase()
    if (SKIP_TAGS.has(tag) || hasClass(child, SKIP_CLASSES)) continue
    if (child.id === 'pg-header') continue
    if (child.id === 'pg-footer') return
    if (HEADINGS.has(tag)) {
      blocks.push(['h', squash(child.textContent ?? '')])
    } else if (tag === 'pre' || hasClass(child, VERSE_CLASSES)) {
      blocks.push(['v', verseText(child)])
    } else if (tag === 'p') {
      if (onlyInternalLinks(child)) continue
      child.querySelectorAll('br').forEach((br) => br.replaceWith(' '))
      blocks.push(['p', squash(child.textContent ?? '')])
    } else {
      walk(child, blocks)
    }
  }
}

/** Plain text: paragraphs are separated by blank lines; short title-like lines are headings. */
function textToBlocks(raw: string): Block[] {
  let body = raw.replace(/\r\n?/g, '\n')
  const start = body.search(/^\*\*\* ?START OF .*$/m)
  if (start >= 0) body = body.slice(body.indexOf('\n', start) + 1)
  const end = body.search(/^\*\*\* ?END OF /m)
  if (end >= 0) body = body.slice(0, end)
  return body
    .split(/\n\s*\n/)
    .map((para) =>
      para
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    )
    .filter((lines) => lines.length)
    .map((lines): Block => {
      const text = lines.join(' ')
      const looksLikeHeading =
        lines.length === 1 &&
        text.length <= 70 &&
        (/^(chapter|book|part|letter|section)\b/i.test(text) ||
          (/[A-Z]/.test(text) && text === text.toUpperCase()))
      return [looksLikeHeading ? 'h' : 'p', text]
    })
}

/** Drop producer credits, contents lists and editorial paragraph numbers. */
function clean(blocks: Block[]): Block[] {
  const out: Block[] = []
  let inContents = false
  blocks.forEach(([kind, raw], i) => {
    const text = raw.replace(/\{\d+\}\s*/g, '').trim()
    if (!text || !/\w/.test(text)) return
    if (kind === 'h') {
      inContents = /^(table of )?contents\.?$/i.test(text)
      if (inContents) return
    } else if (inContents) {
      return
    }
    if (i < 20 && CREDIT.test(text)) return
    if (kind === 'p' && (text.match(/\bCHAPTER [IVXLC\d]+\b/g)?.length ?? 0) >= 3) return
    out.push([kind, text])
  })
  // Notes before the first heading are editorial (scanner credits, printer corrections)
  const firstHeading = out.findIndex(([k]) => k === 'h')
  return firstHeading > 0 && firstHeading <= 10 ? out.slice(firstHeading) : out
}

function toBookText(blocks: Block[]): BookText {
  const cleaned = clean(blocks)
  const words = cleaned
    .filter(([k]) => k !== 'h')
    .reduce((sum, [, t]) => sum + t.split(/\s+/).filter(Boolean).length, 0)
  return { words, blocks: cleaned }
}

function tidyTitle(title: string) {
  return squash(
    title.replace(/^the project gutenberg e-?book of\s*/i, '').replace(/,\s*by\s.*$/i, ''),
  )
}

function fileStem(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim() || 'Untitled'
  )
}

async function importEpub(file: File): Promise<ImportedBook> {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml')
  const read = async (path: string) => {
    const entry = zip.file(path) ?? zip.file(decodeURIComponent(path))
    if (!entry) throw new Error(`Missing ${path} in EPUB`)
    return entry.async('string')
  }

  const container = xml(await read('META-INF/container.xml'))
  const opfPath = container.querySelector('rootfile')?.getAttribute('full-path')
  if (!opfPath) throw new Error('Not a valid EPUB file')
  const opf = xml(await read(opfPath))
  const base = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : ''

  const meta = (name: string) =>
    squash(opf.getElementsByTagName(`dc:${name}`)[0]?.textContent ?? '')
  const manifest = new Map(
    Array.from(opf.getElementsByTagName('item')).map((item) => [
      item.getAttribute('id'),
      item.getAttribute('href'),
    ]),
  )

  const blocks: Block[] = []
  for (const ref of Array.from(opf.getElementsByTagName('itemref'))) {
    const href = manifest.get(ref.getAttribute('idref'))
    if (!href) continue
    const path = new URL(href, `https://epub.invalid/${base}`).pathname.slice(1)
    const doc = new DOMParser().parseFromString(await read(path), 'text/html')
    walk(doc.body, blocks)
  }
  return {
    title: tidyTitle(meta('title')) || fileStem(file.name),
    author: meta('creator'),
    text: toBookText(blocks),
  }
}

async function importHtml(file: File): Promise<ImportedBook> {
  // DOMParser documents are inert: scripts never run and images never load
  const doc = new DOMParser().parseFromString(await file.text(), 'text/html')
  const blocks: Block[] = []
  walk(doc.body, blocks)
  const author =
    doc.querySelector('meta[name="author"], meta[name="dc.creator" i]')?.getAttribute('content') ??
    ''
  return {
    title: tidyTitle(doc.title) || fileStem(file.name),
    author: squash(author),
    text: toBookText(blocks),
  }
}

async function importText(file: File): Promise<ImportedBook> {
  const raw = await file.text()
  const field = (name: string) =>
    squash(raw.match(new RegExp(`^${name}:\\s*(.+)$`, 'mi'))?.[1] ?? '')
  return {
    title: field('Title') || fileStem(file.name),
    author: field('Author'),
    text: toBookText(textToBlocks(raw)),
  }
}

export async function importBookFile(file: File): Promise<ImportedBook> {
  if (file.size > MAX_BYTES) throw new Error('That file is too large (over 30 MB).')
  const ext = file.name.toLowerCase().split('.').pop()
  let book: ImportedBook
  if (ext === 'epub') book = await importEpub(file)
  else if (ext === 'txt') book = await importText(file)
  else if (ext === 'html' || ext === 'htm' || ext === 'xhtml') book = await importHtml(file)
  else throw new Error('Choose an EPUB, TXT or HTML file.')
  if (book.text.words < 50) throw new Error("Couldn't find any readable text in that file.")
  return book
}
