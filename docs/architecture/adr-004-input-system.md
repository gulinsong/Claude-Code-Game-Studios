# ADR-004: Input System -- Touch-to-Line Architecture

**Date**: 2026-04-10
**Status**: Accepted
**Context**: Sprint 1 Implementation

## Context

反弹达人 requires a touch input system that converts raw finger movements into validated line segments for gameplay. Players draw lines by touching and dragging on screen; the system must track touch state, show a real-time preview during drawing, validate line length (rejecting accidental taps), and support undo. The input system sits at the Foundation layer -- every gameplay feature depends on it, but it must not depend on the engine's rendering pipeline directly.

The GDD (`design/gdd/input-system.md`) defines a three-state model (Idle, Drawing, LinePlaced) with minimum line length validation, single-touch support, and quota-aware drawing. This ADR captures the architectural decision for turning that design into an engine-agnostic, testable implementation.

## Decision

Use a **callback-based state machine with two core states (IDLE, DRAWING)** in the logic layer. Touch start and touch end produce line segment candidates; a minimum length validation gate (20px from `INPUT_CONFIG`) rejects degenerate inputs before they reach gameplay systems.

### Architecture

```
Touch Events (Engine Layer)
    |
    v
+-------------------+
|  InputSystem      |        Callbacks
|  State Machine    +-------------------> Line Bounce System
|                   |                   (onLineCreated, onLineRemoved)
|  IDLE -> DRAWING  +-------------------> Visual Feedback System
|  DRAWING -> IDLE  |                   (showPreviewLine, hidePreviewLine)
+-------------------+
    |                       Callbacks
    +-------------------> Audio System
                          (playLinePlaceSound, playLineUndoSound)
```

### Key Interfaces

```typescript
enum InputState { IDLE = 'IDLE', DRAWING = 'DRAWING' }

interface InputCallbacks {
  onLineCreated(start: Vec2, end: Vec2): void;
  onLineRemoved(lineId: string): void;
  onPreviewLine(start: Vec2, end: Vec2): void;
  onPreviewLineHide(): void;
  onInvalidLine(): void;
}

// Core methods
onTouchStart(position: Vec2): void;   // IDLE -> DRAWING
onTouchMove(position: Vec2): void;    // update preview (DRAWING only)
onTouchEnd(position: Vec2): void;     // DRAWING -> IDLE, validate length
cancelTouch(): void;                  // force return to IDLE (interrupted)
```

### Implementation Guidelines

1. **Pure TypeScript logic layer**: No Cocos Creator imports. The engine layer wraps `InputSystem` and calls `onTouchStart/Move/End` from Cocos touch events.
2. **Minimum length gate**: On touch end, compute `lineLength = sqrt((endX - startX)^2 + (endY - startY)^2)`. If `lineLength < MIN_LINE_LENGTH` (20px), call `onInvalidLine()` and return to IDLE without creating a line.
3. **Single-touch only**: Ignore touch start events while in DRAWING state. The engine layer should filter to the first touch point before calling into the logic layer.
4. **Preview during DRAWING**: Every `onTouchMove` fires `onPreviewLine(start, current)` so the engine layer can render a semi-transparent line.
5. **Cancel on interrupt**: `cancelTouch()` returns to IDLE without creating a line, used when the app loses focus or the touch is cancelled by the OS.
6. **Undo is a separate operation**: The input system exposes `undoLine(lineId)` which validates the line has not been activated (ball has not collided with it) and fires `onLineRemoved(lineId)`.

## Rationale

1. **Pure TypeScript, no engine dependencies**: The logic layer has zero Cocos Creator imports. This makes the state machine fully unit-testable in Node.js without mocking engine APIs. The engine layer is a thin adapter that bridges Cocos touch events to the logic layer's method calls.
2. **Callback pattern for rendering**: By dispatching visual requests via callbacks (`onPreviewLine`, `onPreviewLineHide`), the logic layer never touches the rendering pipeline. The engine layer handles actual line node creation and preview rendering.
3. **Minimum line length prevents degenerate inputs**: A 20px threshold (`MIN_LINE_LENGTH`) rejects accidental taps while still allowing short strategic lines. The GDD specifies this value as configurable in the safe range 10-50px.
4. **Two-state model is sufficient**: The GDD defines three states (Idle, Drawing, LinePlaced), but LinePlaced is a transient outcome of touch end -- the system returns to IDLE immediately after creating or rejecting a line. A two-state machine is simpler and equally expressive.
5. **Config-driven via INPUT_CONFIG**: `MIN_LINE_LENGTH`, `PREVIEW_LINE_OPACITY`, `MAX_LINES_PER_LEVEL` (queried, not owned) are all externalized.

## Consequences

- **Positive**: Fully unit-testable logic layer with no engine mocking. Clean separation of input detection from rendering. Minimum length validation prevents degenerate lines. Single-touch constraint keeps the model simple. Callback pattern is consistent with other Foundation-layer systems (Audio, Visual Feedback).
- **Negative**: Callback registration must happen before touch events arrive, or lines will be silently dropped. The two-state simplification means the system does not track whether a placed line has been activated (that responsibility falls to the Line Bounce System). Touch-to-logic translation happens in the engine adapter, which must correctly filter multi-touch and UI-area touches before calling into the logic layer.

## Related

- GDD: `design/gdd/input-system.md` (states, formulas, edge cases, tuning knobs)
- GDD: `design/gdd/line-bounce-system.md` (consumes onLineCreated/onLineRemoved)
- GDD: `design/gdd/visual-feedback-system.md` (receives preview/confirmed line requests)
- GDD: `design/gdd/audio-system.md` (receives line place/undo sound triggers)
- Source: `src/foundation/InputSystem.ts`
- ADR-001: Physics Engine Selection (input feeds lines into physics)
