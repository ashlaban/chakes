<!--
  ErrorBanner — app-wide surface for reported failures.

  Rendered once by App.vue so that any store can report a failure without
  knowing where it will be shown.
-->

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useErrorStore } from '../../stores/errors'

const store = useErrorStore()
const { errors } = storeToRefs(store)
</script>

<template>
  <div
    v-if="errors.length"
    class="error-stack"
    role="alert"
    aria-live="polite"
  >
    <div
      v-for="e in errors"
      :key="e.id"
      class="error-item"
    >
      <span class="error-message">{{ e.message }}</span>
      <button
        class="dismiss"
        title="Dismiss"
        @click="store.dismiss(e.id)"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<style scoped>
.error-stack {
  position: fixed;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: min(520px, calc(100vw - 24px));
}
.error-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(220, 50, 50, 0.5);
  background: #fde2e2;
  color: #7a1f1f;
  font-size: 14px;
  text-align: left;
  box-shadow: var(--shadow);
}
.error-message {
  flex: 1;
}
.dismiss {
  flex: none;
  padding: 0 6px;
  font: inherit;
  line-height: 1.4;
  cursor: pointer;
  background: none;
  border: none;
  color: inherit;
  opacity: 0.7;
}
.dismiss:hover {
  opacity: 1;
}
@media (prefers-color-scheme: dark) {
  .error-item {
    background: #3a1414;
    color: #f5c6c6;
  }
}
</style>
