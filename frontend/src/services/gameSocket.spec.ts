import { describe, it, expect } from 'vitest'
import { decodeServerMessage, type DecodedEvent } from './gameSocket'

/** A game state message: the server always tags these. */
function gameState(fields: Record<string, unknown>): Record<string, unknown> {
  return { type: 'game_state', ...fields }
}

function eventNames(msg: Record<string, unknown>): string[] {
  return decodeServerMessage(msg).map((d) => d.event)
}

/**
 * The payload of the single named event, or a failure if it was not decoded.
 *
 * Returns `unknown` rather than the payload type correlated to `event`:
 * TypeScript cannot narrow that correlation through a generic, and assertions
 * do not need it.
 */
function payloadOf(msg: Record<string, unknown>, event: DecodedEvent['event']): unknown {
  const found = decodeServerMessage(msg).find((d) => d.event === event)
  if (!found) throw new Error(`no ${event} event was decoded`)
  return found.payload
}

function legalMovesOf(fields: Record<string, unknown>): Record<string, Set<string>> {
  return payloadOf(gameState(fields), 'legalMoves') as Record<string, Set<string>>
}

describe('decodeServerMessage', () => {
  describe('dispatch', () => {
    it('decodes a pong', () => {
      expect(decodeServerMessage({ type: 'pong', id: 'abc' })).toEqual([
        { event: 'pong', payload: { id: 'abc' } },
      ])
    })

    it('decodes an accepted move result', () => {
      expect(payloadOf({ type: 'move_result', ok: true, client_move_id: 'm1' }, 'moveResult'))
        .toEqual({ ok: true, error: undefined, client_move_id: 'm1' })
    })

    it('decodes a rejected move result with its reason', () => {
      expect(
        payloadOf(
          { type: 'move_result', ok: false, error: 'illegal_move', client_move_id: 'm2' },
          'moveResult',
        ),
      ).toEqual({ ok: false, error: 'illegal_move', client_move_id: 'm2' })
    })

    it('decodes the lobby join message as the player colour', () => {
      expect(decodeServerMessage({ type: 'lobby_joined', color: 'white' })).toEqual([
        { event: 'color', payload: 'white' },
      ])
    })

    it('ignores standalone legal-moves replies', () => {
      // The client batches legal moves via the game state message, but the
      // server still answers an explicit request.
      expect(decodeServerMessage({ type: 'legal_moves', pos: { x: 1, y: 2 }, moves: [[3, 4]] }))
        .toEqual([])
    })

    it('ignores a message kind it does not recognise', () => {
      // Forward compatibility: a newer server must not break an older client.
      expect(decodeServerMessage({ type: 'something_new', board: [[null]] })).toEqual([])
    })

    it('ignores an untagged message rather than guessing its kind', () => {
      expect(decodeServerMessage({ board: [[null]], color: 'white' })).toEqual([])
    })
  })

  describe('game state', () => {
    it('decodes the plain fields', () => {
      const board = [[null, { name: 'Rook', owner: 'white' }]]
      const msg = gameState({ board, cooldowns: [[0, 1.5]], game_id: 'g1' })

      expect(payloadOf(msg, 'board')).toBe(board)
      expect(payloadOf(msg, 'cooldowns')).toEqual([[0, 1.5]])
      expect(payloadOf(msg, 'gameId')).toBe('g1')
    })

    it('decodes the immutable fields when the server includes them', () => {
      const msg = gameState({ max_cooldowns: { Rook: 3 }, piece_names: ['Rook', 'Pawn'] })

      expect(payloadOf(msg, 'maxCooldowns')).toEqual({ Rook: 3 })
      expect(payloadOf(msg, 'pieceNames')).toEqual(['Rook', 'Pawn'])
    })

    it('omits the immutable fields on incremental updates', () => {
      // The server sends these as null when include_immutables is false.
      const names = eventNames(gameState({ board: [[null]], max_cooldowns: null, piece_names: null }))

      expect(names).not.toContain('maxCooldowns')
      expect(names).not.toContain('pieceNames')
    })

    it('does not report a colour: that belongs to the join message', () => {
      expect(eventNames(gameState({ board: [[null]], color: 'black' }))).not.toContain('color')
    })
  })

  describe('winner', () => {
    it('reports a decided game', () => {
      expect(payloadOf(gameState({ winner: 'white' }), 'winner')).toBe('white')
    })

    it('reports an explicit null as "no winner"', () => {
      // Absent and null must stay distinguishable, so this cannot be a
      // truthiness check.
      expect(payloadOf(gameState({ winner: null }), 'winner')).toBeNull()
    })

    it('stays silent when the field is absent', () => {
      expect(eventNames(gameState({ board: [[null]] }))).not.toContain('winner')
    })
  })

  describe('check flags', () => {
    it('decodes check and anti-check independently', () => {
      const msg = gameState({
        white_in_check: true,
        black_in_check: false,
        white_in_anti_check: false,
        black_in_anti_check: true,
      })

      expect(payloadOf(msg, 'inCheck')).toEqual({ white: true, black: false })
      expect(payloadOf(msg, 'inAntiCheck')).toEqual({ white: false, black: true })
    })

    it('defaults a missing side to false when the other side is present', () => {
      expect(payloadOf(gameState({ white_in_check: true }), 'inCheck'))
        .toEqual({ white: true, black: false })
    })

    it('stays silent when neither side is mentioned', () => {
      const names = eventNames(gameState({ board: [[null]] }))

      expect(names).not.toContain('inCheck')
      expect(names).not.toContain('inAntiCheck')
    })

    it('emits when both sides are explicitly false', () => {
      expect(payloadOf(gameState({ white_in_check: false, black_in_check: false }), 'inCheck'))
        .toEqual({ white: false, black: false })
    })
  })

  describe('legal moves', () => {
    it('transposes the wire\'s (x, y) into the client\'s (r, c)', () => {
      // Source key "1,2" is x=1, y=2 — that is board row 2, column 1.
      // Destination [3, 4] is x=3, y=4 — board row 4, column 3.
      const decoded = legalMovesOf({ legal_moves: { '1,2': [[3, 4]] } })

      expect(Object.keys(decoded)).toEqual(['2,1'])
      expect([...decoded['2,1']]).toEqual(['4,3'])
    })

    it('keeps every destination of a source square', () => {
      const decoded = legalMovesOf({ legal_moves: { '0,0': [[0, 1], [1, 0], [1, 1]] } })

      expect([...decoded['0,0']].sort()).toEqual(['0,1', '1,0', '1,1'])
    })

    it('handles several source squares', () => {
      const decoded = legalMovesOf({ legal_moves: { '0,1': [[0, 2]], '4,6': [[4, 7]] } })

      expect(Object.keys(decoded).sort()).toEqual(['1,0', '6,4'])
    })

    it('stays silent when no legal moves are sent', () => {
      expect(eventNames(gameState({ board: [[null]] }))).not.toContain('legalMoves')
    })
  })

  it('decodes a full state message into all of its events', () => {
    const names = eventNames(gameState({
      board: [[null]],
      cooldowns: [[0]],
      max_cooldowns: { Pawn: 3 },
      piece_names: ['Pawn'],
      game_id: 'g1',
      winner: null,
      legal_moves: { '0,0': [[0, 1]] },
      white_in_check: false,
      black_in_check: false,
      white_in_anti_check: false,
      black_in_anti_check: false,
    }))

    expect(names).toEqual([
      'board', 'cooldowns', 'maxCooldowns', 'pieceNames', 'gameId',
      'winner', 'inCheck', 'inAntiCheck', 'legalMoves',
    ])
  })
})
