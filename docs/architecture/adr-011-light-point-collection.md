# ADR-011: Light Point Collection -- Single-Fire Sensor-Based Collection

**Date**: 2026-04-10
**Status**: Accepted
**Context**: Sprint 1 Implementation

## Context

Light points are the primary collectible objects in each level. The system must manage their full lifecycle -- spawning with animation, idle display with pulsing glow, instant collection when the ball enters the trigger area, death animation, and cleanup on level reset or scene unload. Each light point must be collected exactly once to prevent double-scoring. Collection detection must feel generous (the ball does not need pixel-perfect overlap) but not trivially easy. The system must also prevent collection after the game has ended (VICTORY or DEFEAT phase).

## Decision

Implement `LightPointCollectionSystem` with a four-state lifecycle per light point:

- **SPAWNING**: Level loaded, spawn animation playing. Sensor not yet active.
- **IDLE**: Spawn complete, sensor active, gentle neon glow pulse.
- **COLLECTING**: Ball entered sensor area. Sensor disabled immediately. Expand-and-fade animation plays over 0.4 seconds.
- **DEAD**: Animation complete. Node deactivated. No collision, no render.

Points are registered as sensor triggers via the `onRegisterSensor(position, radius)` callback. Collection is single-fire -- the sensor is unregistered on the same frame the collection event is detected, and any callback for an already-collected point is ignored.

The collection radius is a derived constant:

```
COLLECTION_RADIUS = LIGHT_POINT_VISUAL_RADIUS + BALL_COLLIDER_RADIUS + COLLECTION_TOLERANCE
                   = 12 + 15 + 5 = 32 px
```

A `gameEnded` flag (set via `setGameEnded()`) prevents all collection processing after the game reaches VICTORY or DEFEAT phase. Level reset (`onLevelReset()`) restores all points to SPAWNING, re-registers sensors, and clears the `gameEnded` flag.

## Rationale

1. **Single-fire prevents double-scoring**: By unregistering the sensor on the first contact frame and rejecting callbacks for non-IDLE points, the system guarantees each light point contributes to the score exactly once.
2. **Sensor pattern decouples from collision system**: Light points register as sensors (not solid colliders), so they do not physically interact with the ball or with line segments. The collision system reports overlap; this system decides what it means.
3. **Derived COLLECTION_RADIUS ensures consistency**: The trigger radius is computed from the visual radius, ball collider radius, and a forgiveness tolerance. This keeps visual size, physics size, and collection feel in sync without manual coordination.
4. **State machine enables spawn/collect animations**: The SPAWNING state delays sensor activation until the spawn animation completes. The COLLECTING state allows a 0.4-second death animation before transitioning to DEAD.
5. **gameEnded guard prevents post-game collection**: After VICTORY or DEFEAT, no further collections are processed, preventing visual noise and score inflation during end-game transitions.

## Consequences

- **Positive**: Deterministic single-fire collection with no race conditions; state machine covers all transitions including invalid ones (blocked by state checks); sensor pattern means light points never interfere with ball physics; `gameEnded` guard is simple and effective; reset mechanism supports level restart without scene reload.
- **Negative**: The current implementation transitions COLLECTING to DEAD immediately rather than waiting for the 0.4-second animation -- the engine layer must track animation completion separately; multi-collection in the same physics step (ball overlapping two sensors) is handled by the collision system's callback ordering, but this system processes them independently without distance-based sorting as described in the GDD; the system trusts level data (positions) without validation, so off-screen light points will be placed but unreachable.

## Related

- GDD: `design/gdd/light-point-collection-system.md`
- Source: `src/gameplay/LightPointCollectionSystem.ts`
- Config: `src/config/GameConfig.ts` (LIGHT_POINT_CONFIG, BALL_CONFIG, COLLECTION_RADIUS)
- ADR-001: 2D Physics Engine Selection (sensors via Box2D)
