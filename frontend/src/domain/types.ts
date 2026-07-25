// Core game vocabulary, shared by the transport, store and component layers.
//
// These are domain concepts, not wire formats: they must not depend on how the
// server happens to serialise them. Request/response shapes live in
// `services/api.ts`, which imports from here rather than the other way around.

export type Color = 'white' | 'black'

/** A piece as rendered on a square. `pending` marks an optimistic placement. */
export type PieceInstance = { name: string; owner: Color; pending?: boolean }

/** Row-major board, indexed `[r][c]` with r=0 at rank 1 (white's back rank). */
export type Board = (PieceInstance | null)[][]

/** Remaining cooldown per square in seconds, indexed like `Board`. */
export type Cooldowns = number[][]
