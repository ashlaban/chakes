from typing import Literal

from pydantic import BaseModel

from chakes.backend.models import ActiveGame
from chakes.engine.engine import Player

# Every outgoing message carries a `type` tag, mirroring the discriminated
# union used for incoming messages in models.py. Without it the client has to
# guess a message's kind from which fields happen to be present, which cannot
# distinguish "this field is absent" from "this field is falsy".


class LobbyJoinedMessage(BaseModel):
    type: Literal["lobby_joined"] = "lobby_joined"
    color: str


class GameStateMessage(BaseModel):
    type: Literal["game_state"] = "game_state"
    board: list[list[dict[str, str] | None]]
    cooldowns: list[list[float]]
    max_cooldowns: dict[str, float] | None = None
    piece_names: list[str] | None = None
    game_id: str
    winner: str | None = None  # excluded from wire when None (see ConnectionManager.broadcast)
    legal_moves: dict[str, list[list[int]]] = {}
    white_in_check: bool = False
    black_in_check: bool = False
    white_in_anti_check: bool = False
    black_in_anti_check: bool = False

    @classmethod
    def from_active_game(
        cls, game: ActiveGame, *, include_immutables: bool = True
    ) -> "GameStateMessage":
        all_moves, winner = game.snapshot()
        return cls(
            board=game.serialize_board(),
            cooldowns=game.serialize_cooldowns(),
            max_cooldowns=game.serialize_max_cooldowns() if include_immutables else None,
            piece_names=game.serialize_piece_names() if include_immutables else None,
            game_id=str(game.id),
            winner=("white" if winner.name == "WHITE" else "black") if winner else None,
            legal_moves=game.serialize_legal_moves(all_moves),
            white_in_check=game.state.is_in_check(Player.WHITE),
            black_in_check=game.state.is_in_check(Player.BLACK),
            white_in_anti_check=game.state.is_in_anti_check(Player.WHITE),
            black_in_anti_check=game.state.is_in_anti_check(Player.BLACK),
        )
