import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '../services/api'
import type { GameType } from '../services/api'

// Piece definitions are deliberately absent here: they vary per game type, and
// GameSetup fetches the set for the type currently selected.
export const useCatalogStore = defineStore('catalog', () => {
  const gameTypes = ref<GameType[]>([])
  const loaded = ref(false)

  async function load(): Promise<void> {
    if (loaded.value) return
    gameTypes.value = await api.getGameTypes()
    loaded.value = true
  }

  return { gameTypes, loaded, load }
})
