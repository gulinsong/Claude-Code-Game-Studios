# ADR-009: Visual Feedback System -- Stateless Effect Dispatch

**Date**: 2026-04-10
**Status**: Accepted
**Context**: Sprint 1 Implementation

## Context

反弹达人 needs visual effects for 6 core game events: preview line during drawing, confirmed line on placement, bounce particles on collision, collection flash on light point pickup, win celebration, and lose screen darkening. Each effect has specific visual parameters (particles, colors, durations) defined in the GDD. The system must enforce a particle budget to prevent performance degradation, and it must not couple the logic layer to Cocos Creator's rendering or animation systems.

The GDD (`design/gdd/visual-feedback-system.md`) defines 6 visual effect types, a MAX_PARTICLES budget of 200, and specifies that the system is stateless (API-driven, no internal state). This ADR captures the architectural decision for the effect dispatch layer.

## Decision

Implement a **stateless effect dispatcher** with a `VisualEffectType` enum (PREVIEW_LINE, CONFIRMED_LINE, BOUNCE, COLLECT, WIN, LOSE) and particle budget tracking. The logic layer validates effect requests against the particle budget and dispatches them via callbacks to the engine layer, which handles actual rendering using Cocos Creator's particle system and tween animations.

### Architecture

```
Gameplay Events (input, collision, collection, phase change)
    |
    v
+----------------------------------+
|  VisualFeedbackSystem            |
|                                  |
|  Effect Types (6):               |        Callbacks
|  PREVIEW_LINE, CONFIRMED_LINE    +-----------> Engine Visual Adapter
|  BOUNCE, COLLECT                 |             (particle nodes, tween anims,
|  WIN, LOSE                       |              line node creation/deletion)
|                                  |
|  Budget Tracking:                |
|  activeParticles <= MAX_PARTICLES|
|  (200 max)                       |
+----------------------------------+
         ^
         |
    VISUAL_FEEDBACK_CONFIG
    (MAX_PARTICLES, particle counts,
     durations, colors)
```

### Key Interfaces

```typescript
enum VisualEffectType {
  PREVIEW_LINE = 'PREVIEW_LINE',
  CONFIRMED_LINE = 'CONFIRMED_LINE',
  BOUNCE = 'BOUNCE',
  COLLECT = 'COLLECT',
  WIN = 'WIN',
  LOSE = 'LOSE',
}

interface EffectRequest {
  type: VisualEffectType;
  position?: Vec2;        // required for BOUNCE, COLLECT
  start?: Vec2;           // required for PREVIEW_LINE, CONFIRMED_LINE
  end?: Vec2;             // required for PREVIEW_LINE, CONFIRMED_LINE
  intensityMultiplier?: number;  // default 1.0
}

interface VisualFeedbackCallbacks {
  onPlayEffect(request: EffectRequest): void;
  onHideEffect(type: VisualEffectType): void;
  onClearAllEffects(): void;
}

// Core methods
requestEffect(request: EffectRequest): void;
hideEffect(type: VisualEffectType): void;
clearAllEffects(): void;
getActiveParticleCount(): number;
```

### Implementation Guidelines

1. **Stateless dispatch**: The system has no internal animation state. It receives effect requests, validates them against the particle budget, and immediately dispatches to the engine layer via callbacks. All animation state lives in the engine adapter.
2. **Particle budget tracking**: Track `activeParticles` count. Before dispatching a particle-emitting effect (BOUNCE, COLLECT, WIN), check `if (activeParticles + requestParticles > MAX_PARTICLES)`. If over budget, either reduce the particle count for the new effect or skip it. Budget is released when the engine adapter reports particles have expired.
3. **Effect-to-visual mapping**: Each `VisualEffectType` maps to specific visual parameters from `VISUAL_FEEDBACK_CONFIG`:
   - PREVIEW_LINE: semi-transparent blue dashed line (0 particles)
   - CONFIRMED_LINE: solid blue line with white glow edge (0 particles)
   - BOUNCE: orange-yellow dots expanding outward (8-15 particles, 0.3s)
   - COLLECT: white flash + blue scale animation (10-20 particles, 0.4s)
   - WIN: colorful stars/confetti falling (30-50 particles, 1.5s)
   - LOSE: screen darken 50% + light shake (0 particles, 0.5s)
4. **Non-particle effects bypass budget**: PREVIEW_LINE, CONFIRMED_LINE, and LOSE produce no particles, so they always dispatch regardless of active particle count.
5. **Clear on scene switch**: `clearAllEffects()` is called by scene management when transitioning. The engine adapter must remove all active particle nodes and cancel all running tweens.
6. **Config-driven via VISUAL_FEEDBACK_CONFIG**: `MAX_PARTICLES` (200), `BASE_PARTICLE_COUNT` (10), `PARTICLE_LIFETIME` (0.5s), `ANIMATION_DURATION` (0.3s), `PREVIEW_LINE_OPACITY` (0.5), and the color palette are all externalized.

## Rationale

1. **Pure logic, no engine dependencies**: The visual feedback system imports no Cocos Creator modules. Budget tracking, type validation, and dispatch are pure logic. The engine adapter handles `ParticleSystem2D`, `Tween`, and `Graphics` node manipulation.
2. **Budget tracking prevents visual overload**: Without a budget, rapid bounce chains could spawn hundreds of particles, causing frame drops on low-end WeChat Mini-Game devices. The 200-particle cap is the GDD's specified budget, sufficient for 6-10 concurrent effects.
3. **Callback pattern is consistent with other systems**: Input, Audio, and Visual Feedback all use the same callback-based dispatch pattern. This uniformity reduces cognitive overhead when working across Foundation-layer systems.
4. **Each effect type maps to a GDD-specified visual**: The enum-to-visual mapping is 1:1 with the GDD's Visual Requirements table. This traceability ensures no visual is missing and no orphan effects exist.
5. **Stateless design simplifies testing**: With no internal animation state, the system's test surface is small: verify budget tracking, verify correct callback invocation for each effect type, verify budget enforcement.

## Consequences

- **Positive**: Fully unit-testable budget logic and effect dispatch. No engine coupling in the logic layer. Consistent callback pattern with Input and Audio systems. Budget enforcement prevents performance degradation. Clear 1:1 mapping between effect types and GDD-specified visuals. Stateless design has minimal memory footprint.
- **Negative**: Particle budget release depends on the engine adapter reporting particle expiry, creating a two-way dependency (the logic layer must provide a `releaseBudget(count)` method the engine adapter calls back). If the engine adapter fails to report expiry, the budget will permanently decrease, eventually blocking all particle effects. The stateless design means the logic layer cannot cancel or modify a running effect -- that control belongs entirely to the engine adapter.

## Related

- GDD: `design/gdd/visual-feedback-system.md` (effect types, visual requirements, tuning knobs)
- GDD: `design/gdd/input-system.md` (triggers PREVIEW_LINE, CONFIRMED_LINE)
- GDD: `design/gdd/line-bounce-system.md` (triggers BOUNCE effect)
- GDD: `design/gdd/light-point-collection-system.md` (triggers COLLECT effect)
- GDD: `design/gdd/star-rating-system.md` (triggers WIN effect)
- GDD: `design/gdd/out-of-bounds-system.md` (triggers LOSE effect)
- Source: `src/foundation/VisualFeedbackSystem.ts`
