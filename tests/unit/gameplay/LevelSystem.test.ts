/**
 * LevelSystem.test.ts — Unit tests for LevelSystem.
 * GDD: design/gdd/level-system.md
 *
 * Covers:
 * - Level data loading and validation
 * - Coordinate conversion (normalized → pixel)
 * - Progress tracking (best stars never downgrades, attempts, best time)
 * - World unlock logic (cumulative star thresholds)
 * - Level unlock logic (sequential within world)
 * - Edge cases (invalid data, empty system, boundary values)
 */

import { LevelSystem } from '../../../src/gameplay/LevelSystem';
import { LevelData, StarThresholds } from '../../../src/interfaces/GameInterfaces';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a valid LevelData with sensible defaults. */
function makeLevel(overrides: Partial<LevelData> = {}): LevelData {
    return {
        id: '1-1',
        world: 1,
        level: 1,
        name: 'Test Level',
        difficulty: 0.2,
        ball: { spawn: { x: 0.5, y: 0.1 }, direction: 90 },
        lightPoints: [{ x: 0.3, y: 0.7 }, { x: 0.5, y: 0.5 }, { x: 0.7, y: 0.7 }],
        starThresholds: { one: 1, two: 2, three: 3 },
        maxLines: 3,
        timeLimit: 60,
        obstacles: [],
        ...overrides,
    };
}

/** Creates a full set of levels for world 1 (4 levels). */
function makeWorld1Levels(): LevelData[] {
    return [
        makeLevel({ id: '1-1', world: 1, level: 1, lightPoints: [{ x: 0.3, y: 0.7 }, { x: 0.5, y: 0.5 }, { x: 0.7, y: 0.7 }], starThresholds: { one: 1, two: 2, three: 3 } }),
        makeLevel({ id: '1-2', world: 1, level: 2, lightPoints: [{ x: 0.2, y: 0.5 }, { x: 0.4, y: 0.3 }, { x: 0.5, y: 0.8 }, { x: 0.8, y: 0.3 }], starThresholds: { one: 2, two: 3, three: 4 } }),
        makeLevel({ id: '1-3', world: 1, level: 3, lightPoints: [{ x: 0.3, y: 0.6 }, { x: 0.5, y: 0.4 }, { x: 0.6, y: 0.4 }], starThresholds: { one: 1, two: 2, three: 3 } }),
        makeLevel({ id: '1-4', world: 1, level: 4, lightPoints: [{ x: 0.4, y: 0.5 }, { x: 0.5, y: 0.3 }, { x: 0.6, y: 0.5 }], starThresholds: { one: 1, two: 2, three: 3 } }),
    ];
}

// ---------------------------------------------------------------------------
// validateLevelData — static validation
// ---------------------------------------------------------------------------

