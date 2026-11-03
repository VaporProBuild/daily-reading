import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// GitHub Actions sets GITHUB_SHA to the pushed commit; locally fall back to the checked-out commit
function commitSha(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA
  try {
    return execSync('git rev-parse HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}

// The app version shown in the footer comes from package.json
const appVersion: string = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
).version

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the site from https://<user>.github.io/daily-reading/
  base: '/daily-reading/',
  define: {
    __COMMIT_SHA__: JSON.stringify(commitSha()),
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
