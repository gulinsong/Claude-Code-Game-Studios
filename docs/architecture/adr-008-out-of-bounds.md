# ADR-008: Out-of-Bounds Detection -- Single-Fire State Machine

**Date**: 2026-04-10
**Status**: Accepted
**Context**: Sprint 1 Implementation

## Context

反弹达人 needs a reliable mechanism to detect when the ball falls below the bottom boundary and trigger game failure exactly once per level attempt. Duplicate failure triggers would cause cascading bugs (multiple defeat screens, double sound plays, corrupted game state). The detection must be instantaneous (same frame as the physics sensor contact), but the ball should continue falling visually before being destroyed, creating a natural "sinking off screen" effect.

The GDD (`design/gdd/out-of-bounds-system.md`) defines a three-state model (ARMED, TRIGGERED, SPENT) with a `hasTriggered` flag ensuring single-fire behavior, and a `BALL_DESTROY_MARGIN` (100px) below the screen where the ball node is destroyed after falling out of view. This ADR captures the architectural decision for the single-fire detection system.

## Decision

Implement a **three-state OutOfBoundsState machine (ARMED, TRIGGERED, SPENT)** that fires exactly once per level. ARMED is the initial state on level load. Transition to TRIGGERED occurs when the ball crosses the bottom boundary sensor; this transition fires the failure callback, disables the ball's collider, and allows the ball to continue falling under gravity. Transition to SPENT occurs when the ball falls beyond `SCREEN_DESTROY_Y` (100px below screen bottom), at which point the ball node is destroyed. Reset on new level returns to ARMED.

### Architecture

```
Collision System (bottom sensor onBeginContact)
    |
    v
+----------------------------------+
|  OutOfBoundsDetectionSystem      |
|                                  |
|  State: ARMED -> TRIGGERED -> SPENT
|                                  |
|  ARMED:    hasTriggered = false  |     Callbacks
|            listening for contact +-----------------> Game State Management
|                                  |                   (onBallOutOfBounds -> DEFEAT)
|  TRIGGERED: hasTriggered = true  |
|             collider disabled    +-----------------> Ball Physics System
|             ball continues fall  |                   (disable collider)
|                                  |
|  SPENT:    ball node destroyed   +-----------------> Visual Feedback System
|            no further events     |                   (playLoseEffect, indirect)
+----------------------------------+
         ^
         |
    BOUNDARY_CONFIG
    (BALL_DESTROY_MARGIN = 100px)
```

### Key Interfaces

```typescript
enum OutOfBoundsState {
  ARMED = 'ARMED',
  TRIGGERED = 'TRIGGERED',
  SPENT = 'SPENT',
}

interface OutOfBoundsCallbacks {
  onBallOutOfBounds(): void;         // fires exactly once -> game state management
  onBallDestroy(): void;             // fires when ball node is destroyed
}

// Core methods
onBallOutOfBounds(): void;           // called by collision system (bottom sensor)
update(ballPosition: Vec2): void;    // checks destroy condition (TRIGGERED only)
onLevelReset(): void;                // ARMED: reset for retry
getState(): OutOfBoundsState;
```

### Implementation Guidelines

1. **Single-fire via state check**: `onBallOutOfBounds()` checks `if (state !== ARMED) return;` before processing. This guarantees exactly one trigger per level regardless of how many times the collision system fires the callback.
2. **ARMED -> TRIGGERED transition**: Set `hasTriggered = true`, change state to TRIGGERED, call `onBallOutOfBounds()` callback (which notifies game state management to enter DEFEAT phase), and disable the ball's collider (preventing further collision events).
3. **TRIGGERED -> SPENT transition**: In `update(ballPosition)`, when state is TRIGGERED, check `if (ballPosition.y < SCREEN_DESTROY_Y)`. `SCREEN_DESTROY_Y = -BALL_DESTROY_MARGIN` (100px below screen bottom in Cocos Creator coordinates where Y=0 is screen bottom). On transition, destroy the ball node and call `onBallDestroy()`.
4. **Reset**: `onLevelReset()` sets state back to ARMED, `hasTriggered = false`, and expects the caller to recreate the ball node. Reset is idempotent -- calling it multiple times is safe.
5. **Config-driven via BOUNDARY_CONFIG**: `BALL_DESTROY_MARGIN` (100px) is externalized. This value determines how far below the screen the ball falls before node destruction.

## Rationale

1. **Single-fire behavior prevents duplicate failure triggers**: Without the state guard, Box2D's `onBeginContact` could fire multiple times in a single physics step for the same contact pair. The ARMED -> TRIGGERED transition is atomic and irreversible within a level, making duplicate triggers impossible.
2. **Three-state machine is clear and debuggable**: Each state maps to a distinct game phase. ARMED = "waiting for failure", TRIGGERED = "failure happened, ball is falling", SPENT = "cleanup done". The state can be logged or displayed in debug overlays for instant diagnosis.
3. **Destroy margin allows visual destruction delay**: The 100px margin (`BALL_DESTROY_MARGIN`) means the ball continues falling visibly for approximately 0.1-0.3 seconds after triggering (depending on velocity), creating a natural "sinking off screen" effect. The GDD specifies this avoids the jarring visual of the ball popping out of existence.
4. **Config-driven**: `BALL_DESTROY_MARGIN` is the only tunable parameter and is externalized in `BOUNDARY_CONFIG`. It should be larger than any UI elements below the screen to prevent visual clipping.
5. **Reset on new level**: The `onLevelReset()` method is the sole mechanism to return to ARMED. This makes the lifecycle explicit: ARMED on load, TRIGGERED on failure, SPENT after cleanup, ARMED again on retry.

## Consequences

- **Positive**: Guaranteed single-fire failure trigger prevents cascading bugs from duplicate callbacks. Three-state model is easy to reason about and debug. Ball destruction margin creates a polished visual transition. Reset is clean and idempotent. Minimal performance impact (one state check per frame when TRIGGERED).
- **Negative**: If the ball's Y position is never updated after triggering (e.g., physics paused), the TRIGGERED -> SPENT transition will never occur, leaving the ball node alive indefinitely. The system depends on the collision system correctly routing bottom sensor contacts -- if the sensor is misconfigured, the ball will fall through undetected. The destroy margin assumes Y=0 is the screen bottom; a coordinate system mismatch would cause premature or delayed destruction.

## Related

- GDD: `design/gdd/out-of-bounds-system.md` (states, formulas, edge cases, tuning knobs)
- GDD: `design/gdd/boundary-system.md` (provides bottom sensor position)
- GDD: `design/gdd/collision-system.md` (fires bottom sensor onBeginContact)
- GDD: `design/gdd/ball-physics-system.md` (OOB phase transition, collider disable)
- GDD: `design/gdd/game-state-management.md` (DEFEAT phase handling)
- Source: `src/core/OutOfBoundsDetectionSystem.ts`
- ADR-001: Physics Engine Selection (bottom boundary uses Box2D sensor)
