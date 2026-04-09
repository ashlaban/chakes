<script setup lang="ts">
import type { ChakesState, ChakesPieceDef } from '../models'

const props = defineProps<{ state: ChakesState }>()

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const ranks = [8, 7, 6, 5, 4, 3, 2, 1]

const SYMBOLS: Record<ChakesPieceDef['color'], Record<ChakesPieceDef['kind'], string>> = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
}

function pieceAt(file: string, rank: number): string | null {
  const pos = `${file}${rank}`
  const piece = props.state.find(p => p.position === pos)
  return piece ? SYMBOLS[piece.def.color][piece.def.kind] : null
}

function isLight(file: string, rank: number): boolean {
  return (files.indexOf(file) + rank) % 2 === 1
}
</script>

<template>
  <div class="board">
    <div v-for="rank in ranks" :key="rank" class="rank">
      <div
        v-for="file in files"
        :key="file"
        class="square"
        :class="isLight(file, rank) ? 'light' : 'dark'"
      >
        <span v-if="pieceAt(file, rank)" class="piece">{{ pieceAt(file, rank) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.board {
  display: inline-flex;
  flex-direction: column;
  border: 2px solid #555;
}

.rank {
  display: flex;
}

.square {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.light { background: #f0d9b5; }
.dark  { background: #b58863; }

.piece {
  font-size: 40px;
  line-height: 1;
  user-select: none;
}
</style>
