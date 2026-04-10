# ADR-013: Game Configuration -- Centralized Data-Driven Constants

**Date**: 2026-04-10
**Status**: Accepted
**Context**: Sprint 1 Implementation

## Context

The project coding standards require all gameplay values to be data-driven, never hardcoded. During Sprint 1, multiple systems were implemented (ball physics, line bounce, light point collection, collision, boundaries, audio, star rating, scene management, input, visual feedback) and each needed configurable parameters. Without a central configuration file, values like ball speed, line thickness, and collection tolerance would be scattered across system files, making tuning difficult and creating risk of calculation drift when multiple systems reference the same base value.

## Decision

Implement a single `GameConfig.ts` file exporting typed configuration objects. Each system domain has its own config section:

| Export | Domain | Key Values |
|--------|--------|------------|
| `BALL_CONFIG` | Ball physics | radius, speed, gravity, restitution, friction, density |
| `LINE_CONFIG` | Line system | thickness, padding, restitution, friction, min length, max lines |
| `LIGHT_POINT_CONFIG` | Light points | radius, tolerance, anim durations, glow/pulse parameters |
| `COLLISION_CONFIG` | Collision | categories (bitflags), CCD threshold, padding |
| `BOUNDARY_CONFIG` | Boundaries | restitution, friction, padding, destroy margin, safe areas |
| `AUDIO_CONFIG` | Audio | master/sfx/bgm volumes, concurrent sound limit |
| `STAR_CONFIG` | Star rating | threshold ratios, world unlock thresholds |
| `SCENE_CONFIG` | Scene management | fade durations, preload delay |
| `INPUT_CONFIG` | Input | min line length, preview opacity |
| `VISUAL_CONFIG` | Visual feedback | max particles, pool size |

All config objects use TypeScript `as const` assertions for literal type inference.

Derived values are computed from base configs and exported as standalone constants:

- `COLLECTION_RADIUS = LIGHT_POINT_CONFIG.VISUAL_RADIUS + BALL_CONFIG.COLLIDER_RADIUS + LIGHT_POINT_CONFIG.COLLECTION_TOLERANCE` (32 px)
- `LINE_COLLIDER_THICKNESS = LINE_CONFIG.VISUAL_THICKNESS * LINE_CONFIG.COLLIDER_PADDING` (6 px)
- `TRANSITION_DURATION = SCENE_CONFIG.TRANSITION_FADE_OUT + SCENE_CONFIG.TRANSITION_FADE_IN` (0.3 s)

## Rationale

1. **Single source of truth eliminates magic numbers**: Every gameplay-critical value lives in one file. Searching for a value means searching one file, not grep across the entire codebase.
2. **`as const` enables TypeScript literal type inference**: The compiler treats config values as literal types, enabling type-safe narrowing in conditional logic and preventing accidental mutation of config objects.
3. **Derived values prevent calculation drift**: `COLLECTION_RADIUS` is computed from `LIGHT_POINT_CONFIG`, `BALL_CONFIG`, and `COLLECTION_TOLERANCE`. If any base value changes, the derived value updates automatically. Without this, three separate systems could independently compute "collection radius" and diverge.
4. **Config sections map 1:1 to GDD documents**: Each config section corresponds to a specific GDD. This makes it easy to trace a value back to its design rationale and validation criteria.
5. **Easy to modify for balancing without touching system code**: A designer can adjust `STAR_CONFIG.THRESHOLD_ONE_RATIO` from 0.4 to 0.5 without understanding or risking changes to the star rating calculation code.

## Consequences

- **Positive**: Zero magic numbers in gameplay code; derived values stay synchronized automatically; `as const` prevents accidental mutation; config sections are self-documenting with inline comments; adding a new system means adding a new config section following the established pattern; easy to split into per-level overrides later.
- **Negative**: Single file means all systems import from the same module, creating a de facto dependency hub -- changes to any config value trigger recompilation of all importing files; the file does not support runtime hot-reload (values are compile-time constants); no per-level override mechanism exists yet -- `LINE_CONFIG.MAX_LINES_PER_LEVEL` is a default that must be passed explicitly via constructor; config sections are flat objects with no nesting, which could become unwieldy as the game grows beyond 10 domains.

## Related

- GDD: All GDD documents in `design/gdd/`
- Source: `src/config/GameConfig.ts`
- ADR-010: Line Bounce System (consumes LINE_CONFIG)
- ADR-011: Light Point Collection (consumes LIGHT_POINT_CONFIG, BALL_CONFIG, COLLECTION_RADIUS)
- ADR-012: Star Rating (consumes STAR_CONFIG)
