import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '../services/api'
import { useErrorStore } from './errors'
import type { LobbySummary } from '../services/api'

export const useLobbyStore = defineStore('lobby', () => {
  const currentName = ref<string | null>(null)
  const openLobbies = ref<LobbySummary[]>([])
  const serverName = ref<string | null>(null)

  /** The new lobby's name, or null if it could not be created. */
  async function create(desiredName?: string): Promise<string | null> {
    try {
      return await api.createLobby(desiredName)
    } catch (e) {
      useErrorStore().report(e, 'Could not create the lobby')
      return null
    }
  }

  async function refreshList(): Promise<void> {
    try {
      const data = await api.listLobbies()
      serverName.value = data.server_name
      openLobbies.value = data.lobbies
    } catch (e) {
      useErrorStore().report(e, 'Could not load the list of lobbies')
    }
  }

  function setCurrent(name: string | null): void {
    currentName.value = name
  }

  return { currentName, openLobbies, serverName, create, refreshList, setCurrent }
})
