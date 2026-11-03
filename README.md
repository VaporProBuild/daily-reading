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
