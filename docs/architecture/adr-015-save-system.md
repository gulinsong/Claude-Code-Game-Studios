# ADR-015: Save System — Callback-Based Progress Persistence

**Date**: 2026-04-13
**Status**: Accepted
**Context**: Sprint 3 Implementation

## Context

反弹达人 needs to persist player progress across sessions: level completion state, star ratings, world unlock progress, and last played level. The save system must be pure TypeScript for testability and delegate actual storage (localStorage, WeChat wx.setStorageSync, cloud save) to the engine layer.

## Decision

Implement SaveSystem as a pure-logic state manager with callback-based persistence. The system owns all game progress state and emits save/load requests via `onPersist`/`onLoad` callbacks that the engine adapter wires to platform-specific storage.

### Architecture

```
SaveSystem (pure TS)
    ↕ onPersist / onLoad callbacks
Engine Adapter
    ↕ platform storage API
WeChat wx.setStorageSync / localStorage / Cloud
```

### Key Design

1. **Single SaveState object**: All progress in one `SaveState` with version field for migration.
2. **Level unlock chain**: Level N+1 requires Level N completed. First level of each world requires world unlocked.
3. **World unlock via cumulative stars**: Uses `STAR_CONFIG.WORLD_UNLOCK_THRESHOLDS [0, 7, 18, 33]`.
4. **Dirty flag**: Only emit persistence when state has changed.
5. **Best-star tracking**: `updateLevelResult` returns whether the score improved.

## Rationale

1. **Callback pattern matches project architecture**: Every other system (AudioSystem, InputSystem, etc.) uses the same callback pattern.
2. **Platform-agnostic**: Same logic works on WeChat (wx.setStorageSync), browser (localStorage), or test environment (in-memory).
3. **Level unlock chain is deterministic**: No need for explicit "unlocked" flags — unlock state is computed from completion data.

## Consequences

- **Positive**: 31 unit tests, zero engine dependencies, works on any platform.
- **Negative**: No conflict resolution for concurrent saves (not needed for single-player). Version migration not yet implemented.

## Related

- Source: `src/core/SaveSystem.ts`
- Config: `src/config/GameConfig.ts` (STAR_CONFIG.WORLD_UNLOCK_THRESHOLDS)
- GDD: `design/gdd/game-state-management.md`
