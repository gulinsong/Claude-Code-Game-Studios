/**
 * SaveSystem unit tests.
 *
 * Tests level progress tracking, star accumulation, world/level unlock
 * logic, persistence callbacks, and reset behavior.
 */

import { SaveSystem } from '../../../src/core/SaveSystem';

describe('SaveSystem', () => {

    let save: SaveSystem;

    beforeEach(() => {
        save = new SaveSystem();
    });

    // ============================================================
    // Initial state
    // ============================================================

    describe('initial state', () => {
        test('starts with empty levels', () => {
            const state = save.getState();
            expect(Object.keys(state.levels).length).toBe(0);
        });

        test('starts with no last played level', () => {
            expect(save.getLastPlayedLevel()).toBeNull();
        });

        test('starts not dirty', () => {
            expect(save.isDirty()).toBe(false);
        });

        test('cumulative stars is zero', () => {
            expect(save.getCumulativeStars()).toBe(0);
        });
    });

    // ============================================================
    // Level results
    // ============================================================

    describe('updateLevelResult', () => {
        test('records first completion', () => {
            const improved = save.updateLevelResult('1-1', 2);
            expect(improved).toBe(true);
            expect(save.getBestStars('1-1')).toBe(2);
            expect(save.getLevelData('1-1').completed).toBe(true);
        });

        test('records zero stars as not completed', () => {
            save.updateLevelResult('1-1', 0);
            expect(save.getLevelData('1-1').completed).toBe(false);
            expect(save.getBestStars('1-1')).toBe(0);
        });

        test('updates best stars when improved', () => {
            save.updateLevelResult('1-1', 1);
            const improved = save.updateLevelResult('1-1', 3);
            expect(improved).toBe(true);
            expect(save.getBestStars('1-1')).toBe(3);
        });

        test('does not lower best stars', () => {
            save.updateLevelResult('1-1', 3);
            const improved = save.updateLevelResult('1-1', 1);
            expect(improved).toBe(false);
            expect(save.getBestStars('1-1')).toBe(3);
        });

        test('sets last played level', () => {
            save.updateLevelResult('1-3', 2);
            expect(save.getLastPlayedLevel()).toBe('1-3');
        });

        test('marks dirty on change', () => {
            save.updateLevelResult('1-1', 1);
            expect(save.isDirty()).toBe(true);
        });
    });

    // ============================================================
    // Cumulative stars
    // ============================================================

    describe('cumulative stars', () => {
        test('sums stars across all levels', () => {
            save.updateLevelResult('1-1', 3);
            save.updateLevelResult('1-2', 2);
            save.updateLevelResult('1-3', 1);
            expect(save.getCumulativeStars()).toBe(6);
        });

        test('world stars only counts levels in that world', () => {
            save.updateLevelResult('1-1', 3);
            save.updateLevelResult('1-2', 2);
            save.updateLevelResult('2-1', 1);
            expect(save.getWorldStars(1)).toBe(5);
            expect(save.getWorldStars(2)).toBe(1);
        });

        test('zero for world with no progress', () => {
            expect(save.getWorldStars(3)).toBe(0);
        });
    });

    // ============================================================
    // World unlock
    // ============================================================

    describe('world unlock', () => {
        test('world 1 is always unlocked', () => {
            expect(save.isWorldUnlocked(1)).toBe(true);
        });

        test('world 2 locked with insufficient stars', () => {
            save.updateLevelResult('1-1', 3);
            expect(save.isWorldUnlocked(2)).toBe(false);
        });

        test('world 2 unlocked with 7+ stars', () => {
            for (let i = 1; i <= 3; i++) {
                save.updateLevelResult(`1-${i}`, 3);
            }
            expect(save.getCumulativeStars()).toBe(9);
            expect(save.isWorldUnlocked(2)).toBe(true);
        });

        test('world 3 requires 18 stars', () => {
            expect(save.isWorldUnlocked(3)).toBe(false);
        });

        test('world 4 requires 33 stars', () => {
            expect(save.isWorldUnlocked(4)).toBe(false);
        });
    });

    // ============================================================
    // Level unlock
    // ============================================================

    describe('level unlock', () => {
        test('level 1-1 is unlocked (world 1, first level)', () => {
            expect(save.isLevelUnlocked('1-1')).toBe(true);
        });

        test('level 1-2 is locked before 1-1 is completed', () => {
            expect(save.isLevelUnlocked('1-2')).toBe(false);
        });

        test('level 1-2 unlocks after 1-1 completed', () => {
            save.updateLevelResult('1-1', 1);
            expect(save.isLevelUnlocked('1-2')).toBe(true);
        });

        test('completed level is always unlocked', () => {
            save.updateLevelResult('1-3', 2);
            expect(save.isLevelUnlocked('1-3')).toBe(true);
        });

        test('2-1 unlocked when world 2 is unlocked', () => {
            for (let i = 1; i <= 3; i++) {
                save.updateLevelResult(`1-${i}`, 3);
            }
            expect(save.isLevelUnlocked('2-1')).toBe(true);
        });
    });

    // ============================================================
    // Persistence
    // ============================================================

    describe('persistence', () => {
        test('save calls onPersist callback', () => {
            let persisted: unknown = null;
            save.onPersist = (state) => persisted = state;
            save.updateLevelResult('1-1', 3);
            save.save();
            expect(persisted).not.toBeNull();
            expect((persisted as any).levels['1-1'].bestStars).toBe(3);
        });

        test('save clears dirty flag', () => {
            save.onPersist = () => {};
            save.updateLevelResult('1-1', 1);
            expect(save.isDirty()).toBe(true);
            save.save();
            expect(save.isDirty()).toBe(false);
        });

        test('load restores state from callback', () => {
            save.onLoad = () => ({
                version: 1,
                levels: { '1-1': { completed: true, bestStars: 3 } },
                lastPlayedLevel: '1-1',
            });
            const loaded = save.load();
            expect(loaded).toBe(true);
            expect(save.getBestStars('1-1')).toBe(3);
            expect(save.getLastPlayedLevel()).toBe('1-1');
        });

        test('load returns false without callback', () => {
            expect(save.load()).toBe(false);
        });

        test('load returns false when callback returns null', () => {
            save.onLoad = () => null;
            expect(save.load()).toBe(false);
        });
    });

    // ============================================================
    // Reset
    // ============================================================

    describe('reset', () => {
        test('clears all progress', () => {
            save.updateLevelResult('1-1', 3);
            save.updateLevelResult('1-2', 2);
            save.reset();
            expect(save.getCumulativeStars()).toBe(0);
            expect(save.getLastPlayedLevel()).toBeNull();
            expect(save.getBestStars('1-1')).toBe(0);
        });

        test('marks dirty', () => {
            save.reset();
            expect(save.isDirty()).toBe(true);
        });
    });

    // ============================================================
    // setLastPlayedLevel
    // ============================================================

    describe('setLastPlayedLevel', () => {
        test('updates last played level', () => {
            save.setLastPlayedLevel('2-3');
            expect(save.getLastPlayedLevel()).toBe('2-3');
        });
    });
});
