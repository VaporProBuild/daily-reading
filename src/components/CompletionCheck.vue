<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const { message = 'Chapter complete!', detail } = defineProps<{
  message?: string
  detail?: string
}>()
const emit = defineEmits<{ done: [] }>()

let timer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  timer = setTimeout(() => emit('done'), 2200)
})

onUnmounted(() => clearTimeout(timer))

const sparks = Array.from({ length: 12 }, (_, i) => i * 30)
</script>

<template>
  <div class="overlay" role="status" aria-live="polite" @click="emit('done')">
    <div class="badge">
      <span
        v-for="angle in sparks"
        :key="angle"
        class="spark"
        :style="{ '--angle': `${angle}deg` }"
      />
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle class="disc" cx="60" cy="60" r="54" />
        <circle class="ring" cx="60" cy="60" r="54" />
        <path class="tick" d="M36 62 L53 79 L86 44" />
      </svg>
    </div>
    <p class="message">{{ message }}</p>
    <p v-if="detail" class="detail">{{ detail }}</p>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  background: var(--c-overlay);
  backdrop-filter: blur(4px);
  animation: fade 2.2s ease forwards;
  cursor: pointer;
}

.badge {
  position: relative;
  width: min(45vw, 200px);
  aspect-ratio: 1;
  animation: pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

svg {
  width: 100%;
  height: 100%;
  overflow: visible;
  filter: drop-shadow(0 10px 30px var(--c-success-glow));
}

.disc {
  fill: var(--c-success);
}

.ring {
  fill: none;
  stroke: var(--c-success-light);
  stroke-width: 6;
  stroke-dasharray: 340;
  stroke-dashoffset: 340;
  transform: rotate(-90deg);
  transform-origin: center;
  animation: draw 0.6s 0.15s ease-out forwards;
}

.tick {
  fill: none;
  stroke: var(--c-on-success);
  stroke-width: 10;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 80;
  stroke-dashoffset: 80;
  animation: draw 0.4s 0.45s ease-out forwards;
}

.spark {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  margin: -5px;
  border-radius: 50%;
  background: var(--c-success-light);
  opacity: 0;
  animation: burst 0.8s 0.4s ease-out forwards;
}

.message {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--c-success);
  animation: rise 0.5s 0.6s ease-out both;
}

.detail {
  margin-top: -0.75rem;
  color: var(--c-text-muted);
  animation: rise 0.5s 0.7s ease-out both;
}

@keyframes pop {
  from {
    transform: scale(0.2);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes burst {
  0% {
    opacity: 1;
    transform: rotate(var(--angle)) translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: rotate(var(--angle)) translateY(-130%) scale(0.3);
  }
}

@keyframes rise {
  from {
    transform: translateY(12px);
    opacity: 0;
  }
  to {
    transform: none;
    opacity: 1;
  }
}

@keyframes fade {
  0%,
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .overlay,
  .badge,
  .ring,
  .tick,
  .message,
  .detail {
    animation: none;
    stroke-dashoffset: 0;
  }
  .spark {
    display: none;
  }
}
</style>
