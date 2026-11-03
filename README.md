# daily-reading
Daily Scripture and Reading.

Including 1 chapter of the Bible per day, along with ten suggested pages from a book to read.

## Development

Vue 3 + TypeScript + Vite, with Vue Router and Pinia.

```sh
npm install
npm run dev      # local dev server
npm run build    # type-check and build to dist/
npm run lint
npm run format
```

## Deployment

Every push to `main` builds the site and publishes it to GitHub Pages via
`.github/workflows/deploy.yml`: https://vaporprobuild.github.io/daily-reading/

## Library

The Library (`/library`) has public-domain Christian classics converted from Project
Gutenberg's HTML editions with `scripts/convert_book.py`, stored in `public/library/`.
Readers set a daily goal (2,000, 4,000 or 8,000 words) in Settings. A paragraph counts
once it scrolls past the top third of the screen, so the goal is reached at the end of a
paragraph, and each book reopens where the reader left off.

### Canada-only books

C.S. Lewis's books are public domain in Canada but not in the US, so they are never stored
in this repo. They are served by a separate Canadian host that only answers visitors in
Canada. Set the repository variable `CANADA_LIBRARY_URL` to that host and the deploy passes
it to the build as `VITE_CANADA_LIBRARY_URL`. Without it, the Library shows only the
bundled classics. `scripts/build_canada_library.py` prepares those books from Fadedpage
downloads kept outside the repo.
