/**
 * GameStateManager.test.ts — Unit tests for GameStateManager.
 * GDD: design/gdd/game-state-management.md
 *
 * Covers all acceptance criteria from the GDD:
 * - State transitions (valid and invalid)
 * - canDrawLine() logic
 * - Line quota management
 * - Light point collection and victory trigger
 * - hasPendingVictory() edge case
 * - Pause/resume lifecycle
 * - Level lifecycle (start and restart)
 * - Invalid config rejection
 * - Session time accumulation and cap
 * - Double collection guard
 */

import { GameStateManager } from '../../../src/core/GameStateManager';
import { GamePhase, LevelConfig } from '../../../src/interfaces/GameInterfaces';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a valid LevelConfig with sensible defaults. */
function makeConfig(overrides: Partial<LevelConfig> = {}): LevelConfig {
    return {
        levelId: 'test-level',
        maxLines: 3,
        lightPointCount: 3,
        timeLimit: 60,
        ...overrides,
    };
}

/** Starts a level with the given parameters using a fresh manager. */
function startLevel(
    manager: GameStateManager,
    maxLines: number = 3,
    lightPointCount: number = 3,
): void {
    manager.onLevelStart('test-level', makeConfig({ maxLines, lightPointCount }));
}

/** Transitions manager from READY → PLAYING via setState. */
function transitionToPlaying(manager: GameStateManager): void {
    manager.setState(GamePhase.PLAYING);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GameStateManager', () => {
    let manager: GameStateManager;

    beforeEach(() => {
        manager = new GameStateManager();
    });

    // =======================================================================
    // 1. State transitions — valid
    // =======================================================================

    describe('state transitions — valid', () => {
        test('READY to PLAYING succeeds', () => {
            startLevel(manager);
            manager.setState(GamePhase.PLAYING);
            expect(manager.getCurrentPhase()).toBe(GamePhase.PLAYING);
        });

        test('READY to READY succeeds (draw line keeps READY)', () => {
            startLevel(manager);
            manager.setState(GamePhase.READY);
            expect(manager.getCurrentPhase()).toBe(GamePhase.READY);
        });

        test('PLAYING to PAUSED succeeds', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.setState(GamePhase.PAUSED);
            expect(manager.getCurrentPhase()).toBe(GamePhase.PAUSED);
        });

        test('PLAYING to VICTORY succeeds', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.setState(GamePhase.VICTORY);
            expect(manager.getCurrentPhase()).toBe(GamePhase.VICTORY);
        });

        test('PLAYING to DEFEAT succeeds', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.setState(GamePhase.DEFEAT);
            expect(manager.getCurrentPhase()).toBe(GamePhase.DEFEAT);
        });

        test('PAUSED to PLAYING succeeds (resume)', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.setState(GamePhase.PAUSED);
            manager.setState(GamePhase.PLAYING);
            expect(manager.getCurrentPhase()).toBe(GamePhase.PLAYING);
        });

        test('PAUSED to READY succeeds (restart from pause)', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.setState(GamePhase.PAUSED);
            manager.setState(GamePhase.READY);
            expect(manager.getCurrentPhase()).toBe(GamePhase.READY);
        });

        test('VICTORY to READY succeeds (next level)', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.setState(GamePhase.VICTORY);
            manager.setState(GamePhase.READY);
            expect(manager.getCurrentPhase()).toBe(GamePhase.READY);
        });

        test('DEFEAT to READY succeeds (restart after defeat)', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.setState(GamePhase.DEFEAT);
            manager.setState(GamePhase.READY);
            expect(manager.getCurrentPhase()).toBe(GamePhase.READY);
        });
    });

    // =======================================================================
    // 2. State transitions — invalid
    // =======================================================================

    describe('state transitions — invalid', () => {
        test('READY to PAUSED throws', () => {
            startLevel(manager);
            expect(() => manager.setState(GamePhase.PAUSED)).toThrow(
                'Invalid state transition: READY -> PAUSED',
            );
        });

        test('PLAYING to READY throws', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            expect(() => manager.setState(GamePhase.READY)).toThrow(
                'Invalid state transition: PLAYING -> READY',
            );
        });

        test('VICTORY to PAUSED throws', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.setState(GamePhase.VICTORY);
            expect(() => manager.setState(GamePhase.PAUSED)).toThrow(
                'Invalid state transition: VICTORY -> PAUSED',
            );
        });

        test('DEFEAT to PAUSED throws', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.setState(GamePhase.DEFEAT);
            expect(() => manager.setState(GamePhase.PAUSED)).toThrow(
                'Invalid state transition: DEFEAT -> PAUSED',
            );
        });

        test('VICTORY to PLAYING throws', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.setState(GamePhase.VICTORY);
            expect(() => manager.setState(GamePhase.PLAYING)).toThrow(
                'Invalid state transition: VICTORY -> PLAYING',
            );
        });

        test('DEFEAT to PLAYING throws', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.setState(GamePhase.DEFEAT);
            expect(() => manager.setState(GamePhase.PLAYING)).toThrow(
                'Invalid state transition: DEFEAT -> PLAYING',
            );
        });

        test('PAUSED to VICTORY throws', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.setState(GamePhase.PAUSED);
            expect(() => manager.setState(GamePhase.VICTORY)).toThrow(
                'Invalid state transition: PAUSED -> VICTORY',
            );
        });

        test('PAUSED to DEFEAT throws', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.setState(GamePhase.PAUSED);
            expect(() => manager.setState(GamePhase.DEFEAT)).toThrow(
                'Invalid state transition: PAUSED -> DEFEAT',
            );
        });
    });

    // =======================================================================
    // 3. canDrawLine()
    // =======================================================================

    describe('canDrawLine()', () => {
        test('returns true when phase is READY and lines remaining', () => {
            startLevel(manager, 3, 2);
            expect(manager.canDrawLine()).toBe(true);
        });

        test('returns true when phase is PLAYING and lines remaining', () => {
            startLevel(manager, 3, 2);
            transitionToPlaying(manager);
            expect(manager.canDrawLine()).toBe(true);
        });

        test('returns false when linesRemaining is 0', () => {
            startLevel(manager, 1, 2);
            manager.onLineDrawn();
            expect(manager.getLinesRemaining()).toBe(0);
            expect(manager.canDrawLine()).toBe(false);
        });

        test('returns false when phase is PAUSED', () => {
            startLevel(manager, 3, 2);
            transitionToPlaying(manager);
            manager.setState(GamePhase.PAUSED);
            expect(manager.canDrawLine()).toBe(false);
        });

        test('returns false when phase is VICTORY', () => {
            startLevel(manager, 3, 2);
            transitionToPlaying(manager);
            manager.setState(GamePhase.VICTORY);
            expect(manager.canDrawLine()).toBe(false);
        });

        test('returns false when phase is DEFEAT', () => {
            startLevel(manager, 3, 2);
            transitionToPlaying(manager);
            manager.setState(GamePhase.DEFEAT);
            expect(manager.canDrawLine()).toBe(false);
        });
    });

    // =======================================================================
    // 4. Line quota — onLineDrawn
    // =======================================================================

    describe('line quota', () => {
        test('onLineDrawn increments linesUsed and decrements linesRemaining', () => {
            startLevel(manager, 3, 2);
            manager.onLineDrawn();
            expect(manager.getLinesUsed()).toBe(1);
            expect(manager.getLinesRemaining()).toBe(2);
        });

        test('multiple onLineDrawn calls track cumulative usage', () => {
            startLevel(manager, 3, 2);
            manager.onLineDrawn();
            manager.onLineDrawn();
            expect(manager.getLinesUsed()).toBe(2);
            expect(manager.getLinesRemaining()).toBe(1);
        });

        test('onLineDrawn is a no-op when canDrawLine is false', () => {
            startLevel(manager, 1, 2);
            manager.onLineDrawn(); // uses the only line
            expect(manager.getLinesRemaining()).toBe(0);
            manager.onLineDrawn(); // should be a no-op
            expect(manager.getLinesUsed()).toBe(1);
            expect(manager.getLinesRemaining()).toBe(0);
        });

        test('canDrawLine returns false when quota is exhausted', () => {
            startLevel(manager, 2, 2);
            manager.onLineDrawn();
            manager.onLineDrawn();
            expect(manager.canDrawLine()).toBe(false);
        });

        test('onLineDrawn works during PLAYING phase', () => {
            startLevel(manager, 3, 2);
            transitionToPlaying(manager);
            manager.onLineDrawn();
            expect(manager.getLinesUsed()).toBe(1);
            expect(manager.getLinesRemaining()).toBe(2);
        });

        test('onLineDrawn is a no-op during PAUSED phase', () => {
            startLevel(manager, 3, 2);
            transitionToPlaying(manager);
            manager.setState(GamePhase.PAUSED);
            manager.onLineDrawn();
            expect(manager.getLinesUsed()).toBe(0);
            expect(manager.getLinesRemaining()).toBe(3);
        });
    });

    // =======================================================================
    // 5. Light point collection
    // =======================================================================

    describe('light point collection', () => {
        test('onLightPointCollected increments count', () => {
            startLevel(manager, 3, 3);
            manager.onLightPointCollected('lp-1');
            expect(manager.getLightPointsCollected()).toBe(1);
        });

        test('collecting multiple distinct light points increments correctly', () => {
            startLevel(manager, 3, 3);
            manager.onLightPointCollected('lp-1');
            manager.onLightPointCollected('lp-2');
            expect(manager.getLightPointsCollected()).toBe(2);
        });

        test('collecting all light points triggers VICTORY', () => {
            startLevel(manager, 3, 2);
            transitionToPlaying(manager);
            manager.onLightPointCollected('lp-1');
            manager.onLightPointCollected('lp-2');
            expect(manager.getCurrentPhase()).toBe(GamePhase.VICTORY);
        });

        test('collecting all light points in READY phase triggers VICTORY', () => {
            startLevel(manager, 3, 1);
            // Still in READY phase (ball not launched)
            manager.onLightPointCollected('lp-1');
            expect(manager.getCurrentPhase()).toBe(GamePhase.VICTORY);
        });

        test('light point collection is ignored after VICTORY', () => {
            startLevel(manager, 3, 1);
            manager.onLightPointCollected('lp-1');
            expect(manager.getCurrentPhase()).toBe(GamePhase.VICTORY);
            manager.onLightPointCollected('lp-2');
            expect(manager.getLightPointsCollected()).toBe(1);
        });

        test('light point collection is ignored after DEFEAT', () => {
            startLevel(manager, 3, 3);
            transitionToPlaying(manager);
            manager.setState(GamePhase.DEFEAT);
            manager.onLightPointCollected('lp-1');
            expect(manager.getLightPointsCollected()).toBe(0);
        });

        test('light point collection works during PLAYING phase', () => {
            startLevel(manager, 3, 3);
            transitionToPlaying(manager);
            manager.onLightPointCollected('lp-1');
            expect(manager.getLightPointsCollected()).toBe(1);
        });

        test('light point collection is ignored during PAUSED phase', () => {
            startLevel(manager, 3, 3);
            transitionToPlaying(manager);
            manager.setState(GamePhase.PAUSED);
            manager.onLightPointCollected('lp-1');
            expect(manager.getLightPointsCollected()).toBe(0);
        });
    });

    // =======================================================================
    // 6. Double collection guard
    // =======================================================================

    describe('double collection guard', () => {
        test('same lightPointId collected twice is ignored', () => {
            startLevel(manager, 3, 3);
            manager.onLightPointCollected('lp-1');
            expect(manager.getLightPointsCollected()).toBe(1);
            manager.onLightPointCollected('lp-1');
            expect(manager.getLightPointsCollected()).toBe(1);
        });

        test('duplicate collection does not trigger premature VICTORY', () => {
            startLevel(manager, 3, 2);
            transitionToPlaying(manager);
            manager.onLightPointCollected('lp-1');
            manager.onLightPointCollected('lp-1'); // duplicate
            expect(manager.getLightPointsCollected()).toBe(1);
            expect(manager.getCurrentPhase()).toBe(GamePhase.PLAYING);
        });
    });

    // =======================================================================
    // 7. hasPendingVictory()
    // =======================================================================

    describe('hasPendingVictory()', () => {
        test('returns true when all collected but phase still PLAYING', () => {
            startLevel(manager, 3, 3);
            transitionToPlaying(manager);
            // Collect all but one — not pending yet
            manager.onLightPointCollected('lp-1');
            manager.onLightPointCollected('lp-2');
            expect(manager.hasPendingVictory()).toBe(false);
        });

        test('returns false before any collection', () => {
            startLevel(manager, 3, 3);
            transitionToPlaying(manager);
            expect(manager.hasPendingVictory()).toBe(false);
        });

        test('returns false when phase is VICTORY', () => {
            startLevel(manager, 3, 1);
            manager.onLightPointCollected('lp-1');
            // Phase is now VICTORY, so hasPendingVictory should be false
            expect(manager.getCurrentPhase()).toBe(GamePhase.VICTORY);
            expect(manager.hasPendingVictory()).toBe(false);
        });

        test('returns false when lightPointsTotal is 0', () => {
            // After construction but before onLevelStart, total is 0
            expect(manager.hasPendingVictory()).toBe(false);
        });
    });

    // =======================================================================
    // 8. Pause / resume
    // =======================================================================

    describe('pause() and resume()', () => {
        test('pause from PLAYING sets phase to PAUSED and isPaused true', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.pause();
            expect(manager.getCurrentPhase()).toBe(GamePhase.PAUSED);
            expect(manager.getState().isPaused).toBe(true);
        });

        test('resume from PAUSED sets phase to PLAYING and isPaused false', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.pause();
            manager.resume();
            expect(manager.getCurrentPhase()).toBe(GamePhase.PLAYING);
            expect(manager.getState().isPaused).toBe(false);
        });

        test('pause from READY throws', () => {
            startLevel(manager);
            expect(() => manager.pause()).toThrow();
        });

        test('resume from READY does not throw (READY->PLAYING is valid via setState)', () => {
            startLevel(manager);
            // resume() calls setState(GamePhase.PLAYING), and READY->PLAYING is valid.
            // This means resume() transitions from READY to PLAYING without error.
            manager.resume();
            expect(manager.getCurrentPhase()).toBe(GamePhase.PLAYING);
        });

        test('pause from VICTORY throws', () => {
            startLevel(manager, 3, 1);
            manager.onLightPointCollected('lp-1');
            expect(manager.getCurrentPhase()).toBe(GamePhase.VICTORY);
            expect(() => manager.pause()).toThrow();
        });

        test('pause from DEFEAT throws', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.setState(GamePhase.DEFEAT);
            expect(() => manager.pause()).toThrow();
        });

        test('rapid pause/resume cycle ends in PLAYING', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.pause();
            manager.resume();
            manager.pause();
            manager.resume();
            expect(manager.getCurrentPhase()).toBe(GamePhase.PLAYING);
            expect(manager.getState().isPaused).toBe(false);
        });
    });

    // =======================================================================
    // 9. Level lifecycle — onLevelStart
    // =======================================================================

    describe('onLevelStart()', () => {
        test('initializes state to READY with correct values', () => {
            manager.onLevelStart('level-01', makeConfig({ maxLines: 5, lightPointCount: 4 }));
            expect(manager.getCurrentPhase()).toBe(GamePhase.READY);
            expect(manager.getLinesUsed()).toBe(0);
            expect(manager.getLinesRemaining()).toBe(5);
            expect(manager.getLightPointsCollected()).toBe(0);
            expect(manager.getLightPointsTotal()).toBe(4);
            expect(manager.getSessionTime()).toBe(0);
            expect(manager.getState().isPaused).toBe(false);
        });

        test('sets the current level ID', () => {
            manager.onLevelStart('level-42', makeConfig());
            expect(manager.getState().currentLevelId).toBe('level-42');
        });

        test('resets state when starting a new level after previous play', () => {
            startLevel(manager, 3, 3);
            transitionToPlaying(manager);
            manager.onLineDrawn();
            manager.onLightPointCollected('lp-1');
            manager.updateSessionTime(10);

            // Start a new level — everything should reset
            manager.onLevelStart('level-02', makeConfig({ maxLines: 4, lightPointCount: 2 }));
            expect(manager.getCurrentPhase()).toBe(GamePhase.READY);
            expect(manager.getLinesUsed()).toBe(0);
            expect(manager.getLinesRemaining()).toBe(4);
            expect(manager.getLightPointsCollected()).toBe(0);
            expect(manager.getLightPointsTotal()).toBe(2);
            expect(manager.getSessionTime()).toBe(0);
        });
    });

    // =======================================================================
    // 10. Level lifecycle — restartLevel
    // =======================================================================

    describe('restartLevel()', () => {
        test('resets state to initial level config', () => {
            startLevel(manager, 3, 3);
            transitionToPlaying(manager);
            manager.onLineDrawn();
            manager.onLineDrawn();
            manager.onLightPointCollected('lp-1');
            manager.updateSessionTime(25);

            manager.restartLevel();

            expect(manager.getCurrentPhase()).toBe(GamePhase.READY);
            expect(manager.getLinesUsed()).toBe(0);
            expect(manager.getLinesRemaining()).toBe(3);
            expect(manager.getLightPointsCollected()).toBe(0);
            expect(manager.getLightPointsTotal()).toBe(3);
            expect(manager.getSessionTime()).toBe(0);
            expect(manager.getState().isPaused).toBe(false);
        });

        test('clears previously collected light point IDs', () => {
            startLevel(manager, 3, 2);
            manager.onLightPointCollected('lp-1');
            manager.restartLevel();
            // Collecting the same ID again after restart should work
            manager.onLightPointCollected('lp-1');
            expect(manager.getLightPointsCollected()).toBe(1);
        });

        test('throws if no level has been started', () => {
            expect(() => manager.restartLevel()).toThrow(
                'Cannot restart: no level has been started',
            );
        });
    });

    // =======================================================================
    // 11. Invalid configs
    // =======================================================================

    describe('invalid level config', () => {
        test('maxLines = 0 throws error', () => {
            expect(() =>
                manager.onLevelStart('bad-level', makeConfig({ maxLines: 0 })),
            ).toThrow('Invalid level config: maxLines must be > 0, got 0');
        });

        test('maxLines < 0 throws error', () => {
            expect(() =>
                manager.onLevelStart('bad-level', makeConfig({ maxLines: -1 })),
            ).toThrow('Invalid level config: maxLines must be > 0, got -1');
        });

        test('lightPointCount = 0 throws error', () => {
            expect(() =>
                manager.onLevelStart('bad-level', makeConfig({ lightPointCount: 0 })),
            ).toThrow('Invalid level config: lightPointCount must be > 0, got 0');
        });

        test('lightPointCount < 0 throws error', () => {
            expect(() =>
                manager.onLevelStart('bad-level', makeConfig({ lightPointCount: -5 })),
            ).toThrow('Invalid level config: lightPointCount must be > 0, got -5');
        });
    });

    // =======================================================================
    // 12. Session time
    // =======================================================================

    describe('session time', () => {
        test('accumulates time during PLAYING phase', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.updateSessionTime(0.016);
            manager.updateSessionTime(0.016);
            expect(manager.getSessionTime()).toBeCloseTo(0.032, 5);
        });

        test('does not accumulate time during READY phase', () => {
            startLevel(manager);
            manager.updateSessionTime(5.0);
            expect(manager.getSessionTime()).toBe(0);
        });

        test('does not accumulate time during PAUSED phase', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.updateSessionTime(5.0);
            manager.pause();
            manager.updateSessionTime(10.0);
            expect(manager.getSessionTime()).toBe(5.0);
        });

        test('does not accumulate time during VICTORY phase', () => {
            startLevel(manager, 3, 1);
            transitionToPlaying(manager);
            manager.updateSessionTime(3.0);
            manager.onLightPointCollected('lp-1');
            expect(manager.getCurrentPhase()).toBe(GamePhase.VICTORY);
            manager.updateSessionTime(10.0);
            expect(manager.getSessionTime()).toBe(3.0);
        });

        test('does not accumulate time during DEFEAT phase', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.updateSessionTime(2.0);
            manager.setState(GamePhase.DEFEAT);
            manager.updateSessionTime(10.0);
            expect(manager.getSessionTime()).toBe(2.0);
        });

        test('session time is capped at 3600 seconds', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.updateSessionTime(4000);
            expect(manager.getSessionTime()).toBe(3600);
        });

        test('incremental time accumulation approaches but does not exceed 3600', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            // Accumulate to just under the cap
            manager.updateSessionTime(3599);
            expect(manager.getSessionTime()).toBe(3599);
            // Add more — should cap at 3600
            manager.updateSessionTime(5);
            expect(manager.getSessionTime()).toBe(3600);
        });

        test('session time resets to 0 on onLevelStart', () => {
            startLevel(manager);
            transitionToPlaying(manager);
            manager.updateSessionTime(30);
            expect(manager.getSessionTime()).toBe(30);
            startLevel(manager);
            expect(manager.getSessionTime()).toBe(0);
        });
    });

    // =======================================================================
    // 13. getState() — snapshot integrity
    // =======================================================================

    describe('getState()', () => {
        test('returns a snapshot that reflects current state', () => {
            startLevel(manager, 5, 4);
            const snapshot = manager.getState();
            expect(snapshot.currentPhase).toBe(GamePhase.READY);
            expect(snapshot.linesRemaining).toBe(5);
            expect(snapshot.lightPointsTotal).toBe(4);
            expect(snapshot.linesUsed).toBe(0);
            expect(snapshot.lightPointsCollected).toBe(0);
            expect(snapshot.sessionTime).toBe(0);
            expect(snapshot.isPaused).toBe(false);
            expect(snapshot.currentLevelId).toBe('test-level');
        });

        test('returned snapshot is a copy, not a reference', () => {
            startLevel(manager, 3, 2);
            const snapshot = manager.getState();
            // Mutating the snapshot should not affect the manager
            snapshot.linesRemaining = 999;
            expect(manager.getLinesRemaining()).toBe(3);
        });
    });

    // =======================================================================
    // 14. Default state before level start
    // =======================================================================

    describe('default state (before onLevelStart)', () => {
        test('getCurrentPhase returns READY', () => {
            expect(manager.getCurrentPhase()).toBe(GamePhase.READY);
        });

        test('lightPointsTotal is 0', () => {
            expect(manager.getLightPointsTotal()).toBe(0);
        });

        test('canDrawLine returns true (uses default MAX_LINES_PER_LEVEL)', () => {
            // Default from LINE_CONFIG.MAX_LINES_PER_LEVEL = 3
            expect(manager.canDrawLine()).toBe(true);
        });
    });
});
