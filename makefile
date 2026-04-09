SOURCE=chakes/

.PHONY: all
all: run-game-engine

.PHONY: run-server
run-server:
	uv run uvicorn chakes.server.app:app --reload

.PHONY: lint
lint:
	uv run ruff check $(SOURCE)
	uv run ruff format --check $(SOURCE)

.PHONY: format
format:
	uv run ruff format $(SOURCE)

.PHONY: type-check
type-check:
	uv run ty check $(SOURCE)

.PHONY: run-engine
run-game-engine: type-check
	uv run python -m chakes.engine.game_engine
