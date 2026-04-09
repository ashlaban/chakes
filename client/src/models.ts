export interface ChakesPieceDef {
  kind: 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king'
  color: 'white' | 'black'
}

export interface ChakesPiece {
  def: ChakesPieceDef
  position: string        // chess notation, e.g. "e4"
  lastMoveTimestamp: number | null
}

export type ChakesState = ChakesPiece[]
