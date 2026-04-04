# ADR-002: Scene Management Strategy

**Date**: 2026-04-04
**Status**: Accepted
**Context**: Pre-Production Gate Check

## Context

反弹达人 has multiple screens (main menu, world select, level select, gameplay) and in-game overlays (pause, win result, lose result). We need to decide between full scene switching vs. single-scene with UI toggling.

## Decision

Use a **hybrid approach**: 4 Cocos Creator scenes for major navigation states, with overlay panels for pause and results within the gameplay scene.

## Rationale

1. **Matches UI system design**: The UI system GDD defines 4 scene screens + 3 in-game overlays
2. **Scene screens** (MainMenu, WorldSelect, LevelSelect, Gameplay):
   - Clear separation of concerns
   - Natural memory management (unload previous scene assets)
   - Matches Cocos Creator's scene lifecycle
3. **In-game overlays** (PauseOverlay, WinResultOverlay, LoseResultOverlay):
   - No scene reload during gameplay — preserves physics state
   - Faster transitions (fade in/out vs. full scene load)
   - Game state remains intact (PAUSED → PLAYING transitions are seamless)
4. **Validated by scene-management.md**: The GDD already defines this scene structure with transition animations

## Scene Flow

```
MainMenu → WorldSelect → LevelSelect → Gameplay
                                    ├── PauseOverlay (fade)
                                    ├── WinResultOverlay (modal)
                                    └── LoseResultOverlay (modal)
```

## Consequences

- **Positive**: Clean separation, fast in-game transitions, physics state preserved
- **Negative**: Scene switches have a ~300ms transition, game data must be passed between scenes
- **Trade-off**: In-game overlays add complexity to the Gameplay scene node hierarchy

## Related

- GDD: `design/gdd/scene-management.md`, `design/gdd/ui-system.md`
