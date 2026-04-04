# Light Point Collection System

> **Status**: Approved
> **Author**: User + Claude
> **Last Updated**: 2026-04-04
> **Implements Pillar**: One-Ball Clear

## Overview

The Light Point Collection System manages the full lifecycle of every light point placed in a level -- from spawn through idle display, sensor-triggered collection, death animation, and cleanup. It registers each light point as a sensor trigger with the collision system, so the instant the ball overlaps a light point's trigger area, collection fires with no grace period and no second chance. On collection, the system updates the game state manager's collected count, requests the visual feedback system to play the collection animation (expand + fade out over 0.4 s), and requests the audio system to play the collection sound. When the game state manager reports that all light points have been collected, the level is won. Without this system the game has no objective, no victory condition, and no reason for the player to draw lines.

## Player Fantasy

The player should feel that collecting a light point is a **micro-reward** -- a small, crisp moment of satisfaction every time the ball passes through one. The neon glow circle pulses gently in its idle state, signaling "come get me." The moment the ball touches it, the light point expands outward and fades away in 0.4 seconds, accompanied by a bright particle burst and a clear chime. There is no ambiguity: if the ball gets close enough, the light point is yours.

The player should also feel **constant awareness of progress**. They can glance at the screen and instantly know how many light points remain. When the last one pops, the level is won -- clean, decisive, satisfying.

**Key experience goals**:
- **Collection satisfaction**: Every collection delivers an immediate, juicy visual + audio punch.
- **Progress visibility**: The player always knows how close they are to winning.
- **One-ball-clear challenge**: Using limited bounces to sweep every light point is the core strategic puzzle.

**Reference games**:
- **Cut the Rope**: The "star collected" micro-reward feeling.
- **Pinball**: Hitting a target and watching it light up and disappear.

## Detailed Design

### Core Rules

1. **Light point lifecycle stages**:

   | Stage | Entry Condition | Exit Condition | Duration | Behavior |
   |-------|----------------|----------------|----------|----------|
   | **Spawning** | Level loaded | Spawn animation complete | 0.3 s | Scale from 0 to 1 with elastic ease; sensor not yet active |
   | **Idle** | Spawn animation complete | Ball enters trigger area | Indefinite | Neon glow circle; gentle radius pulse; sensor active |
   | **Collecting** | Ball enters trigger area | Death animation complete | 0.4 s | Expand + fade out; sensor disabled immediately; count updated |
   | **Dead** | Death animation complete | Level reset or scene unload | Indefinite | Node deactivated or returned to pool; no collision, no render |

2. **Instant collection (no grace period)**:
   - The moment the physics engine reports `onBeginContact` between the ball and a light point sensor, collection fires.
   - There is no timer, no "hover for X seconds" requirement, and no way to "almost collect" a light point.
   - The sensor is disabled on the same frame the contact is detected, preventing duplicate triggers.

3. **Collection order**:
   - If the ball simultaneously overlaps multiple light point sensors in the same physics step, they are sorted by distance to the ball center (nearest first) and processed sequentially.
   - Each light point triggers an independent collection event and animation.

4. **Victory condition**:
   - The system does not own victory logic. After each collection it calls `gameState.onLightPointCollected(id)`.
   - Victory is triggered by the game state manager when `lightPointsCollected === lightPointsTotal`.
   - The last light point's collection animation plays to completion before (or concurrently with) the victory fanfare -- it is not interrupted.

5. **Level reset**:
   - When the level restarts or a new level loads, all light points return to **Spawning** stage.
   - Dead light points are reactivated, repositioned, and their sensors re-enabled.

6. **Light point placement**:
   - Light point positions are defined by level configuration data (`LightPointConfig[]`).
   - The system does not place light points procedurally; it reads positions from the level config.
   - Each light point has a unique string ID (`lightPoint_{index}`) generated at level load.

### Light Point Visual Specification

