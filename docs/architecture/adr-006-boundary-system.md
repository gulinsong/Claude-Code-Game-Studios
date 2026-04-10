# ADR-006: Boundary System -- Screen-to-Playable-Area Computation

**Date**: 2026-04-10
**Status**: Accepted
**Context**: Sprint 1 Implementation

## Context

反弹达人 needs a well-defined playable area derived from the device's screen dimensions, accounting for safe area insets (notch, gesture bar) and configurable padding. Three boundaries (left, right, top) act as solid walls that reflect the ball; the bottom boundary is a sensor that triggers out-of-bounds detection when the ball passes through. The boundary system provides the coordinate space that every other gameplay system operates within -- line placement, ball physics, light point positioning, and level configuration all depend on accurate boundary computation.

The GDD (`design/gdd/boundary-system.md`) defines 4 boundary edges computed from screen dimensions, safe area values, and padding. It specifies that the system is stateless (compute once per scene lifecycle) and provides coordinate conversion for the level system's normalized coordinates. This ADR captures the architectural decision for the boundary computation engine.

## Decision

Compute **4 boundary edges (left, right, top, bottom) at scene initialization** from screen dimensions minus safe area insets and boundary padding. Expose a Vec2-based query API for other systems. Top, left, and right boundaries are solid walls (static rigid bodies); the bottom boundary is a sensor that passes collision events to the out-of-bounds detection system. Safe area values default from `BOUNDARY_CONFIG` when engine API values are invalid.

### Architecture

```
Scene Management (onSceneReady)
    |
    v
+------------------------+
|  BoundarySystem        |
|                        |
|  Computes:             |        Query API
|  leftBoundary          +--------------------> Collision System
|  rightBoundary         |                     (register boundary colliders)
|  topBoundary           |
|  bottomBoundary        +--------------------> Level System
|  playableWidth         |                     (normalized-to-pixel conversion)
|  playableHeight        |
+------------------------+---------> Out-of-Bounds Detection
         ^                             (bottom sensor callback)
         |
    BOUNDARY_CONFIG
    (padding, restitution, thickness,
     safe area defaults)
```

### Key Interfaces

```typescript
interface BoundaryEdges {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface PlayableArea {
  x: number;      // bottom-left X
  y: number;      // bottom-left Y
  width: number;  // playableWidth
  height: number; // playableHeight
}

// Core methods
initialize(screenWidth: number, screenHeight: number,
           safeAreaTop: number, safeAreaBottom: number): void;
getEdges(): BoundaryEdges;
getPlayableArea(): PlayableArea;
isInBounds(position: Vec2): boolean;
clampToArea(position: Vec2): Vec2;
destroy(): void;
```

### Implementation Guidelines

1. **Single initialization per scene**: Call `initialize()` once when the gameplay scene loads. Boundary values are immutable for the scene lifecycle. Call `destroy()` on scene unload to signal the collision system to unregister boundary colliders.
2. **Boundary formulas** (from GDD):
   - `leftBoundary = BOUNDARY_PADDING`
   - `rightBoundary = screenWidth - BOUNDARY_PADDING`
   - `topBoundary = screenHeight - BOUNDARY_PADDING - safeAreaTop`
   - `bottomBoundary = BOUNDARY_PADDING + safeAreaBottom`
   - `playableWidth = rightBoundary - leftBoundary`
   - `playableHeight = topBoundary - bottomBoundary`
3. **Safe area defaults**: If `safeAreaTop < 0` or `safeAreaTop > screenHeight * 0.15`, use `DEFAULT_SAFE_AREA_TOP` (44px). If `safeAreaBottom < 0` or `safeAreaBottom > screenHeight * 0.1`, use `DEFAULT_SAFE_AREA_BOTTOM` (34px). These thresholds catch obviously invalid values while allowing legitimate device-specific insets.
4. **Vec2-based query API**: `isInBounds(position)` and `clampToArea(position)` accept and return Vec2 objects, consistent with the project's coordinate conventions.
5. **Config-driven via BOUNDARY_CONFIG**: `BOUNDARY_PADDING` (20px), `BOUNDARY_RESTITUTION` (0.8), `BOUNDARY_THICKNESS` (10px), `DEFAULT_SAFE_AREA_TOP` (44px), `DEFAULT_SAFE_AREA_BOTTOM` (34px) are all externalized.

## Rationale

1. **Single initialization, immutable per scene**: Boundaries do not change during gameplay. Computing once at scene load avoids per-frame recalculation and ensures all systems see consistent boundary values throughout the level.
2. **Graceful degradation for safe area values**: WeChat Mini-Games run on diverse devices. Some may report incorrect safe area values. The default fallback (44px top, 34px bottom) covers the most common notch and gesture bar sizes, ensuring the game remains playable even with bad platform data.
3. **Vec2-based query API**: Other systems (collision, level, ball physics) all use Vec2 for positions. A consistent coordinate type avoids unnecessary conversions at API boundaries.
4. **Config-driven via BOUNDARY_CONFIG**: All boundary parameters are externalized per the GDD tuning knobs, enabling adjustment without code changes. `BOUNDARY_PADDING` affects the "crowdedness" feel across all levels.
5. **Separation of computation from physics**: The boundary system computes edge positions and provides them to the collision system for collider registration. This keeps the boundary system focused on spatial computation while the collision system owns the physics representation.

## Consequences

- **Positive**: Immutable boundary values guarantee consistency across all systems within a scene. Graceful degradation ensures playability on devices with bad safe area APIs. Vec2-based API is consistent with project conventions. Config-driven tuning allows feel adjustments without code changes. Stateless computation is trivially testable.
- **Negative**: Screen rotation or resize during gameplay is not supported -- the game would need a level restart to recalculate boundaries. Extreme aspect ratios (wider than 9:19.5) are not handled beyond default padding, potentially producing very narrow playable areas. The bottom sensor's position depends on this system's output, so any boundary computation bug cascades into out-of-bounds detection.

## Related

- GDD: `design/gdd/boundary-system.md` (formulas, edge cases, tuning knobs, boundary behavior matrix)
- GDD: `design/gdd/collision-system.md` (consumes registered boundary colliders)
- GDD: `design/gdd/out-of-bounds-system.md` (bottom sensor callback consumer)
- GDD: `design/gdd/level-system.md` (uses playable area for normalized-to-pixel conversion)
- Source: `src/core/BoundarySystem.ts`
- ADR-001: Physics Engine Selection (boundaries use Box2D static bodies and sensors)
