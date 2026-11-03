<script setup lang="ts">
import { computed } from 'vue'
import { twisterForDate } from '@/data/tongueTwisters'
import { fromDateKey, todayKey } from '@/lib/readingPlan'
import { TWISTER_DONE_AT, TWISTER_MAX, useTwisterStore } from '@/stores/twister'

const today = todayKey()
const twister = twisterForDate(today)
const dateLabel = fromDateKey(today).toLocaleDateString(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

const store = useTwisterStore()
const GOAL = TWISTER_MAX
const said = computed(() => store.count(today))

const encouragement = computed(() => {
  if (said.value >= GOAL) return "Great job! It's on your calendar. See you tomorrow."
  if (said.value >= TWISTER_DONE_AT)
    return "Done for today, it's on your calendar. Once or twice more?"
  return 'Tap each time you say it.'
})
</script>

<template>
  <section class="twister-page">
    <header>
      <p class="eyebrow">{{ dateLabel }}</p>
      <h1>Daily Tongue Twister</h1>
      <p class="intro">
        Tongue twisters are a great way to practise your speech. Repeat this one 3 to 5 times in the
        morning to help with your pronunciation.
      </p>
    </header>

    <blockquote class="twister">{{ twister }}</blockquote>

    <div class="practice">
      <button type="button" class="said" :disabled="said >= GOAL" @click="store.said(today)">
        I said it
      </button>
      <div class="dots" role="img" :aria-label="`Said ${said} of ${GOAL} times`">
        <span v-for="n in GOAL" :key="n" :class="{ on: n <= said }" />
      </div>
      <p class="encouragement" aria-live="polite">{{ encouragement }}</p>
    </div>
  </section>
</template>

<style scoped>
.twister-page {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  text-align: center;
}

.eyebrow {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-accent);
}

h1 {
  margin: 0.25rem 0 0.5rem;
  font-family: var(--font-serif);
  font-size: 2rem;
}

.intro {
  max-width: 32rem;
  margin: 0 auto;
  color: var(--c-text-muted);
}

.twister {
  margin: 0;
  padding: 2.5rem 1.5rem;
  border: 1px solid var(--c-border);
  border-radius: 16px;
  background: var(--c-surface);
  font-family: var(--font-serif);
  font-size: clamp(1.6rem, 6vw, 2.4rem);
  line-height: 1.3;
  /* The twister is for saying aloud, not copying */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  cursor: default;
}

.practice {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.said {
  padding: 0.8rem 1.75rem;
  border: 0;
  border-radius: 999px;
  background: var(--c-accent);
  color: var(--c-on-accent);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.said:hover:not(:disabled) {
  background: var(--c-accent-hover);
}

.said:disabled {
  opacity: 0.5;
  cursor: default;
}

.dots {
  display: flex;
  gap: 0.5rem;
}

.dots span {
  width: 0.8rem;
  height: 0.8rem;
  border: 2px solid var(--c-accent);
  border-radius: 50%;
  transition: background 0.2s;
}

.dots span.on {
  background: var(--c-accent);
}

.encouragement {
  font-size: 0.9rem;
  color: var(--c-text-muted);
}
</style>
