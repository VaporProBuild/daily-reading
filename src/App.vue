<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useHideOnScroll } from '@/composables/useHideOnScroll'
import { useSettingsStore } from '@/stores/settings'

const REPO_URL = 'https://github.com/VaporProBuild/daily-reading'
const commit = __COMMIT_SHA__

// Create the settings store on every page so the saved theme is applied at startup
useSettingsStore()

const route = useRoute()
// The book reader has its own bar that does this, so the site header simply scrolls away there
const inReader = computed(() => route.name === 'book')
const { hidden } = useHideOnScroll()

// Today's chapter and other days share one page instance, so moving between days doesn't fade
function pageKey(name: unknown, fullPath: string) {
  if (name === 'today' || name === 'day') return 'reading'
  return name === 'book' ? fullPath : String(name)
}
</script>

<template>
  <header class="site-header" :class="{ sticky: !inReader, tucked: !inReader && hidden }">
    <RouterLink to="/" class="brand">Daily Reading</RouterLink>
    <nav>
      <RouterLink :to="{ name: 'today' }" class="nav-icon" title="Today's reading">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 6.5C10 5 7.5 4.5 3 4.5v14c4.5 0 7 .5 9 2 2-1.5 4.5-2 9-2v-14c-4.5 0-7 .5-9 2z"
          />
          <path d="M12 6.5v14" />
        </svg>
        <span class="sr-only">Today</span>
      </RouterLink>
      <RouterLink :to="{ name: 'library' }" class="nav-icon" title="Library">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 4.5h3.5v15H4zM9 4.5h3.5v15H9z" />
          <path d="M14 6.2l3.4-.9 3.4 13.6-3.4.9z" />
          <path d="M4 8h3.5M9 8h3.5M4 16h3.5M9 16h3.5" />
        </svg>
        <span class="sr-only">Library</span>
      </RouterLink>
      <RouterLink :to="{ name: 'twister' }" class="nav-icon" title="Daily tongue twister">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5.5h16v10H10l-4.5 3.5v-3.5H4z" />
          <path d="M7.5 10.5c1-1.4 2-1.4 3 0s2 1.4 3 0 2-1.4 3 0" />
        </svg>
        <span class="sr-only">Tongue twister</span>
      </RouterLink>
      <RouterLink :to="{ name: 'calendar' }" class="nav-icon" title="Calendar">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
        </svg>
        <span class="sr-only">Calendar</span>
      </RouterLink>
    </nav>
  </header>

  <main>
    <RouterView v-slot="{ Component, route: current }">
      <Transition name="page" mode="out-in">
        <component :is="Component" :key="pageKey(current.name, current.fullPath)" />
      </Transition>
    </RouterView>
  </main>

  <footer class="site-footer">
    <a
      v-if="commit !== 'dev'"
      :href="`${REPO_URL}/commit/${commit}`"
      target="_blank"
      rel="noopener"
      class="commit"
      title="The commit this version of the site was built from"
      >{{ commit.slice(0, 7) }}</a
    >
    <span v-else class="commit">Local build</span>
    <RouterLink :to="{ name: 'settings' }" class="settings-link">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
        />
      </svg>
      Settings
    </RouterLink>
  </footer>
</template>

<style scoped>
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 0;
  margin-bottom: 1.5rem;
  background: var(--c-header-bg);
  /* Extend the header band to the full window width while content stays centred */
  box-shadow: 0 0 0 100vmax var(--c-header-bg);
  clip-path: inset(0 -100vmax);
  transition: transform 0.3s ease;
}

/* Stays at the top, slides away while scrolling down and back on the first scroll up */
.site-header.sticky {
  position: sticky;
  top: 0;
  z-index: 30;
}

.site-header.tucked {
  transform: translateY(-100%);
}

@media (prefers-reduced-motion: reduce) {
  .site-header {
    transition: none;
  }
}

.brand {
  font-family: var(--font-serif);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--c-header-text);
  text-decoration: none;
}

nav {
  display: flex;
  gap: 0.25rem;
}

.nav-icon {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  color: var(--c-header-muted);
  transition:
    background-color 0.25s ease,
    color 0.25s ease;
}

/* Quick cross-fade between pages */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.16s ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}

.nav-icon:hover {
  color: var(--c-header-text);
}

.nav-icon.router-link-exact-active {
  background: var(--c-accent);
  color: var(--c-on-accent);
}

.nav-icon svg {
  width: 1.35rem;
  height: 1.35rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

main {
  flex: 1;
}

.site-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 2.5rem;
  padding: 1rem 0;
  border-top: 1px solid var(--c-border);
  font-size: 0.85rem;
}

.commit {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--c-text-muted);
  text-decoration: none;
}

a.commit:hover {
  color: var(--c-text);
}

.settings-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  text-decoration: none;
}

.settings-link svg {
  width: 1.1rem;
  height: 1.1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (max-width: 380px) {
  .brand {
    font-size: 1.1rem;
  }

  nav {
    gap: 0.1rem;
  }

  .nav-icon {
    width: 2.25rem;
    height: 2.25rem;
  }
}
</style>
