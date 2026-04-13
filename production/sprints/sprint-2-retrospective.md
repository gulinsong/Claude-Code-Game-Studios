# Sprint 2 Retrospective

> **Sprint**: Sprint 2 — Presentation & Integration
> **Date**: 2026-04-13
> **Duration**: 1 session

---

## Summary

Sprint 2 goal was to implement the UI system (last MVP system) as pure TypeScript and create the Cocos Creator engine adapter skeleton. Both objectives were completed in a single session.

## Metrics

| Metric | Planned | Actual |
|--------|---------|--------|
| UI components | 4 (UIScreen, HUD, Overlay, Layout) | 3 (UIScreenController, HUDController, OverlayController) |
| Engine adapters | 2 (Scene, Input) | 2 (GameplaySceneAdapter, InputBridge) |
| New tests | ~40 | 87 |
| Total tests | ~512 | 559 |
| ADRs | 1 | 1 (ADR-014) |
| Sessions used | 3 | 1 |

## What Went Well

1. **UIScreenController covers multiple stories in one**: The combined controller handles navigation, overlays, debounce, and layout calculations — eliminating the need for separate controller classes for each concern. This simplified the architecture while maintaining full test coverage.

2. **Layout calculations in logic layer**: getWorldCardLayouts, getLevelCardLayouts, and getStarLayouts compute deterministic pixel positions from UIConfig constants. All values are testable without rendering.

3. **Engine adapter skeleton is clean**: The boundary between pure logic (src/core, src/gameplay, src/ui) and engine-dependent code (src/engine) is now explicit. The adapters only bridge; they contain no game logic.

4. **Debounce + transition dual guard**: The triple guard (debounceUntil, transitioning, buttonsInteractive) prevents navigation corruption from rapid clicks, covering all the edge cases in the GDD.

## What Could Be Improved

1. **Layout calculations could be extracted**: UIScreenController manages navigation, overlays, AND layout. If the UI grows (settings, shop), layout should move to a dedicated LayoutCalculator class.

2. **OverlayController is lightweight**: It only assembles data; it doesn't manage state transitions. The name might suggest it controls overlays, but UIScreenController actually manages overlay lifecycle.

## Lessons Learned

1. **Combined controllers work for MVP scope**: With 4 screens and 3 overlays, a single UIScreenController is manageable. Extract when it exceeds ~500 lines.

2. **Test the debounce mechanism explicitly**: The debounce + transition + buttonsInteractive guard has 3 independent flags that interact. Tests must verify each flag independently AND their combination.

## Definition of Done Check

| Criteria | Status |
|----------|--------|
| UI system unit tests pass | Yes — 87 tests (47 UIScreen + 20 HUD + 20 Overlay) |
| All previous tests still pass | Yes — 559 tests, 19 suites |
| UI system has ADR | Yes — ADR-014 |
| Engine adapter compiles | Yes — TypeScript with Cocos Creator types |
| Sprint retrospective completed | This document |

## Velocity

- **1 session** to complete all Sprint 2 stories
- This was faster than planned due to: UIScreenController covering multiple stories, engine adapters being skeleton-only (TODO stubs for actual node manipulation)

---

## Next Sprint Preview

All MVP systems are now implemented. Remaining work:

| System | Layer | Status | Remaining Work |
|--------|-------|--------|----------------|
| Save System | Polish | Not started | Not in MVP scope |
| Engine wiring | Integration | Skeleton done | Fill in TODO stubs, wire to real Cocos nodes |
| Content | — | 9 levels in 2 worlds | Expand to full game content |
| Playtesting | QA | Not started | Manual playtest sessions |