7. **Idle visual -- Neon Glow Circle**:

   | Property | Value | Description |
   |----------|-------|-------------|
   | Shape | Circle | Simple filled circle with soft edge |
   | Base color | `#FFE66D` (warm yellow) | Matches the accent color palette |
   | Glow color | `#FFFFFF` at 30 % opacity | White outer glow ring |
   | Base radius | `LIGHT_POINT_RADIUS = 12 px` | Core visual radius |
   | Glow radius | `baseRadius * 1.8 = 21.6 px` | Outer glow ring radius |
   | Pulse amplitude | `baseRadius * 0.15 = 1.8 px` | Glow ring breathes +/- 1.8 px |
   | Pulse frequency | `PULSE_PERIOD = 2.0 s` | One full sine cycle every 2 seconds |
   | Pulse easing | `sin(t)` | Smooth sinusoidal breathing |

   Idle pulse formula:
   ```
   glowRadius = LIGHT_POINT_RADIUS * 1.8 + sin(t * 2 * PI / PULSE_PERIOD) * LIGHT_POINT_RADIUS * 0.15
   ```

8. **Collection animation -- Expand + Fade Out (0.4 s)**:

   | Property | Value | Description |
   |----------|-------|-------------|
   | Total duration | `COLLECT_ANIM_DURATION = 0.4 s` | Fixed, not configurable per light point |
   | Scale curve | Expand from 1.0x to 2.0x over 0.4 s | Linear scale ramp |
   | Opacity curve | Fade from 1.0 to 0.0 over 0.4 s | Linear opacity ramp |
   | Color shift | Base yellow -> white during fade | Color lerps to white as opacity drops |
   | Easing | `easeOutCubic` | Fast start, slow finish for a "pop" feel |

   Animation formulas:
   ```
   progress = elapsed / COLLECT_ANIM_DURATION           // 0.0 -> 1.0
   easedProgress = 1 - (1 - progress)^3                  // easeOutCubic
   scale = 1.0 + easedProgress * COLLECT_SCALE_RANGE     // 1.0 -> 2.0
   opacity = 1.0 - easedProgress                         // 1.0 -> 0.0
   colorR = lerp(1.0, 1.0, easedProgress)                // #FF stays #FF
   colorG = lerp(0.9, 1.0, easedProgress)                // #E6 -> #FF
   colorB = lerp(0.43, 1.0, easedProgress)               // #6D -> #FF
   ```

   At the end of the animation the node is deactivated (or returned to the object pool).

9. **Spawn animation (0.3 s)**:

   | Property | Value |
   |----------|-------|
   | Duration | `SPAWN_ANIM_DURATION = 0.3 s` |
   | Scale | 0.0 -> 1.0, `easeOutBack` (overshoot then settle) |
   | Opacity | 0.0 -> 1.0, linear |

### Interaction with Other Systems

| System | Direction | Interface | Description |
|--------|-----------|-----------|-------------|
| **Collision System** | Output -> | `registerLightPoint(position: Vec2, radius: number): string` | Register sensor trigger for a light point; returns lightPointId |
| **Collision System** | Output -> | `unregisterLightPoint(lightPointId: string)` | Remove sensor trigger |
| **Collision System** | Input <- | `onBallCollectLightPoint(lightPointId: string)` | Callback when ball enters a light point sensor |
| **Game State Management** | Output -> | `onLightPointCollected(lightPointId: string)` | Notify state that a light point was collected |
| **Game State Management** | Input <- | `getGameState(): GameState` | Read collection count and current phase |
| **Visual Feedback System** | Output -> | `playCollectEffect(position: Vec2)` | Trigger particle burst at collection point |
| **Audio System** | Output -> | `playSound('collect')` | Play collection chime |
| **Level System** | Input <- | `onLevelStart(config: LevelConfig)` | Receive light point positions and counts |
| **Scene Management** | Input <- | `onSceneUnload()` | Deactivate all light points and clear registry |

### States and Transitions

```
                    Level Loaded
                         |
                         v
                  +------------+
                  |  Spawning  |  0.3s spawn animation
                  +------------+
                         |
                         v
                  +------------+
            +---->|    Idle    |<----+
            |     +------------+     |
            |          |              |
            |   Ball enters sensor   |
            |          |              |
            |          v              |
            |   +------------+       |
            |   | Collecting | 0.4s  |
            |   +------------+       |
            |          |              |
            |          v              |
            |     +--------+         |
            |     |  Dead  |---------+
            |     +--------+  Level reset / reload
            |
            +--- Scene unload: destroy all
```

Transition rules:
- **Spawning -> Idle**: Automatic after `SPAWN_ANIM_DURATION` (0.3 s) elapses.
- **Idle -> Collecting**: Triggered by `onBallCollectLightPoint(id)` from collision system. Sensor disabled immediately; animation begins.
- **Collecting -> Dead**: Automatic after `COLLECT_ANIM_DURATION` (0.4 s) elapses.
- **Dead -> Spawning**: Triggered by level restart or new level load. Node reactivated, repositioned.
- **Any -> (destroyed)**: Triggered by `onSceneUnload()`. All nodes cleaned up.

