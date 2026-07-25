

# Package structure

This package lives in a monorepo, but is self-contained.
The following structure allows `import chakes.engine` from the backend.

```
chakes/
    backend/
    engine/
    frontend/
        ...
```

## Architecture

Vue 3 + TypeScript + Vite. State via Pinia, routing via vue-router.

```
src/
├── domain/        # Core vocabulary (Board, PieceInstance, Color, Cooldowns).
│                  # Depends on nothing; everything else may depend on it.
├── views/         # Route-level components. Own lifecycle (WS connect, store subscriptions).
├── stores/        # Pinia stores: session, catalog, lobby, game, errors.
├── services/      # Transport only — no state.
│                  #   api.ts         REST wrappers; throws ApiError
│                  #   gameSocket.ts  Typed WebSocket emitter + connection status
├── components/
│   ├── app/       # App shell (ErrorBanner). Rendered by App.vue.
│   ├── chess/     # Presentational primitives (ChakesBoard, ChakesSquare, PieceSprite, PromotionBar).
│   │              # Take props, emit events. No store imports.
│   └── lobby/     # Feature-coupled (LobbyBrowser, GameSetup). May read stores.
├── composables/   # useBoardOrientation, useKeyboardShortcuts.
└── assets/        # SVGs + pieceImages.ts lookup.
```

Data flow: WS message → `decodeServerMessage` → `gameSocket` emits typed event →
`useGameStore` updates state → views/components react.

Domain types live in `domain/`, not in `services/api.ts`, so that presentational
components never depend on the transport layer.

### Failures

Every server message carries a `type` tag and is dispatched on it; a message
whose kind is unknown is ignored rather than guessed at. Every REST call goes
through one helper that throws `ApiError` on a non-OK response, an unreachable
server or a malformed body — no call site sees an unchecked response.

Stores catch those errors and report them to `useErrorStore`, which `ErrorBanner`
renders. Connection loss is separate: `gameSocket` exposes a `SocketStatus` that
`LobbyView` surfaces. There is no automatic reconnect yet.

## Tests

```bash
npm test          # vitest, once
npm run test:watch
```

Unit tests sit next to the code as `*.spec.ts`. The coordinate conversions
(`useBoardOrientation`, `decodeServerMessage`) are the priority: the client uses
`[r, c]` with r=0 at rank 1, the wire uses `{x, y}`, and the display layer
flips both depending on player colour.

## Set up dev environment

Requires node 24. Install with e.g. `sudo snap install node --classic --channel 24` (ubuntu).
