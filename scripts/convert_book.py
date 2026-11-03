"""Convert a public-domain book's HTML edition into the reader's JSON format.

Usage: python3 -I scripts/convert_book.py <input.html> <output.json>

Output is {"words": N, "blocks": [[kind, text], ...]} where kind is
"h" (heading), "p" (paragraph) or "v" (verse, lines separated by "\\n").
Project Gutenberg's licence header and footer, page numbers, contents lists
and image captions are dropped.
"""

import json
import re
import sys
from html.parser import HTMLParser

SKIP_TAGS = {'script', 'style', 'table', 'head', 'title'}
SKIP_CLASSES = {'pagenum', 'pageno', 'page', 'fnanchor', 'toc', 'tnote', 'transnote', 'caption'}
VERSE_CLASSES = {'poem', 'stanza', 'verse', 'poetry'}
HEADINGS = {'h1', 'h2', 'h3', 'h4'}
VOID = {'br', 'img', 'hr', 'meta', 'link', 'input', 'col', 'wbr'}


class BookParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks = []
        self.stack = []  # (tag, flags) for open elements
        self.done = False
        self.buf = None  # (kind, parts, links_only) for the block being collected
        self.text_outside_links = False

    def _classes(self, attrs):
        return set((dict(attrs).get('class') or '').lower().split())

    def _skipping(self):
        return any(flags.get('skip') for _, flags in self.stack)

    def _in_verse(self):
        return any(flags.get('verse') for _, flags in self.stack)

    def handle_starttag(self, tag, attrs):
        if self.done:
            return
        a = dict(attrs)
        if a.get('id') == 'pg-footer':
            self.done = True
            return
        if tag in VOID:
            if tag == 'br' and self.buf:
                self.buf[1].append('\n' if self.buf[0] == 'v' else ' ')
            return
        classes = self._classes(attrs)
        flags = {}
        if tag in SKIP_TAGS or classes & SKIP_CLASSES or a.get('id') == 'pg-header':
            flags['skip'] = True
        if not self._skipping() and not flags.get('skip'):
            if (tag == 'pre' or (tag == 'div' and classes & VERSE_CLASSES)) and not self._in_verse():
                flags['verse'] = True
                self._start('v')
            elif tag in HEADINGS and not self._in_verse():
                self._start('h')
            elif tag == 'p' and not self._in_verse():
                self._start('p')
            elif tag == 'a' and (a.get('href') or '').startswith('#'):
                flags['link'] = True
            elif self._in_verse() and tag in ('div', 'span', 'p') and self.buf and self.buf[1]:
                # Each line of a poem is usually its own div/span
                if classes & {'line'} or re.match(r'i\d+', ' '.join(classes)) or tag in ('div', 'p'):
                    self.buf[1].append('\n')
        self.stack.append((tag, flags))

    def handle_endtag(self, tag):
        if self.done:
            return
        if tag in VOID:
            return
        # Pop to the matching tag (HTML can be sloppy)
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                popped = self.stack[i:]
                del self.stack[i:]
                break
        else:
            return
        if self.buf and not self._skipping():
            kind = self.buf[0]
            if (kind == 'v' and any(f.get('verse') for _, f in popped)) or (
                kind == 'h' and tag in HEADINGS) or (kind == 'p' and tag == 'p'):
                self._finish()

    def handle_data(self, data):
        if self.done or self._skipping() or not self.buf:
            return
        self.buf[1].append(data)
        in_link = any(flags.get('link') for _, flags in self.stack)
        if not in_link and re.search(r'[A-Za-z]{2,}', data):
            self.text_outside_links = True

    def _start(self, kind):
        if self.buf:
            self._finish()
        self.buf = (kind, [])
        self.text_outside_links = False

    def _finish(self):
        kind, parts = self.buf
        self.buf = None
        raw = ''.join(parts)
        if kind == 'v':
            lines = [re.sub(r'[ \t\r\f\v]+', ' ', l).strip() for l in raw.split('\n')]
            text = '\n'.join(l for l in lines if l)
        else:
            text = re.sub(r'\s+', ' ', raw).strip()
        if not text or not re.search(r'\w', text):
            return
        # Contents entries are paragraphs made only of internal links
        if kind == 'p' and not self.text_outside_links:
            return
        self.blocks.append([kind, text])


CREDIT = re.compile(
    r"^(this e-?text|produced by|e-?text prepared|transcriber'?s? note|transcribed from|proofread)", re.I
)


def clean(blocks):
    """Drop producer credits, contents lists and editorial paragraph numbers."""
    out = []
    in_contents = False
    for i, (kind, text) in enumerate(blocks):
        text = re.sub(r'\{\d+\}\s*', '', text).strip()
        if not text:
            continue
        if kind == 'h':
            in_contents = bool(re.match(r'^(table of )?contents\.?$', text, re.I))
            if in_contents:
                continue
        elif in_contents:
            continue
        if i < 20 and CREDIT.match(text):
            continue
        # A contents list squashed into one paragraph: "CHAPTER I. ... CHAPTER II. ..."
        if kind == 'p' and len(re.findall(r'\bCHAPTER [IVXLC\d]+\b', text)) >= 3:
            continue
        out.append([kind, text])
    # Notes before the title heading are editorial (scanner credits, printer corrections)
    first_heading = next((i for i, (k, _) in enumerate(out) if k == 'h'), 0)
    if first_heading <= 10:
        out = out[first_heading:]
    return out


def convert(src, dst):
    with open(src, encoding='utf-8', errors='replace') as f:
        html = f.read()
    parser = BookParser()
    parser.feed(html)
    if parser.buf:
        parser._finish()
    blocks = clean(parser.blocks)
    words = sum(len(t.split()) for k, t in blocks if k != 'h')
    with open(dst, 'w', encoding='utf-8') as f:
        json.dump({'words': words, 'blocks': blocks}, f, ensure_ascii=False, separators=(',', ':'))
    return words, blocks


if __name__ == '__main__':
    words, blocks = convert(sys.argv[1], sys.argv[2])
    heads = [t for k, t in blocks if k == 'h']
    print(f'{sys.argv[2]}: {words} words, {len(blocks)} blocks, {len(heads)} headings')