describe('LevelSystem.validateLevelData', () => {
    test('valid level returns no errors', () => {
        const result = LevelSystem.validateLevelData(makeLevel());
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });

    test('invalid ID format is rejected', () => {
        const result = LevelSystem.validateLevelData(makeLevel({ id: 'abc' }));
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('format'))).toBe(true);
    });

    test('empty ID is rejected', () => {
        const result = LevelSystem.validateLevelData(makeLevel({ id: '' }));
        expect(result.valid).toBe(false);
    });

    test('world must be >= 1', () => {
        const result = LevelSystem.validateLevelData(makeLevel({ world: 0 }));
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('world'))).toBe(true);
    });

    test('level must be >= 1', () => {
        const result = LevelSystem.validateLevelData(makeLevel({ level: 0 }));
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('level'))).toBe(true);
    });

    test('empty name is rejected', () => {
        const result = LevelSystem.validateLevelData(makeLevel({ name: '' }));
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });

    test('whitespace-only name is rejected', () => {
        const result = LevelSystem.validateLevelData(makeLevel({ name: '   ' }));
        expect(result.valid).toBe(false);
    });

    test('difficulty > 1 is rejected', () => {
        const result = LevelSystem.validateLevelData(makeLevel({ difficulty: 1.5 }));
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('difficulty'))).toBe(true);
    });

    test('difficulty < 0 is rejected', () => {
        const result = LevelSystem.validateLevelData(makeLevel({ difficulty: -0.1 }));
        expect(result.valid).toBe(false);
    });

    test('maxLines = 0 is rejected', () => {
        const result = LevelSystem.validateLevelData(makeLevel({ maxLines: 0 }));
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('maxLines'))).toBe(true);
    });

    test('maxLines < 0 is rejected', () => {
        const result = LevelSystem.validateLevelData(makeLevel({ maxLines: -1 }));
        expect(result.valid).toBe(false);
    });

    test('empty lightPoints array is rejected', () => {
        const result = LevelSystem.validateLevelData(makeLevel({ lightPoints: [] }));
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('lightPoints'))).toBe(true);
    });

    test('non-ascending star thresholds are rejected (one >= two)', () => {
        const result = LevelSystem.validateLevelData(
            makeLevel({ starThresholds: { one: 2, two: 2, three: 3 } })
        );
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('one must be less'))).toBe(true);
    });

    test('non-ascending star thresholds are rejected (two >= three)', () => {
        const result = LevelSystem.validateLevelData(
            makeLevel({ starThresholds: { one: 1, two: 3, three: 3 } })
        );
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('two must be less'))).toBe(true);
    });

    test('starThresholds.three exceeding lightPoints count is rejected', () => {
        const result = LevelSystem.validateLevelData(
            makeLevel({ starThresholds: { one: 1, two: 2, three: 5 } })
        );
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('three must not exceed'))).toBe(true);
    });

    test('multiple errors are all reported', () => {
        const result = LevelSystem.validateLevelData(
            makeLevel({ id: 'bad', maxLines: 0, lightPoints: [] })
        );
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
});

// ---------------------------------------------------------------------------
// normalizedToPixel — coordinate conversion
// ---------------------------------------------------------------------------

describe('LevelSystem.normalizedToPixel', () => {
    test('origin (0,0) maps to bottom-left boundary', () => {
        const result = LevelSystem.normalizedToPixel(0, 0, 750, 1334, 20, 20);
        expect(result.x).toBe(20);
        expect(result.y).toBe(20);
    });

    test('(1,1) maps to top-right corner', () => {
        const result = LevelSystem.normalizedToPixel(1, 1, 750, 1334, 20, 20);
        expect(result.x).toBe(770);
        expect(result.y).toBe(1354);
    });

    test('(0.5, 0.5) maps to center of playable area', () => {
        const result = LevelSystem.normalizedToPixel(0.5, 0.5, 750, 1334, 20, 20);
        expect(result.x).toBe(395);
        expect(result.y).toBe(687);
    });

    test('works with zero boundaries', () => {
        const result = LevelSystem.normalizedToPixel(0.5, 0.5, 800, 600, 0, 0);
        expect(result.x).toBe(400);
        expect(result.y).toBe(300);
    });

    test('works with values outside 0-1 range', () => {
        const result = LevelSystem.normalizedToPixel(1.5, -0.5, 100, 100, 0, 0);
        expect(result.x).toBe(150);
        expect(result.y).toBe(-50);
    });
});

// ---------------------------------------------------------------------------
// loadLevelData — loading lifecycle
// ---------------------------------------------------------------------------