Invalid transitions (must be prevented):
- Collecting -> Idle (no "uncollecting")
- Dead -> Idle (only via Spawning through level reset)
- Spawning -> Collecting (sensor not active during spawn)

## Formulas

### Collection Trigger Radius

```
collectionRadius = LIGHT_POINT_RADIUS + BALL_RADIUS + COLLECTION_TOLERANCE
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| LIGHT_POINT_RADIUS | number | 12 px | Config constant | Visual radius of the light point core |
| BALL_RADIUS | number | 15 px | Ball physics config | Ball collision radius |
| COLLECTION_TOLERANCE | number | 5 px | Config constant | Forgiveness margin for collection |
| collectionRadius | number | 32 px | Computed | Sensor trigger radius registered with collision system |

Rationale: The trigger radius is larger than the visual radius so the ball does not need to overlap the light point's drawn pixels to collect it. This makes collection feel generous without being trivially easy.

### Idle Pulse Animation

```
glowRadius(t) = LIGHT_POINT_RADIUS * GLOW_SCALE + sin(t * 2 * PI / PULSE_PERIOD) * LIGHT_POINT_RADIUS * PULSE_AMPLITUDE
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| GLOW_SCALE | number | 1.8 | Config constant | Ratio of glow ring to core radius |
| PULSE_AMPLITUDE | number | 0.15 | Config constant | Pulse magnitude as fraction of core radius |
| PULSE_PERIOD | number | 2.0 s | Config constant | Time for one full pulse cycle |
| t | number | 0 - infinity | Runtime | Elapsed time since idle began |

Graph description: Smooth sine wave oscillating the outer glow ring between `12 * 1.8 - 12 * 0.15 = 19.8 px` and `12 * 1.8 + 12 * 0.15 = 23.4 px`, centered at `21.6 px`, period 2 seconds.

### Collection Animation

```
progress = elapsed / COLLECT_ANIM_DURATION
eased = 1 - (1 - progress)^3                          // easeOutCubic
scale(eased) = 1.0 + eased * COLLECT_SCALE_RANGE      // 1.0 -> 2.0
opacity(eased) = 1.0 - eased                           // 1.0 -> 0.0
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| COLLECT_ANIM_DURATION | number | 0.4 s | User decision | Total collection animation time |
| COLLECT_SCALE_RANGE | number | 1.0 | Config constant | How far the light point expands (2.0x total) |
| elapsed | number | 0.0 - 0.4 s | Runtime | Time since collection triggered |
| progress | number | 0.0 - 1.0 | Computed | Raw animation progress |
| eased | number | 0.0 - 1.0 | Computed | Eased animation progress |
| scale | number | 1.0 - 2.0 | Computed | Current visual scale multiplier |
| opacity | number | 1.0 - 0.0 | Computed | Current visual opacity |

Graph description: Scale starts at 1.0 and rapidly climbs toward 2.0 with diminishing speed (easeOutCubic). Opacity mirrors this, dropping from 1.0 to 0.0 at the same eased rate. At 0.4 s the node is fully transparent and twice its original size.

### Spawn Animation

```
progress = elapsed / SPAWN_ANIM_DURATION
scale(progress) = easeOutBack(progress)                // overshoot then settle to 1.0
opacity(progress) = progress                            // linear 0 -> 1
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| SPAWN_ANIM_DURATION | number | 0.3 s | Config constant | Spawn animation time |
| elapsed | number | 0.0 - 0.3 s | Runtime | Time since spawn began |

### Score Contribution (Informational)

