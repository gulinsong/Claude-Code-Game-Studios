# ADR-007: Ball Physics -- Gravity Simulation with Speed Clamping

**Date**: 2026-04-10
**Status**: Accepted
**Context**: Sprint 1 Implementation

## Context

反弹达人 centers on a ball that falls under gravity, bounces off player-drawn lines and boundary walls, and collects light points. The ball's physics must feel satisfying and predictable while preventing edge cases like tunneling through colliders or reaching unrealistic velocities. ADR-001 selected Cocos Creator's built-in Box2D physics, but the ball's movement rules (gravity direction, speed limits, bounce reflection, phase state machine) need a dedicated logic layer that is testable independently of the physics engine.

The GDD (`design/gdd/ball-physics-system.md`) defines Euler integration for gravity, speed clamping to [50, 1500] px/s, reflection formula `v' = v - 2*dot(v,n)*n`, and a 5-phase state machine (IDLE, MOVING, PAUSED, OOB, COLLECTED). This ADR captures the architectural decision for the ball physics computation layer.

## Decision

Implement a **pure-math ball physics layer** using Euler integration for position/velocity updates, gravity applied as `velocity.y += gravity * deltaTime`, speed clamped to `[MIN_SPEED, MAX_SPEED]`, and a BallPhase state machine (IDLE, MOVING, PAUSED, OOB, COLLECTED) coordinating game phases. Reflection uses the standard formula `v' = v - 2*dot(v,n)*n` exposed as a static method for testability.

### Architecture

```
Game Loop (Engine Layer)
    |
    v
+------------------------------+
|  BallPhysicsSystem           |
|                              |
|  State Machine:              |
|  IDLE -> MOVING -> PAUSED    |
|               -> OOB         |
|               -> COLLECTED   |
|                              |
|  Euler Integration:          |        Callbacks
|  velocity.y += g * dt        +----------> Visual Feedback System
|  position += velocity * dt   |           (onBallBounce)
|                              +----------> Audio System
|  Speed Clamping:             |           (onBallBounce sound)
|  [MIN_SPEED, MAX_SPEED]      |
|                              +----------> Game State Management
|  Static Reflection:          |           (onPhaseChanged)
|  computeReflection(v, n)     |
+------------------------------+
         ^
         |
    BALL_PHYSICS_CONFIG
```

### Key Interfaces

```typescript
enum BallPhase {
  IDLE = 'IDLE',
  MOVING = 'MOVING',
  PAUSED = 'PAUSED',
  OOB = 'OOB',
  COLLECTED = 'COLLECTED',
}

// Static utility -- fully testable without instantiation
static computeReflection(velocity: Vec2, normal: Vec2): Vec2;

// Core methods
launch(position: Vec2, angle: number): void;
update(deltaTime: number): void;          // Euler step (MOVING only)
pause(): void;
resume(): void;
setOutOfBounds(): void;
setCollected(): void;
reset(spawnPosition: Vec2): void;
getState(): { phase: BallPhase; position: Vec2; velocity: Vec2; speed: number };
```

### Implementation Guidelines

1. **Euler integration**: In `update(deltaTime)`, when phase is MOVING:
   - `velocity.y += GRAVITY * deltaTime` (980 px/s^2, configurable)
   - `position += velocity * deltaTime`
   - Clamp speed: `speed = clamp(magnitude(velocity), MIN_SPEED, MAX_SPEED)`
   - If clamped, normalize and rescale velocity vector
2. **Speed clamping prevents tunneling and stalling**: `MAX_BALL_SPEED` (1500 px/s) prevents the ball from moving faster than the physics engine's CCD can detect. `MIN_BALL_SPEED` (50 px/s) prevents the ball from appearing frozen. Both are from `BALL_PHYSICS_CONFIG`.
3. **Reflection formula**: `reflectedVelocity = incidentVelocity - 2 * dot(incidentVelocity, normal) * normal`. This is a pure static method that can be unit-tested with known input/output vectors. The engine layer calls this on collision callbacks and feeds the result back to the physics body.
4. **State machine coordination**: Phase transitions gate which operations are valid. `update()` only processes physics when MOVING. `pause()` stores velocity, `resume()` restores it. `setOutOfBounds()` disables further physics updates.
5. **Launch mechanics**: `launch(position, angle)` sets position, computes initial velocity from `BALL_INITIAL_SPEED * cos/sin(angle)`, and transitions IDLE -> MOVING. Default angle is -90 degrees (downward).

## Rationale

1. **Pure math, no physics engine dependency**: The ball physics system imports no Cocos Creator or Box2D modules. Euler integration, speed clamping, and reflection are pure mathematical operations. This makes the entire physics logic unit-testable in Node.js without mocking physics engines.
2. **Speed clamping prevents tunneling**: Without clamping, gravity can accumulate unrealistic velocities over long falls. `MAX_BALL_SPEED` (1500 px/s) keeps the ball within Box2D's CCD detection range. `MIN_BALL_SPEED` (50 px/s) ensures the ball never appears to freeze mid-air.
3. **State machine enables clean game phase coordination**: The BallPhase enum maps directly to the GDD's state diagram. Each phase gates which operations are valid, preventing illegal transitions (e.g., launching while already MOVING). This makes game flow bugs immediately visible in state assertions.
4. **Static computeReflection for testability**: Bounce reflection is the most critical physics calculation. Making it a static method means tests can verify `computeReflection(velocity, normal)` produces the correct reflected vector without instantiating the entire system. Example: `(1, -1)` reflecting off normal `(0, 1)` should yield `(1, 1)`.
5. **Config-driven via BALL_PHYSICS_CONFIG**: `GRAVITY` (980), `BALL_INITIAL_SPEED` (300), `MAX_BALL_SPEED` (1500), `MIN_BALL_SPEED` (50), `BALL_RADIUS` (15) are all externalized per the GDD tuning knobs.

## Consequences

- **Positive**: Fully unit-testable physics logic without engine mocking. Speed clamping prevents tunneling and unrealistic velocities. State machine makes game phase flow explicit and debuggable. Static reflection method allows direct vector math testing. Euler integration is simple, deterministic, and fast (no iterative solver).
- **Negative**: Euler integration has known energy drift over long simulations -- the ball may gradually gain or lose energy. For a casual mobile game with short levels (< 30 seconds), this drift is negligible. The reflection formula does not account for restitution in the static method; the engine layer must apply restitution scaling separately. Speed clamping changes the ball's velocity direction if only magnitude is clamped without preserving direction (must normalize then rescale).

## Related

- GDD: `design/gdd/ball-physics-system.md` (states, formulas, edge cases, tuning knobs)
- GDD: `design/gdd/collision-system.md` (provides collision normals and callbacks)
- GDD: `design/gdd/boundary-system.md` (boundary walls reflect, bottom sensor triggers OOB)
- GDD: `design/gdd/out-of-bounds-system.md` (triggers OOB phase transition)
- Source: `src/gameplay/BallPhysicsSystem.ts`
- ADR-001: Physics Engine Selection (Box2D selected for collision detection)