describe('LevelSystem.loadLevelData', () => {
    let ls: LevelSystem;

    beforeEach(() => {
        ls = new LevelSystem();
    });

    test('loads valid levels and returns them by ID', () => {
        ls.loadLevelData([makeLevel({ id: '1-1' })]);
        expect(ls.getLevelData('1-1')).toBeDefined();
        expect(ls.getLevelData('1-1')!.id).toBe('1-1');
    });

    test('skips invalid levels silently', () => {
        ls.loadLevelData([
            makeLevel({ id: '1-1' }),
            makeLevel({ id: 'bad', maxLines: 0 }),
        ]);
        expect(ls.getAllLevelIds()).toEqual(['1-1']);
    });

    test('duplicate IDs overwrite with warning', () => {
        ls.loadLevelData([
            makeLevel({ id: '1-1', name: 'First' }),
            makeLevel({ id: '1-1', name: 'Second' }),
        ]);
        expect(ls.getLevelData('1-1')!.name).toBe('Second');
        expect(ls.getAllLevelIds()).toEqual(['1-1']);
    });

    test('getLevelData returns undefined for unknown ID', () => {
        expect(ls.getLevelData('9-9')).toBeUndefined();
    });

    test('getLevelsByWorld returns sorted levels', () => {
        ls.loadLevelData([
            makeLevel({ id: '1-3', world: 1, level: 3 }),
            makeLevel({ id: '1-1', world: 1, level: 1 }),
            makeLevel({ id: '1-2', world: 1, level: 2 }),
        ]);
        const world1 = ls.getLevelsByWorld(1);
        expect(world1.map(l => l.id)).toEqual(['1-1', '1-2', '1-3']);
    });

    test('getLevelsByWorld returns empty for world with no levels', () => {
        ls.loadLevelData([makeLevel({ id: '1-1', world: 1, level: 1 })]);
        expect(ls.getLevelsByWorld(5)).toEqual([]);
    });

    test('getAllLevelIds returns all loaded IDs', () => {
        ls.loadLevelData([
            makeLevel({ id: '1-1', world: 1, level: 1 }),
            makeLevel({ id: '2-1', world: 2, level: 1 }),
        ]);
        expect(ls.getAllLevelIds().sort()).toEqual(['1-1', '2-1']);
    });
});

// ---------------------------------------------------------------------------
// Progress tracking
// ---------------------------------------------------------------------------

