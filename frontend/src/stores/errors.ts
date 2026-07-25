import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ApiError } from '../services/api'

export interface ReportedError {
  id: number
  /** Shown to the player. */
  message: string
  /** Kept for the console and for support questions, not rendered. */
  detail: string
}

let nextId = 1

/**
 * One place for failures the player needs to know about.
 *
 * Callers report here instead of each store growing its own `error` ref, so
 * there is a single component rendering them and a single wording convention.
 */
export const useErrorStore = defineStore('errors', () => {
  const errors = ref<ReportedError[]>([])

  /**
   * @param context what was being attempted, phrased for a player
   *   ("Could not create the lobby")
   */
  function report(cause: unknown, context: string): void {
    const reason = cause instanceof ApiError ? cause.userMessage : 'Something went wrong.'
    const detail = cause instanceof Error ? cause.message : String(cause)

    // The banner is deliberately vague; the console keeps the real cause.
    console.error(`${context}:`, cause)

    errors.value = [...errors.value, { id: nextId++, message: `${context}. ${reason}`, detail }]
  }

  function dismiss(id: number): void {
    errors.value = errors.value.filter((e) => e.id !== id)
  }

  function clear(): void {
    errors.value = []
  }

  return { errors, report, dismiss, clear }
})
