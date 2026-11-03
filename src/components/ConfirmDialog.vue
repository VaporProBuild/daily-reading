<script setup lang="ts">
import { onMounted, ref } from 'vue'

const {
  title,
  message,
  confirmLabel = 'Confirm',
} = defineProps<{
  title: string
  message: string
  confirmLabel?: string
}>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)

// showModal() traps focus and closes on Escape (which fires "cancel")
onMounted(() => dialog.value?.showModal())

function confirm() {
  dialog.value?.close()
  emit('confirm')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="confirm"
    aria-labelledby="confirm-title"
    @cancel.prevent="emit('cancel')"
    @click.self="emit('cancel')"
  >
    <div class="panel">
      <h2 id="confirm-title">{{ title }}</h2>
      <p>{{ message }}</p>
      <div class="actions">
        <button type="button" class="cancel" autofocus @click="emit('cancel')">Cancel</button>
        <button type="button" class="danger" @click="confirm">{{ confirmLabel }}</button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.confirm {
  max-width: min(26rem, calc(100vw - 2rem));
  padding: 0;
  border: 1px solid var(--c-border);
  border-radius: 16px;
  background: var(--c-surface);
  color: var(--c-text);
}

.confirm::backdrop {
  background: var(--c-overlay);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.4rem 1.4rem 1.2rem;
}

h2 {
  font-family: var(--font-serif);
  font-size: 1.25rem;
}

p {
  color: var(--c-text-muted);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

button {
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.cancel {
  border: 1px solid var(--c-border);
  background: none;
  color: var(--c-text);
}

.danger {
  border: 1px solid var(--c-danger);
  background: var(--c-danger);
  color: var(--c-bg);
}
</style>