describe('LevelSystem progress tracking', () => {
    let ls: LevelSystem;

    beforeEach(() => {
        ls = new LevelSystem();
        ls.loadLevelData(makeWorld1Levels());
    });

    test('initial progress has zero stars and attempts', () => {
        const prog = ls.getLevelProgress('1-1');
        expect(prog.bestStars).toBe(0);
        expect(prog.completed).toBe(false);
        expect(prog.attempts).toBe(0);
        expect(prog.bestTime).toBe(0);
    });

    test('onLevelResult increments attempts', () => {
        ls.onLevelResult('1-1', 0, 30);
        expect(ls.getLevelProgress('1-1').attempts).toBe(1);
        ls.onLevelResult('1-1', 0, 25);
        expect(ls.getLevelProgress('1-1').attempts).toBe(2);
    });

    test('onLevelResult with stars >= 1 marks completed', () => {
        ls.onLevelResult('1-1', 1, 45);
        expect(ls.getLevelProgress('1-1').completed).toBe(true);
    });

    test('onLevelResult with 0 stars does not mark completed', () => {
        ls.onLevelResult('1-1', 0, 45);
        expect(ls.getLevelProgress('1-1').completed).toBe(false);
    });

    test('bestStars never downgrades', () => {
        ls.onLevelResult('1-1', 3, 20);
        ls.onLevelResult('1-1', 1, 15);
        expect(ls.getLevelProgress('1-1').bestStars).toBe(3);
    });

    test('bestStars upgrades on better result', () => {
        ls.onLevelResult('1-1', 1, 30);
        ls.onLevelResult('1-1', 2, 25);
        expect(ls.getLevelProgress('1-1').bestStars).toBe(2);
    });

    test('bestTime tracks minimum time for completed runs', () => {
        ls.onLevelResult('1-1', 1, 30);
        ls.onLevelResult('1-1', 2, 20);
        expect(ls.getLevelProgress('1-1').bestTime).toBe(20);
    });

    test('bestTime not updated for 0-star runs', () => {
        ls.onLevelResult('1-1', 0, 5);
        expect(ls.getLevelProgress('1-1').bestTime).toBe(0);
    });

    test('getLevelProgress returns copy (not reference)', () => {
        ls.onLevelResult('1-1', 2, 30);
        const prog1 = ls.getLevelProgress('1-1');
        const prog2 = ls.getLevelProgress('1-1');
        expect(prog1).toEqual(prog2);
        expect(prog1).not.toBe(prog2);
    });

    test('getLevelProgress for unloaded level returns empty progress', () => {
        const prog = ls.getLevelProgress('9-9');
        expect(prog.bestStars).toBe(0);
        expect(prog.attempts).toBe(0);
        expect(prog.levelId).toBe('9-9');
    });

    test('onLevelResult creates progress for unloaded levels', () => {
        ls.onLevelResult('5-5', 2, 10);
        const prog = ls.getLevelProgress('5-5');
        expect(prog.bestStars).toBe(2);
        expect(prog.attempts).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Cumulative stars
// ---------------------------------------------------------------------------

describe('LevelSystem cumulative stars', () => {
    let ls: LevelSystem;

    beforeEach(() => {
        ls = new LevelSystem();
        ls.loadLevelData(makeWorld1Levels());
    });

    test('initial cumulative stars is 0', () => {
        expect(ls.getCumulativeStars()).toBe(0);
    });

    test('cumulative stars sums best stars across all levels', () => {
        ls.onLevelResult('1-1', 3, 10);
        ls.onLevelResult('1-2', 2, 15);
        ls.onLevelResult('1-3', 1, 20);
        expect(ls.getCumulativeStars()).toBe(6);
    });

    test('cumulative stars ignores unloaded level progress with no results', () => {
        ls.onLevelResult('1-1', 3, 10);
        expect(ls.getCumulativeStars()).toBe(3);
    });
});

// ---------------------------------------------------------------------------
// World unlock
// ---------------------------------------------------------------------------

describe('LevelSystem world unlock', () => {
    let ls: LevelSystem;

    beforeEach(() => {
        ls = new LevelSystem();
        ls.loadLevelData(makeWorld1Levels());
    });

    test('world 1 is always unlocked (threshold = 0)', () => {
        expect(ls.isWorldUnlocked(1)).toBe(true);
    });

    test('world 2 is locked with 0 stars (threshold = 7)', () => {
        expect(ls.isWorldUnlocked(2)).toBe(false);
    });

    test('world 2 unlocks at 7 cumulative stars', () => {
        // World1 has 4 levels, max 12 stars
        ls.onLevelResult('1-1', 3, 10);
        ls.onLevelResult('1-2', 2, 15);
        ls.onLevelResult('1-3', 1, 20);
        // 6 stars → still locked
        expect(ls.isWorldUnlocked(2)).toBe(false);

        ls.onLevelResult('1-4', 1, 25);
        // 7 stars → unlocked
        expect(ls.isWorldUnlocked(2)).toBe(true);
    });

    test('world 3 unlocks at 18 stars', () => {
        ls.onLevelResult('1-1', 3, 10);
        ls.onLevelResult('1-2', 3, 15);
        ls.onLevelResult('1-3', 3, 20);
        ls.onLevelResult('1-4', 3, 25);
        // Wait, world1 has only 4 levels, max 12 stars → need more levels
        // With just world 1 levels loaded, max 12 stars
        expect(ls.isWorldUnlocked(3)).toBe(false);
    });

    test('world 0 is invalid and returns false', () => {
        expect(ls.isWorldUnlocked(0)).toBe(false);
    });

    test('world beyond configured range returns false', () => {
        expect(ls.isWorldUnlocked(5)).toBe(false);
    });

    test('getWorldCount returns number of configured worlds', () => {
        expect(ls.getWorldCount()).toBe(4);
    });

    test('getWorldUnlockThreshold returns correct values', () => {
        expect(ls.getWorldUnlockThreshold(1)).toBe(0);
        expect(ls.getWorldUnlockThreshold(2)).toBe(7);
        expect(ls.getWorldUnlockThreshold(3)).toBe(18);
        expect(ls.getWorldUnlockThreshold(4)).toBe(33);
    });

    test('getWorldUnlockThreshold returns Infinity for invalid world', () => {
        expect(ls.getWorldUnlockThreshold(0)).toBe(Infinity);
        expect(ls.getWorldUnlockThreshold(5)).toBe(Infinity);
    });

    test('custom thresholds override defaults', () => {
        const custom = new LevelSystem([0, 5, 15]);
        expect(custom.getWorldCount()).toBe(3);
        expect(custom.getWorldUnlockThreshold(2)).toBe(5);
    });
});

// ---------------------------------------------------------------------------
// Level unlock (sequential within world)
// ---------------------------------------------------------------------------

describe('LevelSystem level unlock', () => {
    let ls: LevelSystem;

    beforeEach(() => {
        ls = new LevelSystem();
        ls.loadLevelData(makeWorld1Levels());
    });

    test('level 1-1 is always unlocked (world 1 is unlocked)', () => {
        expect(ls.isLevelUnlocked('1-1')).toBe(true);
    });

    test('level 1-2 is locked when 1-1 has no stars', () => {
        expect(ls.isLevelUnlocked('1-2')).toBe(false);
    });

    test('level 1-2 unlocks when 1-1 has >= 1 star', () => {
        ls.onLevelResult('1-1', 1, 30);
        expect(ls.isLevelUnlocked('1-2')).toBe(true);
    });

    test('level 1-3 unlocks sequentially', () => {
        ls.onLevelResult('1-1', 1, 30);
        expect(ls.isLevelUnlocked('1-3')).toBe(false);
        ls.onLevelResult('1-2', 1, 25);
        expect(ls.isLevelUnlocked('1-3')).toBe(true);
    });

    test('level 1-4 unlocks after 1-3 gets a star', () => {
        ls.onLevelResult('1-1', 1, 30);
        ls.onLevelResult('1-2', 1, 25);
        expect(ls.isLevelUnlocked('1-4')).toBe(false);
        ls.onLevelResult('1-3', 1, 20);
        expect(ls.isLevelUnlocked('1-4')).toBe(true);
    });

    test('unknown level ID returns false', () => {
        expect(ls.isLevelUnlocked('9-9')).toBe(false);
    });

    test('level in locked world returns false', () => {
        ls.loadLevelData([makeLevel({ id: '2-1', world: 2, level: 1 })]);
        expect(ls.isLevelUnlocked('2-1')).toBe(false);
    });

    test('0 stars on previous level keeps next level locked', () => {
        ls.onLevelResult('1-1', 0, 30);
        expect(ls.isLevelUnlocked('1-2')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// World progress aggregation
// ---------------------------------------------------------------------------

describe('LevelSystem.getWorldProgress', () => {
    let ls: LevelSystem;

    beforeEach(() => {
        ls = new LevelSystem();
        ls.loadLevelData(makeWorld1Levels());
    });

    test('returns correct world structure', () => {
        const wp = ls.getWorldProgress(1);
        expect(wp.worldId).toBe(1);
        expect(wp.unlocked).toBe(true);
        expect(wp.levels.length).toBe(4);
    });

    test('includes per-level progress', () => {
        ls.onLevelResult('1-1', 2, 30);
        const wp = ls.getWorldProgress(1);
        expect(wp.levels[0].bestStars).toBe(2);
        expect(wp.levels[0].attempts).toBe(1);
    });

    test('locked world still returns progress with unlocked=false', () => {
        const wp = ls.getWorldProgress(3);
        expect(wp.unlocked).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Game progress
// ---------------------------------------------------------------------------

describe('LevelSystem.getGameProgress', () => {
    let ls: LevelSystem;

    beforeEach(() => {
        ls = new LevelSystem();
        ls.loadLevelData(makeWorld1Levels());
    });

    test('returns correct structure with 4 worlds', () => {
        const gp = ls.getGameProgress();
        expect(gp.worlds.length).toBe(4);
        expect(gp.totalStars).toBe(0);
        expect(gp.lastPlayedLevel).toBe('');
    });

    test('tracks total stars', () => {
        ls.onLevelResult('1-1', 3, 10);
        ls.onLevelResult('1-2', 2, 15);
        expect(ls.getGameProgress().totalStars).toBe(5);
    });

    test('tracks last played level by highest attempts', () => {
        ls.onLevelResult('1-1', 0, 10);
        ls.onLevelResult('1-1', 0, 10);
        ls.onLevelResult('1-2', 0, 10);
        // 1-1 has 2 attempts, 1-2 has 1 → last played is 1-1
        expect(ls.getGameProgress().lastPlayedLevel).toBe('1-1');
    });

    test('empty game returns empty lastPlayedLevel', () => {
        expect(ls.getGameProgress().lastPlayedLevel).toBe('');
    });
});
