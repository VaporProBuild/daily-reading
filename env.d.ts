/// <reference types="vite/client" />

/** Git commit the site was built from (see vite.config.ts), or 'dev' if unknown */
declare const __COMMIT_SHA__: string

interface ImportMetaEnv {
  /** Base URL of the Canadian host serving Canada-only public-domain books (see README) */
  readonly VITE_CANADA_LIBRARY_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
