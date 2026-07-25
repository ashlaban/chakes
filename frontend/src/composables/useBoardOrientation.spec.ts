import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useBoardOrientation } from './useBoardOrientation'
import type { Board, Cooldowns, Color, PieceInstance } from '../domain/types'

/** Board whose every square is uniquely identifiable by its own coordinates. */
function labelledBoard(rows: number, cols: number): Board {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c): PieceInstance => ({ name: `${r},${c}`, owner: 'white' })),
  )
}

function labelledCooldowns(rows: number, cols: number): Cooldowns {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => r * cols + c),
  )
}

function setup(rows: number, cols: number, color: Color) {
  const board = ref(labelledBoard(rows, cols))
  const cooldowns = ref(labelledCooldowns(rows, cols))
  return useBoardOrientation(board, cooldowns, ref(color))
}

describe('useBoardOrientation', () => {
  // Non-square on purpose: a square board hides any swap of rows and columns.
  const ROWS = 3
  const COLS = 5

  describe.each(['white', 'black'] as const)('as %s', (color) => {
    it('maps every displayed square back to the board square it shows', () => {
      const { displayBoard, displayToBoard } = setup(ROWS, COLS, color)

      for (let dr = 0; dr < ROWS; dr++) {
        for (let dc = 0; dc < COLS; dc++) {
          const [br, bc] = displayToBoard(dr, dc)
          // The piece drawn at (dr, dc) must be the one living at (br, bc).
          expect(displayBoard.value[dr][dc]?.name).toBe(`${br},${bc}`)
        }
      }
    })

    it('orients cooldowns the same way as the board', () => {
      const { displayCooldowns, displayToBoard } = setup(ROWS, COLS, color)

      for (let dr = 0; dr < ROWS; dr++) {
        for (let dc = 0; dc < COLS; dc++) {
          const [br, bc] = displayToBoard(dr, dc)
          expect(displayCooldowns.value[dr][dc]).toBe(br * COLS + bc)
        }
      }
    })

    it('covers every board square exactly once', () => {
      const { displayToBoard } = setup(ROWS, COLS, color)

      const seen = new Set<string>()
      for (let dr = 0; dr < ROWS; dr++) {
        for (let dc = 0; dc < COLS; dc++) seen.add(displayToBoard(dr, dc).join(','))
      }
      expect(seen.size).toBe(ROWS * COLS)
    })

    it('preserves the shape of the board', () => {
      const { displayBoard } = setup(ROWS, COLS, color)

      expect(displayBoard.value).toHaveLength(ROWS)
      expect(displayBoard.value[0]).toHaveLength(COLS)
    })
  })

  it('puts white\'s back rank at the bottom for white', () => {
    const { displayBoard } = setup(ROWS, COLS, 'white')

    // Board r=0 is white's back rank; white sees it on the last displayed row.
    expect(displayBoard.value[ROWS - 1][0]?.name).toBe('0,0')
  })

  it('puts white\'s back rank at the top for black, with mirrored files', () => {
    const { displayBoard } = setup(ROWS, COLS, 'black')

    expect(displayBoard.value[0][COLS - 1]?.name).toBe('0,0')
  })

  it('gives the two colours opposite views of the same square', () => {
    const white = setup(ROWS, COLS, 'white')
    const black = setup(ROWS, COLS, 'black')

    expect(white.displayToBoard(0, 0)).toEqual([ROWS - 1, 0])
    expect(black.displayToBoard(0, 0)).toEqual([0, COLS - 1])
  })

  it('survives an empty board without throwing', () => {
    const empty = ref<Board>([])
    const { displayBoard, displayToBoard } = useBoardOrientation(empty, ref([]), ref('black'))

    expect(displayBoard.value).toEqual([])
    expect(() => displayToBoard(0, 0)).not.toThrow()
  })
})
