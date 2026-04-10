# ADR-012: Star Rating -- Threshold-Based Performance Scoring

**Date**: 2026-04-10
**Status**: Accepted
**Context**: Sprint 1 Implementation

## Context

Players need clear performance feedback after each level. A star rating system (0-3 stars) based on light point collection percentage provides an intuitive, universally understood scoring mechanic. The system must also drive long-term progression by tracking cumulative stars across all levels and unlocking new worlds at configured thresholds. Star thresholds must be configurable per level but provide sensible defaults, and the calculation must be pure and side-effect-free for easy unit testing.

## Decision

Implement `StarRatingCalculator` as a class with pure static methods. Star ratings are computed from light point collection counts against configurable thresholds:

- **3 stars**: `lightPointsCollected >= thresholds.three` (default: 100% -- the "one-ball clear" pillar)
- **2 stars**: `lightPointsCollected >= thresholds.two` (default: `ceil(count * 0.7)`)
- **1 star**: `lightPointsCollected >= thresholds.one` (default: `ceil(count * 0.4)`)
- **0 stars**: Below 1-star threshold, or the game ended in DEFEAT

Default thresholds are generated via `generateDefaultThresholds(lightPointCount)` using ratios from `STAR_CONFIG`. The `ceil()` function ensures partial progress counts -- collecting 40% of 3 light points rounds up to 2, awarding 1 star.

Cumulative star tracking sums `bestStars` across all levels (where `bestStars > 0`). The `bestStars = max(previous, current)` rule ensures replaying a level never downgrades progress.

World unlock uses fixed thresholds from `STAR_CONFIG.WORLD_UNLOCK_THRESHOLDS`:

| World | Threshold | Notes |
|-------|-----------|-------|
| 1 | 0 | Always unlocked |
| 2 | 7 | ~0.875 avg stars across World 1's 8 levels |
| 3 | 18 | ~1.125 avg stars across 16 levels |
| 4 | 33 | ~1.375 avg stars across 24 levels |

All methods are static, take explicit parameters, and return values with no side effects. The `buildResult()` method produces a complete `StarRatingResult` object for consumption by the UI, save system, and animation/audio systems.

## Rationale

1. **Simple percentage-based scoring is intuitive**: Players understand "collect more, get more stars." No complex scoring formulas are needed at the rating level -- the score itself is a separate metric.
2. **ceil() is generous -- rewards partial progress**: `ceil(3 * 0.4) = 2` means collecting 2 out of 3 light points earns 1 star. This feels fair and encourages continued play rather than punishing near-misses.
3. **Config-driven thresholds allow tuning**: Level designers can override thresholds per level. The default ratios (0.4 / 0.7 / 1.0) provide a starting point validated against example calculations in the GDD.
4. **Static methods enable easy unit testing**: No instance state means each test is isolated. Formulas can be verified with concrete inputs and expected outputs without setup or teardown.
5. **World unlock creates progression incentive**: Cumulative stars give the player a meta-goal beyond individual levels. The thresholds are tuned so World 1 is accessible, but reaching World 4 requires consistent above-average performance.
6. **THRESHOLD_THREE_RATIO fixed at 1.0**: Three stars requires collecting every light point. This is non-negotiable because it enforces the "one-ball clear" core pillar.

## Consequences

- **Positive**: Pure static methods are trivially testable with zero mocking; threshold validation (`validateThresholds`) catches malformed level configs at load time; `buildResult()` produces a single comprehensive object that all downstream systems can consume; cumulative stars only increase, creating a safe replay environment; world unlock thresholds are data-driven and adjustable.
- **Negative**: The calculator is stateless by design, so the calling code (game state manager or level system) must manage persistence and state transitions; world unlock thresholds are currently hardcoded in config rather than derived from level count or difficulty curves; the `ceil()` rounding means very small light point counts (1-2 per level) produce degenerate thresholds where all three tiers collapse to the same value.

## Related

- GDD: `design/gdd/star-rating-system.md`
- Source: `src/gameplay/StarRatingCalculator.ts`
- Config: `src/config/GameConfig.ts` (STAR_CONFIG)
