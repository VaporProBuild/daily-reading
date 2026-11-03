"""Build the Canada-only library from Fadedpage downloads.

Usage: python3 -I scripts/build_canada_library.py <canada-books-folder>

The folder holds manifest.json and raw/<pid>.html (downloaded by hand from fadedpage.com).
Writes <folder>/books/<id>.json for each book and <folder>/books/catalog.json, ready to
upload to the Canadian host. Never copy these files into this repository: the books are
public domain in Canada but still under copyright in other countries.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from convert_book import convert  # noqa: E402

folder = sys.argv[1]
manifest = json.load(open(os.path.join(folder, 'manifest.json'), encoding='utf-8'))
out_dir = os.path.join(folder, 'books')
os.makedirs(out_dir, exist_ok=True)

catalog = []
missing = []
for entry in manifest:
    src = os.path.join(folder, 'raw', f"{entry['pid']}.html")
    if not os.path.exists(src):
        missing.append(f"{entry['pid']}  {entry['title']}")
        continue
    words, blocks = convert(src, os.path.join(out_dir, f"{entry['id']}.json"))
    print(f"{entry['id']}: {words} words, {len(blocks)} blocks")
    catalog.append({k: v for k, v in entry.items() if k != 'pid'} | {'words': words})

with open(os.path.join(out_dir, 'catalog.json'), 'w', encoding='utf-8') as f:
    json.dump(catalog, f, ensure_ascii=False, indent=2)
print(f'catalog.json: {len(catalog)} books')
if missing:
    print('Missing downloads (save the HTML version from fadedpage.com into raw/):')
    for m in missing:
        print('  ', m)
