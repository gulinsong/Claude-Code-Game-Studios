# ADR-014: UI System -- Screen Navigation and Overlay Management

**Date**: 2026-04-13
**Status**: Accepted
**Context**: Sprint 2 Implementation

## Context

反弹达人 requires a UI system that manages 4 screen types (Main Menu, World Select, Level Select, Gameplay) and 3 overlay types (Pause, Win Result, Lose Result). The GDD (`design/gdd/ui-system.md`) defines a navigation flow with back-stack history, overlay lifecycle tied to game state, and layout calculations for a 750x1334 design resolution.

The UI system must be pure TypeScript logic (no Cocos Creator dependencies) for full testability, consistent with the project's layered architecture. It interacts with GameStateManager (phase changes), LevelSystem (world/level data), StarRatingCalculator (result display), and AudioSystem (UI sounds).

## Decision

Implement the UI system as three coordinated pure-logic controllers sharing a callback-based architecture:

1. **UIScreenController** -- navigation stack, overlay state, debounce protection, layout calculations
2. **HUDController** -- gameplay HUD data binding (lines, light points, session time)
3. **OverlayController** -- overlay content assembly (star positions, button states, result text)

All three are engine-agnostic; the engine adapter layer wires callbacks to Cocos Creator node manipulation.

### Architecture

```
Engine Touch Events
    |
    v
+------------------------+
|   UIScreenController   |     Callbacks
|   Navigation Stack     +-----------> SceneManagementSystem (onSwitchScene)
|   Overlay State        +-----------> AudioSystem (onPlaySound)
|   Debounce Guard       +-----------> GameStateManager (onPauseGame/onResumeGame)
|   Layout Calculator    |
+------------------------+
    |               |
    v               v
+------------+  +-------------------+
| HUD        |  | Overlay           |
| Controller |  | Controller        |
| Data Bind  |  | Content Assembly  |
+------------+  +-------------------+
    |               |
    v               v
Engine adapter reads state and updates Cocos nodes
```

### Key Interfaces

```typescript
// UIScreenController (implemented)
enum UIScreen { MAIN_MENU, WORLD_SELECT, LEVEL_SELECT, GAMEPLAY }
enum UIOverlay { NONE, PAUSE, WIN_RESULT, LOSE_RESULT }

// Navigation
navigateTo(screen, data?): void     // push onto stack
goBack(): void                      // pop or close overlay
completeTransition(): void          // clear debounce

// Overlays
openPause(): void                   // GAMEPLAY only, fires onPauseGame
closePause(): void                  // fires onResumeGame
showWinResult(): void               // fires onShowOverlay
showLoseResult(): void              // fires onShowOverlay

// Layout calculations
getWorldCardLayouts(count): CardLayout[]
getLevelCardLayouts(count): CardLayout[]
getStarLayouts(): CardLayout[]

// Guards
canInteract(): boolean              // debounce + transition + buttons
canGoBack(): boolean                // stack depth or overlay open
```

### Design Decisions

1. **Back-stack navigation**: Each `navigateTo` pushes onto an array; `goBack` pops. This naturally handles the MAIN_MENU → WORLD_SELECT → LEVEL_SELECT → GAMEPLAY hierarchy. `exitToLevelSelect` pops until LEVEL_SELECT is found.

2. **Overlay-first back navigation**: `goBack()` checks overlay state before navigation stack. If an overlay is open, closing it takes priority over screen navigation. This matches the GDD requirement that Gameplay's back button opens pause rather than navigating away.

3. **Debounce + transition dual guard**: `canInteract()` checks three conditions: debounce timestamp (prevents rapid clicks), transitioning flag (blocks during screen transitions), and buttonsInteractive flag (blocks during overlay animations). `completeTransition()` clears both the flag and the timestamp.

4. **Layout calculations in logic layer**: `getWorldCardLayouts`, `getLevelCardLayouts`, and `getStarLayouts` compute positions using UIConfig constants. The engine adapter reads these positions to place Cocos nodes.

5. **UIConfig as single source of truth**: All layout constants (design resolution, card sizes, spacing, sound IDs) live in `UI_CONFIG`. No hardcoded values in controllers.

## Rationale

1. **Pure logic controllers match project pattern**: Every system in this project uses callback-based pure TypeScript. UIScreenController follows the same pattern as InputSystem, AudioSystem, etc., maintaining architectural consistency.

2. **Combined controller handles tight overlay-screen coupling**: The GDD specifies that overlays only appear during GAMEPLAY, pause must fire game pause, and back navigation must close overlays before navigating. These constraints require overlay and screen state to share knowledge -- separating them would require bidirectional coupling.

3. **Layout in logic layer enables screenshot-free testing**: Layout calculations are deterministic math. By computing positions in pure TypeScript, we can assert exact pixel values in unit tests without rendering anything.

4. **Debounce prevents navigation corruption**: Without debounce, rapid clicks during transitions could push multiple screens or open overlays on the wrong screen. The triple guard (timestamp + flag + buttons) ensures exactly one action per user interaction.

## Consequences

- **Positive**: 47 unit tests cover all navigation, overlay, debounce, and layout behaviors. No engine mocking needed. Layout values are testable against UIConfig constants. Overlay lifecycle is deterministic and testable.
- **Negative**: UIScreenController manages multiple responsibilities (navigation, overlays, debounce, layout). If the UI grows significantly (settings screen, shop, etc.), it may need decomposition. The callback registration pattern requires careful ordering -- callbacks must be set before navigation calls.

## Related

- GDD: `design/gdd/ui-system.md` (screen architecture, layout formulas, edge cases)
- GDD: `design/gdd/game-state-manager.md` (phase changes trigger overlay display)
- GDD: `design/gdd/star-rating-system.md` (star data for result overlay)
- Source: `src/ui/UIScreenController.ts`
- Source: `src/config/UIConfig.ts`
- ADR-013: GameConfig (UIConfig follows same pattern)
