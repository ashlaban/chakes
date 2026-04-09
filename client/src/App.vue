<script setup lang="ts">
import ChessBoard from './components/ChessBoard.vue'
import type { ChakesState } from './models'

const state: ChakesState = []
</script>

<template>
  <main>
    <ChessBoard :state="state" />
  </main>
</template>

<style scoped>
main {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
