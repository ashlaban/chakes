import type { Board, Cooldowns, Color } from '../domain/types'

export interface GameSocketEvents {
  board: Board
  cooldowns: Cooldowns
  maxCooldowns: Record<string, number>
  pieceNames: string[]
  color: Color
  gameId: string
  winner: Color | null
  pong: { id: string }
  legalMoves: Record<string, Set<string>>
  moveResult: { ok: boolean; error?: string; client_move_id?: string | null }
  inCheck: { white: boolean; black: boolean }
  inAntiCheck: { white: boolean; black: boolean }
}

type Listener<E extends keyof GameSocketEvents> = (payload: GameSocketEvents[E]) => void

/** One decoded event, with its payload correlated to the event name. */
export type DecodedEvent = {
  [E in keyof GameSocketEvents]: { event: E; payload: GameSocketEvents[E] }
}[keyof GameSocketEvents]

/**
 * Translate one raw server message into the events it implies.
 *
 * Pure on purpose: this is where snake_case wire fields, the engine's (x, y)
 * coordinates and the client's [r, c] convention all meet, so it is the part
 * worth testing in isolation.
 *
 * The server has no discriminator on its state messages, so membership is
 * tested rather than truthiness wherever absent and falsy must differ (a
 * finished game sends `winner: null`; incremental updates omit the immutable
 * fields entirely).
 */
export function decodeServerMessage(data: Record<string, unknown>): DecodedEvent[] {
  if (data.type === 'pong') return [{ event: 'pong', payload: { id: data.id as string } }]
  if (data.type === 'move_result') {
    return [{
      event: 'moveResult',
      payload: {
        ok: data.ok as boolean,
        error: data.error as string | undefined,
        client_move_id: data.client_move_id as string | null | undefined,
      },
    }]
  }
  // Replies to an explicit legal-moves request. The client no longer asks for
  // these — legal moves arrive batched in the game state message below — but
  // the server can still send them, so they must not fall through to the
  // state-message decoding.
  if (data.type === 'legal_moves') return []

  const events: DecodedEvent[] = []
  if (data.board) events.push({ event: 'board', payload: data.board as Board })
  if (data.cooldowns) events.push({ event: 'cooldowns', payload: data.cooldowns as Cooldowns })
  if (data.max_cooldowns) {
    events.push({ event: 'maxCooldowns', payload: data.max_cooldowns as Record<string, number> })
  }
  if (data.piece_names) events.push({ event: 'pieceNames', payload: data.piece_names as string[] })
  if (data.color) events.push({ event: 'color', payload: data.color as Color })
  if (data.game_id) events.push({ event: 'gameId', payload: data.game_id as string })
  if ('winner' in data) {
    events.push({ event: 'winner', payload: (data.winner as Color | null) ?? null })
  }
  if ('white_in_check' in data || 'black_in_check' in data) {
    events.push({
      event: 'inCheck',
      payload: {
        white: (data.white_in_check as boolean | undefined) ?? false,
        black: (data.black_in_check as boolean | undefined) ?? false,
      },
    })
  }
  if ('white_in_anti_check' in data || 'black_in_anti_check' in data) {
    events.push({
      event: 'inAntiCheck',
      payload: {
        white: (data.white_in_anti_check as boolean | undefined) ?? false,
        black: (data.black_in_anti_check as boolean | undefined) ?? false,
      },
    })
  }
  if (data.legal_moves) {
    events.push({ event: 'legalMoves', payload: decodeLegalMoves(data.legal_moves as WireLegalMoves) })
  }
  return events
}

type WireLegalMoves = Record<string, [number, number][]>

/** Transpose the server's "x,y" keys and [x, y] destinations into "r,c" form. */
function decodeLegalMoves(wire: WireLegalMoves): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {}
  for (const [key, dests] of Object.entries(wire)) {
    const [sx, sy] = key.split(',').map(Number)
    out[`${sy},${sx}`] = new Set(dests.map(([dx, dy]) => `${dy},${dx}`))
  }
  return out
}

export class GameSocket {
  private ws: WebSocket | null = null
  private listeners: { [E in keyof GameSocketEvents]?: Set<Listener<E>> } = {}

  connect(lobbyName: string, token: string): void {
    this.disconnect()
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    this.ws = new WebSocket(
      `${protocol}//${location.host}/api/lobby/${lobbyName}/ws?token=${token}`,
    )
    this.ws.onmessage = (e) => this.handleMessage(e)
  }

  disconnect(): void {
    this.ws?.close()
    this.ws = null
  }

  send(msg: object): void {
    this.ws?.send(JSON.stringify(msg))
  }

  on<E extends keyof GameSocketEvents>(event: E, listener: Listener<E>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set() as never
    }
    const set = this.listeners[event] as Set<Listener<E>>
    set.add(listener)
    return () => set.delete(listener)
  }

  private emit(decoded: DecodedEvent): void {
    // The payload type is correlated with the event name by DecodedEvent, but
    // TypeScript cannot carry that correlation through the listener set, so the
    // erasure to `unknown` happens here and nowhere else.
    const set = this.listeners[decoded.event] as Set<(payload: unknown) => void> | undefined
    set?.forEach((l) => l(decoded.payload))
  }

  private handleMessage(e: MessageEvent): void {
    if (!e.data) return
    for (const decoded of decodeServerMessage(JSON.parse(e.data))) {
      this.emit(decoded)
    }
  }
}

export const gameSocket = new GameSocket()
