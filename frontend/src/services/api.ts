import type { Board } from '../domain/types'

/**
 * A request that did not produce a usable response.
 *
 * `status` is 0 when the request never reached the server at all, which the UI
 * reports differently from a server that answered with a failure.
 */
export class ApiError extends Error {
  readonly status: number
  readonly method: string
  readonly url: string

  constructor(status: number, method: string, url: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.method = method
    this.url = url
  }

  /** Wording aimed at a player rather than at a log. */
  get userMessage(): string {
    if (this.status === 0) return 'Cannot reach the server.'
    if (this.status >= 500) return 'The server ran into a problem. Please try again.'
    if (this.status === 404) return 'That no longer exists on the server.'
    return 'The server rejected the request.'
  }
}

/**
 * Perform a request and parse its JSON body, failing loudly on any problem.
 *
 * Every call in this module goes through here: an unchecked `fetch` turns a
 * failed request into a plausible-looking value (`String(undefined)` yields the
 * string "undefined") that only surfaces much later, far from the cause.
 */
async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const method = init.method ?? 'GET'

  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    throw new ApiError(0, method, url, `Could not reach the server (${method} ${url})`)
  }

  if (!res.ok) {
    throw new ApiError(res.status, method, url, `${method} ${url} failed: ${res.status} ${res.statusText}`)
  }

  try {
    return (await res.json()) as T
  } catch {
    throw new ApiError(res.status, method, url, `${method} ${url} returned a malformed body`)
  }
}

function postJson(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export interface PieceDef {
  name: string
  default_cooldown: number
}

export interface GameType {
  id: string
  name: string
}

export async function createLobby(name?: string): Promise<string> {
  const url = name ? `/api/lobby?name=${encodeURIComponent(name)}` : '/api/lobby'
  const data = await request<{ lobby: string }>(url, { method: 'POST' })
  return String(data.lobby)
}

export async function getGameTypes(): Promise<GameType[]> {
  const data = await request<{ game_types: GameType[] }>('/api/game-types')
  return data.game_types
}

export async function getPieceDefs(gameType?: string): Promise<PieceDef[]> {
  const url = gameType ? `/api/piece-defs?game_type=${encodeURIComponent(gameType)}` : '/api/piece-defs'
  const data = await request<{ pieces: PieceDef[] }>(url)
  return data.pieces
}

export async function createGame(
  lobbyName: string,
  gameType?: string,
  cooldowns?: Record<string, number>,
  upsideDown?: boolean,
): Promise<string> {
  const data = await request<{ game_id: string }>(
    `/api/lobby/${lobbyName}/game`,
    postJson({ game_type: gameType ?? 'orthodox', cooldowns, upside_down: upsideDown ?? false }),
  )
  return String(data.game_id)
}

export interface PieceCooldown {
  name: string
  cooldown: number
}

export interface GameSettingsSummary {
  game_type_id: string
  game_type_label: string
  pieces: PieceCooldown[]
  upside_down: boolean
}

export interface LobbySummary {
  name: string
  server_name: string
  state: 'waiting' | 'in_progress' | 'ended'
  players: number
  spectators: number
  settings: GameSettingsSummary | null
}

export interface LobbyListResponse {
  server_name: string
  lobbies: LobbySummary[]
}

export async function listLobbies(): Promise<LobbyListResponse> {
  return await request<LobbyListResponse>('/api/lobby')
}

export interface InitialBoardResponse {
  board: Board
  size_x: number
  size_y: number
}

export async function getInitialBoard(gameType?: string): Promise<InitialBoardResponse> {
  const url = gameType ? `/api/initial-board?game_type=${encodeURIComponent(gameType)}` : '/api/initial-board'
  return await request<InitialBoardResponse>(url)
}
