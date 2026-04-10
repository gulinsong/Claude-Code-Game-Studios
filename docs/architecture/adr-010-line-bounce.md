# ADR-010: Line Bounce System -- Quota-Managed Player Lines

**Date**: 2026-04-10
**Status**: Accepted
**Context**: Sprint 1 Implementation

## Context

Players draw lines that act as bounce surfaces for the ball. The system must manage the full lifecycle of each line -- creation from player input, registration with the collision system, state transitions when the ball makes contact, and removal via undo. A quota system is needed to limit how many lines a player can place per level, adding strategic depth to the core draw-and-bounce loop. Without a clear state machine, invalid operations (undoing a line the ball is actively bouncing off) could cause physics or visual glitches.

## Decision

Implement line creation with quota tracking, defaulting to 3 lines per level from `LINE_CONFIG.MAX_LINES_PER_LEVEL`. Each line follows a `LineState` enum lifecycle:

- **ACTIVE**: Line is created and placed. Can be undone by the player.
- **LOCKED**: Ball has hit the line. Cannot be undone. Continues participating in collision.
- **REMOVED**: Line has been deleted (via undo or level reset). Quota slot is freed.

The system exposes callback properties for cross-system integration:

- `onRegisterLine` / `onUnregisterLine` -- collision system registration
- `onShowConfirmedLine` / `onHideLine` -- visual feedback
- `onBounceEffect` -- bounce particle effect at contact point
- `onPlaySound` -- audio cues for place, undo, and bounce
- `onLineCountChanged` -- UI quota display update

`onBallHitLine(position, normal, lineId)` locks the line on first hit (idempotent for subsequent hits) and triggers bounce visual/audio feedback. `reset(maxLines?)` clears all lines and accepts an optional per-level override of the maximum line count.

## Rationale

1. **Clean state machine prevents invalid operations**: The `ACTIVE -> LOCKED -> REMOVED` progression ensures no line can be removed while the ball is interacting with it, preventing physics anomalies and visual glitches.
2. **Quota system adds strategic depth**: Limiting lines to 3 (configurable) forces the player to think carefully about placement, which is the core strategic tension of the game.
3. **LOCKED state prevents undoing lines in active use**: Once the ball has bounced off a line, it is committed. This prevents the player from gaming the system by repositioning lines mid-bounce.
4. **Config-driven default**: The default max comes from `LINE_CONFIG`, but the `reset()` override allows per-level variation without changing the system code.
5. **Callback pattern decouples systems**: The line bounce system has no direct imports for collision, visual, or audio systems. Callbacks are assigned at integration time, keeping the system testable in isolation.

## Consequences

- **Positive**: Clear lifecycle management with no ambiguous states; quota enforcement is simple and configurable; callback pattern enables unit testing without engine dependencies; idempotent lock prevents duplicate state transitions.
- **Negative**: Callback properties are nullable and must be checked before each call, adding minor boilerplate; the system does not validate line geometry (overlap, length) -- that responsibility falls to the input system and collision system respectively; `reset()` does not notify the visual system for each removed line, so the caller must handle visual cleanup or rely on scene-level teardown.

## Related

- GDD: `design/gdd/line-bounce-system.md`
- Source: `src/gameplay/LineBounceSystem.ts`
- Config: `src/config/GameConfig.ts` (LINE_CONFIG)
- ADR-001: 2D Physics Engine Selection (Box2D for line collision)
