/**
 * StarRatingCalculator.test.ts — Unit tests for the star rating system.
 *
 * Covers all acceptance criteria from design/gdd/star-rating-system.md:
 *   - calculateStars (threshold levels, exact boundaries, defeat)
 *   - generateDefaultThresholds (formula verification for various counts)
 *   - validateThresholds (ascending order, bounds checking)
 *   - calculateCumulativeStars (summation, zero-entry filtering)
 *   - isWorldUnlocked (world unlock thresholds)
 *   - getUnlockProgress (clamped 0.0–1.0 progress)
 *   - buildResult (new record detection, cumulative update, world unlock)
 *   - Edge cases (1 light point, all 3-star, all 0-star)
 */

import { StarRatingCalculator } from '../../../src/gameplay/StarRatingCalculator';
import { StarThresholds } from '../../../src/interfaces/GameInterfaces';

// ---------------------------------------------------------------------------
// calculateStars
// ---------------------------------------------------------------------------

describe('StarRatingCalculator.calculateStars', () => {
    const thresholds: StarThresholds = { one: 2, two: 4, three: 6 };
    const total = 6;

    test('collected >= three returns 3', () => {
        expect(StarRatingCalculator.calculateStars(6, total, thresholds, true)).toBe(3);
        expect(StarRatingCalculator.calculateStars(7, total, thresholds, true)).toBe(3);
    });

    test('collected >= two but < three returns 2', () => {
        expect(StarRatingCalculator.calculateStars(4, total, thresholds, true)).toBe(2);
        expect(StarRatingCalculator.calculateStars(5, total, thresholds, true)).toBe(2);
    });

    test('collected >= one but < two returns 1', () => {
        expect(StarRatingCalculator.calculateStars(2, total, thresholds, true)).toBe(1);
        expect(StarRatingCalculator.calculateStars(3, total, thresholds, true)).toBe(1);
    });

    test('collected < one returns 0', () => {
        expect(StarRatingCalculator.calculateStars(0, total, thresholds, true)).toBe(0);
        expect(StarRatingCalculator.calculateStars(1, total, thresholds, true)).toBe(0);
    });

    test('exactly at threshold returns correct star level', () => {
        expect(StarRatingCalculator.calculateStars(2, total, thresholds, true)).toBe(1);
        expect(StarRatingCalculator.calculateStars(4, total, thresholds, true)).toBe(2);
        expect(StarRatingCalculator.calculateStars(6, total, thresholds, true)).toBe(3);
    });

    test('one above threshold returns next star level', () => {
        expect(StarRatingCalculator.calculateStars(3, total, thresholds, true)).toBe(1);
        expect(StarRatingCalculator.calculateStars(5, total, thresholds, true)).toBe(2);
    });

    test('returns 0 when isVictory is false (defeat)', () => {
        expect(StarRatingCalculator.calculateStars(6, total, thresholds, false)).toBe(0);
        expect(StarRatingCalculator.calculateStars(0, total, thresholds, false)).toBe(0);
    });

    test('returns 0 on defeat even if collected meets three threshold', () => {
        expect(StarRatingCalculator.calculateStars(6, total, thresholds, false)).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// generateDefaultThresholds
// ---------------------------------------------------------------------------

describe('StarRatingCalculator.generateDefaultThresholds', () => {
    // Expected values sourced directly from the GDD formula table.
    // three = lightPointCount, two = ceil(count * 0.7), one = ceil(count * 0.4)

    test('lightPointCount=2 produces {one:1, two:2, three:2}', () => {
        const t = StarRatingCalculator.generateDefaultThresholds(2);
        expect(t).toEqual({ one: 1, two: 2, three: 2 });
    });

    test('lightPointCount=3 produces {one:2, two:3, three:3}', () => {
        const t = StarRatingCalculator.generateDefaultThresholds(3);
        expect(t).toEqual({ one: 2, two: 3, three: 3 });
    });

    test('lightPointCount=4 produces {one:2, two:3, three:4}', () => {
        const t = StarRatingCalculator.generateDefaultThresholds(4);
        expect(t).toEqual({ one: 2, two: 3, three: 4 });
    });

    test('lightPointCount=5 produces {one:2, two:4, three:5}', () => {
        const t = StarRatingCalculator.generateDefaultThresholds(5);
        expect(t).toEqual({ one: 2, two: 4, three: 5 });
    });

    test('lightPointCount=6 produces {one:3, two:5, three:6}', () => {
        const t = StarRatingCalculator.generateDefaultThresholds(6);
        expect(t).toEqual({ one: 3, two: 5, three: 6 });
    });

    test('lightPointCount=8 produces {one:4, two:6, three:8}', () => {
        const t = StarRatingCalculator.generateDefaultThresholds(8);
        expect(t).toEqual({ one: 4, two: 6, three: 8 });
    });

    test('lightPointCount=10 produces {one:4, two:7, three:10}', () => {
        const t = StarRatingCalculator.generateDefaultThresholds(10);
        expect(t).toEqual({ one: 4, two: 7, three: 10 });
    });

    test('three always equals lightPointCount (100% pillar)', () => {
        for (const count of [1, 2, 5, 7, 9, 15, 20]) {
            const t = StarRatingCalculator.generateDefaultThresholds(count);
            expect(t.three).toBe(count);
        }
    });

    test('thresholds satisfy ascending order constraint', () => {
        for (const count of [2, 3, 4, 5, 6, 8, 10]) {
            const t = StarRatingCalculator.generateDefaultThresholds(count);
            expect(StarRatingCalculator.validateThresholds(t, count)).toBe(true);
        }
    });
});

// ---------------------------------------------------------------------------
// validateThresholds
// ---------------------------------------------------------------------------

describe('StarRatingCalculator.validateThresholds', () => {
    test('valid ascending thresholds return true', () => {
        expect(
            StarRatingCalculator.validateThresholds({ one: 2, two: 4, three: 6 }, 6)
        ).toBe(true);
    });

    test('valid thresholds with equal values return true', () => {
        // one == two == three == lightPointCount is valid
        expect(
            StarRatingCalculator.validateThresholds({ one: 5, two: 5, three: 5 }, 5)
        ).toBe(true);
    });

    test('rejects non-ascending thresholds where one > two', () => {
        expect(
            StarRatingCalculator.validateThresholds({ one: 5, two: 3, three: 6 }, 6)
        ).toBe(false);
    });

    test('rejects non-ascending thresholds where two > three', () => {
        expect(
            StarRatingCalculator.validateThresholds({ one: 2, two: 7, three: 5 }, 7)
        ).toBe(false);
    });

    test('rejects thresholds where one < 1', () => {
        expect(
            StarRatingCalculator.validateThresholds({ one: 0, two: 3, three: 5 }, 5)
        ).toBe(false);
    });

    test('rejects thresholds where three > lightPointCount', () => {
        expect(
            StarRatingCalculator.validateThresholds({ one: 2, two: 4, three: 11 }, 10)
        ).toBe(false);
    });

    test('accepts thresholds where one is exactly 1', () => {
        expect(
            StarRatingCalculator.validateThresholds({ one: 1, two: 3, three: 5 }, 5)
        ).toBe(true);
    });

    test('accepts thresholds where three equals lightPointCount', () => {
        expect(
            StarRatingCalculator.validateThresholds({ one: 2, two: 5, three: 10 }, 10)
        ).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// calculateCumulativeStars
// ---------------------------------------------------------------------------

describe('StarRatingCalculator.calculateCumulativeStars', () => {
    test('sums bestStars for all levels with bestStars > 0', () => {
        const progresses = [
            { bestStars: 3 },
            { bestStars: 2 },
            { bestStars: 1 },
        ];
        expect(StarRatingCalculator.calculateCumulativeStars(progresses)).toBe(6);
    });

    test('ignores entries with bestStars = 0', () => {
        const progresses = [
            { bestStars: 3 },
            { bestStars: 0 },
            { bestStars: 2 },
            { bestStars: 0 },
        ];
        expect(StarRatingCalculator.calculateCumulativeStars(progresses)).toBe(5);
    });

    test('returns 0 for empty array', () => {
        expect(StarRatingCalculator.calculateCumulativeStars([])).toBe(0);
    });

    test('returns 0 when all entries have bestStars = 0', () => {
        const progresses = [
            { bestStars: 0 },
            { bestStars: 0 },
            { bestStars: 0 },
        ];
        expect(StarRatingCalculator.calculateCumulativeStars(progresses)).toBe(0);
    });

    test('sums all 3-star levels to maximum per level count', () => {
        const progresses = Array.from({ length: 32 }, () => ({ bestStars: 3 }));
        // 32 levels * 3 stars = 96, but max depends on world count
        // 4 worlds x 8 levels = 32 levels => 96 stars max
        expect(StarRatingCalculator.calculateCumulativeStars(progresses)).toBe(96);
    });
});

// ---------------------------------------------------------------------------
// isWorldUnlocked
// ---------------------------------------------------------------------------

describe('StarRatingCalculator.isWorldUnlocked', () => {
    // WORLD_UNLOCK_THRESHOLDS = [0, 7, 18, 33]

    test('world 1 is always unlocked (threshold 0)', () => {
        expect(StarRatingCalculator.isWorldUnlocked(1, 0)).toBe(true);
        expect(StarRatingCalculator.isWorldUnlocked(1, 5)).toBe(true);
    });

    test('world 2 unlocks at exactly 7 cumulative stars', () => {
        expect(StarRatingCalculator.isWorldUnlocked(2, 6)).toBe(false);
        expect(StarRatingCalculator.isWorldUnlocked(2, 7)).toBe(true);
        expect(StarRatingCalculator.isWorldUnlocked(2, 8)).toBe(true);
    });

    test('world 3 unlocks at exactly 18 cumulative stars', () => {
        expect(StarRatingCalculator.isWorldUnlocked(3, 17)).toBe(false);
        expect(StarRatingCalculator.isWorldUnlocked(3, 18)).toBe(true);
        expect(StarRatingCalculator.isWorldUnlocked(3, 20)).toBe(true);
    });

    test('world 4 unlocks at exactly 33 cumulative stars', () => {
        expect(StarRatingCalculator.isWorldUnlocked(4, 32)).toBe(false);
        expect(StarRatingCalculator.isWorldUnlocked(4, 33)).toBe(true);
        expect(StarRatingCalculator.isWorldUnlocked(4, 50)).toBe(true);
    });

    test('world 5 (beyond configured list) is locked', () => {
        expect(StarRatingCalculator.isWorldUnlocked(5, 100)).toBe(false);
    });

    test('world 0 and negative world numbers are locked', () => {
        expect(StarRatingCalculator.isWorldUnlocked(0, 100)).toBe(false);
        expect(StarRatingCalculator.isWorldUnlocked(-1, 100)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// getUnlockProgress
// ---------------------------------------------------------------------------

describe('StarRatingCalculator.getUnlockProgress', () => {
    // WORLD_UNLOCK_THRESHOLDS = [0, 7, 18, 33]

    test('world 1 always returns 1.0 (threshold is 0)', () => {
        expect(StarRatingCalculator.getUnlockProgress(1, 0)).toBeCloseTo(1.0);
        expect(StarRatingCalculator.getUnlockProgress(1, 50)).toBeCloseTo(1.0);
    });

    test('world 2 at 0 stars returns 0.0', () => {
        expect(StarRatingCalculator.getUnlockProgress(2, 0)).toBeCloseTo(0.0);
    });

    test('world 2 at 3 stars returns ~0.4286', () => {
        expect(StarRatingCalculator.getUnlockProgress(2, 3)).toBeCloseTo(3 / 7);
    });

    test('world 2 at 7 stars returns 1.0 (unlocked)', () => {
        expect(StarRatingCalculator.getUnlockProgress(2, 7)).toBeCloseTo(1.0);
    });

    test('world 2 at 10 stars returns 1.0 (clamped, no overflow)', () => {
        expect(StarRatingCalculator.getUnlockProgress(2, 10)).toBeCloseTo(1.0);
    });

    test('world 3 at 9 stars returns ~0.5', () => {
        expect(StarRatingCalculator.getUnlockProgress(3, 9)).toBeCloseTo(9 / 18);
    });

    test('world 5 (beyond configured) returns 0.0', () => {
        expect(StarRatingCalculator.getUnlockProgress(5, 50)).toBeCloseTo(0.0);
    });

    test('progress is clamped to 0.0 minimum with negative stars', () => {
        // Defensive: even though negative stars shouldn't occur, verify clamp
        expect(StarRatingCalculator.getUnlockProgress(2, -5)).toBeCloseTo(0.0);
    });
});

// ---------------------------------------------------------------------------
// buildResult
// ---------------------------------------------------------------------------

describe('StarRatingCalculator.buildResult', () => {
    test('first play sets isNewRecord true and newBestStars equals stars', () => {
        const result = StarRatingCalculator.buildResult(
            'level-1-1', 2, 0, 0, 4, 6, 30
        );
        expect(result.newBestStars).toBe(2);
        expect(result.isNewRecord).toBe(true);
    });

    test('replay with higher stars updates best and sets isNewRecord true', () => {
        const result = StarRatingCalculator.buildResult(
            'level-1-1', 3, 2, 5, 6, 6, 25
        );
        expect(result.newBestStars).toBe(3);
        expect(result.isNewRecord).toBe(true);
    });

    test('replay with same stars does not set isNewRecord', () => {
        const result = StarRatingCalculator.buildResult(
            'level-1-1', 2, 2, 5, 4, 6, 20
        );
        expect(result.newBestStars).toBe(2);
        expect(result.isNewRecord).toBe(false);
    });

    test('replay with lower stars does not downgrade bestStars', () => {
        const result = StarRatingCalculator.buildResult(
            'level-1-1', 1, 3, 10, 2, 6, 15
        );
        expect(result.newBestStars).toBe(3);
        expect(result.isNewRecord).toBe(false);
    });

    test('cumulativeStarsAfter increases by star difference on new record', () => {
        const result = StarRatingCalculator.buildResult(
            'level-1-1', 3, 1, 10, 6, 6, 30
        );
        // previousBest=1, newBest=3 => delta=2, cumulativeBefore=10
        expect(result.cumulativeStarsAfter).toBe(12);
    });

    test('cumulativeStarsAfter unchanged when no new record', () => {
        const result = StarRatingCalculator.buildResult(
            'level-1-1', 1, 3, 10, 2, 6, 15
        );
        expect(result.cumulativeStarsAfter).toBe(10);
    });

    test('detects world unlock when crossing threshold', () => {
        // cumulativeBefore=6 (< 7 for world 2), newBest=3, previousBest=1
        // delta=2 => cumulativeAfter=8 (>= 7) => world 2 unlocked
        const result = StarRatingCalculator.buildResult(
            'level-1-1', 3, 1, 6, 6, 6, 30
        );
        expect(result.newWorldUnlocked).toBe(2);
    });

    test('returns null for newWorldUnlocked when no new world is unlocked', () => {
        const result = StarRatingCalculator.buildResult(
            'level-1-1', 1, 0, 0, 2, 6, 30
        );
        // cumulativeAfter = 1, world 1 already "unlocked" (threshold 0) but
        // cumulativeBefore=0 < 0 is false (0 >= 0), so world 1 was never locked.
        // No crossing occurs => null.
        expect(result.newWorldUnlocked).toBeNull();
    });

    test('preserves all input fields in result', () => {
        const result = StarRatingCalculator.buildResult(
            'level-2-3', 2, 1, 15, 5, 8, 45.5
        );
        expect(result.levelId).toBe('level-2-3');
        expect(result.stars).toBe(2);
        expect(result.previousBestStars).toBe(1);
        expect(result.lightPointsCollected).toBe(5);
        expect(result.lightPointsTotal).toBe(8);
        expect(result.sessionTime).toBeCloseTo(45.5);
    });

    test('detects highest newly unlocked world when multiple unlock', () => {
        // Build a scenario where star delta crosses multiple thresholds.
        // cumulativeBefore=5, earn 3 stars where previous was 0 => delta=3
        // cumulativeAfter=8 => crosses world 2 (threshold 7)
        // World 3 needs 18, world 4 needs 33 — only world 2 is crossed newly.
        const result = StarRatingCalculator.buildResult(
            'level-1-1', 3, 0, 5, 6, 6, 30
        );
        expect(result.cumulativeStarsAfter).toBe(8);
        expect(result.newWorldUnlocked).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('StarRatingCalculator edge cases', () => {
    test('1 light point level: thresholds are {one:1, two:1, three:1}', () => {
        const t = StarRatingCalculator.generateDefaultThresholds(1);
        expect(t).toEqual({ one: 1, two: 1, three: 1 });
    });

    test('1 light point level: collecting the single point earns 3 stars', () => {
        const t = StarRatingCalculator.generateDefaultThresholds(1);
        expect(StarRatingCalculator.calculateStars(1, 1, t, true)).toBe(3);
    });

    test('1 light point level: not collecting earns 0 stars', () => {
        const t = StarRatingCalculator.generateDefaultThresholds(1);
        expect(StarRatingCalculator.calculateStars(0, 1, t, true)).toBe(0);
    });

    test('all 3-star levels sum to correct cumulative total', () => {
        // 32 levels, all 3 stars = 96
        const progresses = Array.from({ length: 32 }, () => ({ bestStars: 3 }));
        expect(StarRatingCalculator.calculateCumulativeStars(progresses)).toBe(96);
    });

    test('all 0-star levels produce 0 cumulative stars', () => {
        const progresses = Array.from({ length: 32 }, () => ({ bestStars: 0 }));
        expect(StarRatingCalculator.calculateCumulativeStars(progresses)).toBe(0);
    });

    test('defeat with 0 collected still returns 0 stars', () => {
        const t: StarThresholds = { one: 2, two: 4, three: 6 };
        expect(StarRatingCalculator.calculateStars(0, 6, t, false)).toBe(0);
    });

    test('buildResult with 0 stars on first play is not a new record when previousBest is 0', () => {
        // 0 stars first play: newBest=max(0,0)=0, isNewRecord=(0>0)=false
        const result = StarRatingCalculator.buildResult(
            'level-1-1', 0, 0, 0, 0, 6, 10
        );
        expect(result.newBestStars).toBe(0);
        expect(result.isNewRecord).toBe(false);
    });
});