```
pointsPerLightPoint = BASE_POINTS * comboMultiplier
comboMultiplier = 1 + (consecutiveCollections * COMBO_BONUS)
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| BASE_POINTS | number | 100 | Config constant | Base score per light point |
| consecutiveCollections | number | 0 - N | Runtime | Light points collected within COMBO_WINDOW seconds |
| COMBO_BONUS | number | 0.25 | Config constant | Multiplier increment per consecutive collection |
| COMBO_WINDOW | number | 1.5 s | Config constant | Time window for combo chain |
| comboMultiplier | number | 1.0 - 5.0 | Computed | Capped at 5.0 to prevent extreme scores |

Note: Score calculation is owned by a future scoring/star-rating system. The light point collection system only emits the collection event. This formula is documented here as a design reference for that future system.

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|-------------------|-----------|
| **Ball contacts two light points in the same physics step** | Sort by distance to ball center, process nearest first. Each fires an independent collection event and animation. | Deterministic ordering prevents frame-dependent outcomes. |
| **Ball contacts a light point while game phase is VICTORY or DEFEAT** | Ignore the collection event. The game state manager already rejects events in ended phases, but the light point system also skips animation to avoid visual noise. | No post-game collections; the level is over. |
| **Ball contacts a light point while paused** | Collision system already suppresses callbacks when paused. No event reaches the light point system. | Pause means total freeze. |
| **Level config specifies 0 light points** | Reject the level config and log an error. The game state manager also rejects this, but the light point system must not attempt to register zero sensors. | A level with no light points has no win condition. |
| **Light point position is outside the playable boundary** | Accept the position as given. The light point is placed off-screen and is effectively unreachable. Level design validation (a future tool concern) should catch this, but the runtime system does not reject it. | The system trusts level data; validation is a separate concern. |
| **Light point position overlaps another light point** | Both are placed normally. If the ball enters the overlap zone, both are collected in the same frame (nearest first). | Not an error; level designers may place clusters intentionally. |
| **Light point position overlaps a line segment** | Placed normally. The line segment is a static rigid body; the light point is a sensor. They do not physically interact. | Sensors do not collide with static bodies. |
| **Collection animation is playing when level restarts** | Immediately kill the animation, deactivate the node, and re-enter Spawning stage. | Clean restart, no orphaned animations. |
| **Scene unloads during a collection animation** | All nodes destroyed immediately, animations cancelled. | No dangling references after scene transition. |
| **Ball is moving extremely fast and passes through the sensor zone in one frame** | The sensor uses `onBeginContact` which fires on overlap detection. With CCD enabled on the ball, the physics engine will still detect the overlap. If CCD somehow misses it, the collection is lost -- this is acceptable given the tolerance margin. | 32 px trigger radius at 60 fps means the ball would need to exceed ~1920 px/s to fully skip the zone. Normal gameplay speeds are well below this. |
| **onBallCollectLightPoint called with an unknown lightPointId** | Log a warning and ignore the event. Do not crash, do not update state. | Defensive programming against race conditions during scene transitions. |
| **onBallCollectLightPoint called for a light point already in Collecting or Dead stage** | Ignore. Return without side effects. | Prevents double-counting if a stale callback fires. |

## Dependencies

| System | Direction | Nature of Dependency | Status |
|--------|-----------|---------------------|--------|
| **Collision System** | Bidirectional | Hard: Registers light point sensors; receives collection callbacks | Approved |
| **Game State Management** | Output -> | Hard: Calls `onLightPointCollected()` on each collection; reads phase to gate logic | Approved |
| **Visual Feedback System** | Output -> | Soft: Requests particle burst at collection point; not required for collection logic | Approved |
| **Audio System** | Output -> | Soft: Requests collection chime; not required for collection logic | Approved |
| **Level System** | Input <- | Hard: Receives light point positions and count via `onLevelStart()` | Not yet designed |
| **Scene Management** | Input <- | Hard: Receives `onSceneUnload()` for cleanup | Approved |

**Dependency analysis**:
- **Collision System** is a hard dependency because light points are physically implemented as sensors. Without the collision system, there is no trigger mechanism.
- **Game State Management** is a hard dependency because collection must update the global counter for victory detection.
- **Visual Feedback System** and **Audio System** are soft dependencies. Collection logic works without them; they only add juice.
- **Level System** is a hard dependency for knowing where to place light points. Until it is designed, the system can accept a raw `LightPointConfig[]` array.
- **Scene Management** is a hard dependency for lifecycle cleanup.

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **LIGHT_POINT_RADIUS** | 12 px | 8-20 px | Light points visually larger, easier to spot | Light points smaller, harder to see |
| **COLLECTION_TOLERANCE** | 5 px | 0-15 px | Collection more forgiving | Collection requires more precise contact |
| **COLLECT_ANIM_DURATION** | 0.4 s | 0.2-0.8 s | Animation lingers longer, more dramatic | Animation snaps faster, snappier feel |
| **COLLECT_SCALE_RANGE** | 1.0 (to 2.0x) | 0.5-2.0 | Light point expands further on collection | Light point expands less |
| **PULSE_AMPLITUDE** | 0.15 | 0.0-0.3 | Glow breathes more dramatically | Glow barely moves (0 = static) |
| **PULSE_PERIOD** | 2.0 s | 1.0-4.0 s | Pulse is slower, calmer | Pulse is faster, more energetic |
| **SPAWN_ANIM_DURATION** | 0.3 s | 0.1-0.5 s | Spawn animation slower, more theatrical | Spawn animation faster, levels load snappier |
| **GLOW_SCALE** | 1.8 | 1.2-3.0 | Glow ring is larger and more diffuse | Glow ring is tighter around the core |

**Interaction effects**:
- `COLLECTION_TOLERANCE` + `LIGHT_POINT_RADIUS` together define the effective trigger size. Increasing both makes the game very forgiving; decreasing both makes it demanding.
- `COLLECT_ANIM_DURATION` affects perceived "weight" of collection. Too fast feels abrupt; too slow blocks the player from seeing what is behind the expanding circle. 0.4 s is a balanced default.
- `PULSE_AMPLITUDE` at 0.0 removes the idle animation entirely, making light points feel static. Values above 0.3 may look jittery.
- `PULSE_PERIOD` should generally be at least 1.0 s to feel like breathing rather than vibration.

## Acceptance Criteria

### Functional Acceptance

- [ ] Light points spawn at positions specified by level config when `onLevelStart()` is called
- [ ] Each light point displays as a neon glow circle with gentle idle pulse during Idle stage
- [ ] The instant the ball overlaps a light point sensor, collection fires (no grace period)
- [ ] On collection, the light point plays expand + fade out animation over exactly 0.4 s
- [ ] On collection, `gameState.onLightPointCollected(id)` is called exactly once
- [ ] On collection, `visualFeedback.playCollectEffect(position)` is called
- [ ] On collection, `audio.playSound('collect')` is called
- [ ] After collection animation completes, the light point node is deactivated
- [ ] A collected light point cannot be collected again (sensor disabled immediately)

### Visual Acceptance

- [ ] Idle light point: warm yellow (#FFE66D) circle with white glow ring, pulsing gently
- [ ] Idle pulse follows sinusoidal formula with configurable period and amplitude
- [ ] Collection animation: circle expands from 1.0x to 2.0x scale over 0.4 s with easeOutCubic
- [ ] Collection animation: opacity fades from 1.0 to 0.0 over 0.4 s with easeOutCubic
- [ ] Collection animation: color shifts from yellow toward white during fade
- [ ] Spawn animation: circle scales from 0 to 1.0 with easeOutBack over 0.3 s

### Multi-Collection Acceptance

- [ ] Two light points collected in the same frame are processed nearest-first
- [ ] Each light point plays its own independent collection animation
- [ ] Each collection fires its own `onLightPointCollected()` call
- [ ] No duplicate collection events for the same light point

### Lifecycle Acceptance

- [ ] Level restart returns all light points to Spawning stage
- [ ] Scene unload destroys all light point nodes and clears the registry
- [ ] Collection animations playing during level restart are immediately cancelled
- [ ] Light points do not respond to collision callbacks during Spawning stage

### Edge Case Acceptance

- [ ] Collection events received during VICTORY or DEFEAT phase are ignored
- [ ] Unknown lightPointId in callback is logged and ignored (no crash)
- [ ] Callback for an already-collected light point is ignored
- [ ] Level config with 0 light points is rejected with an error

### Performance Acceptance

- [ ] Idle pulse animation does not cause GC pressure (no per-frame allocations)
- [ ] Collection animation uses tween/engine animation system (not per-frame manual update)
- [ ] With 30 light points on screen, idle pulse rendering maintains 60 fps
- [ ] Simultaneous collection of 5+ light points does not cause frame drops
- [ ] All tuning parameters are read from config, not hardcoded

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| Should collected light points use object pooling? | Performance profiling needed | Pre-production | Recommended yes; 10-30 light points per level, reuse across level loads |
| Should light points have a "highlight when ball is near" proximity effect? | Playtest feedback | Post-MVP | Deferred -- adds juice but increases visual noise |
| Should the last light point have a special collection animation? | Design decision | Post-MVP | Deferred -- the victory fanfare may be sufficient |
| Should light points be collectible during READY phase (before ball launch)? | Design decision | -- | No -- the ball does not exist during READY, so sensors cannot trigger. No special handling needed. |
