/**
 * GameStateManager.ts — Central game state management system.
 * GDD: design/gdd/game-state-management.md
 *
 * Manages game phase, line quotas, light point collection counts,
 * and session time. This is a pure logic class with no engine dependencies.
 */

import { GamePhase, GameState, LevelConfig } from '../interfaces/GameInterfaces';
import { LINE_CONFIG } from '../config/GameConfig';

/** Maximum session time in seconds (1 hour). */
const MAX_SESSION_TIME = 3600;

/**
 * Valid state transition map derived from the GDD transition table.
 * Each key is a `from` phase; each value is the set of allowed `to` phases.
 */
const VALID_TRANSITIONS: Readonly<Record<GamePhase, ReadonlySet<GamePhase>>> = {
    [GamePhase.READY]: new Set([
        GamePhase.READY,     // draw line (stays in READY)
        GamePhase.PLAYING,   // launch ball
    ]),
    [GamePhase.PLAYING]: new Set([
        GamePhase.PLAYING,   // draw line with quota (stays in PLAYING)
        GamePhase.PAUSED,    // pause
        GamePhase.VICTORY,   // all light points collected
        GamePhase.DEFEAT,    // ball out of bounds
    ]),
    [GamePhase.PAUSED]: new Set([
        GamePhase.PLAYING,   // resume
        GamePhase.READY,     // restart level
    ]),
    [GamePhase.VICTORY]: new Set([
        GamePhase.READY,     // next level / restart
    ]),
    [GamePhase.DEFEAT]: new Set([
        GamePhase.READY,     // restart
    ]),
};

/**
 * Manages all runtime game state: phase, line quotas, light point
 * collection, and session time. Acts as the "central brain" for
 * game logic, providing state query interfaces for other systems.
 */
export class GameStateManager {
    private state: GameState;
    private levelConfig: LevelConfig | null;
    private collectedLightPointIds: Set<string>;

    constructor() {
        this.levelConfig = null;
        this.collectedLightPointIds = new Set();
        this.state = this.createDefaultState();
    }

    // ----------------------------------------------------------------
    // Phase management
    // ----------------------------------------------------------------

    /**
     * Returns the current game phase.
     */
    getCurrentPhase(): GamePhase {
        return this.state.currentPhase;
    }

    /**
     * Attempts to transition to the given phase.
     * Throws if the transition is not valid per the GDD transition table.
     */
    setState(phase: GamePhase): void {
        const allowed = VALID_TRANSITIONS[this.state.currentPhase];
        if (!allowed.has(phase)) {
            throw new Error(
                `Invalid state transition: ${this.state.currentPhase} -> ${phase}`
            );
        }
        this.state.currentPhase = phase;
        this.state.isPaused = (phase === GamePhase.PAUSED);
    }

    /**
     * Returns true when the player is allowed to draw a line.
     * Conditions: phase is READY or PLAYING, and linesRemaining > 0.
     */
    canDrawLine(): boolean {
        const isActive = this.state.currentPhase === GamePhase.READY
            || this.state.currentPhase === GamePhase.PLAYING;
        return isActive && this.state.linesRemaining > 0;
    }

    /**
     * Returns true when a victory condition has been met in the current frame
     * and should take priority over a simultaneous defeat event.
     *
     * Victory is "pending" when all light points have been collected and the
     * current phase is still PLAYING (before the VICTORY transition completes).
     */
    hasPendingVictory(): boolean {
        return this.state.currentPhase === GamePhase.PLAYING
            && this.state.lightPointsCollected === this.state.lightPointsTotal
            && this.state.lightPointsTotal > 0;
    }

    // ----------------------------------------------------------------
    // Level lifecycle
    // ----------------------------------------------------------------

    /**
     * Initializes state for a new level. Throws if the config is invalid
     * (maxLines <= 0 or lightPointCount <= 0).
     */
    onLevelStart(levelId: string, config: LevelConfig): void {
        if (config.maxLines <= 0) {
            throw new Error(
                `Invalid level config: maxLines must be > 0, got ${config.maxLines}`
            );
        }
        if (config.lightPointCount <= 0) {
            throw new Error(
                `Invalid level config: lightPointCount must be > 0, got ${config.lightPointCount}`
            );
        }

        this.levelConfig = config;
        this.collectedLightPointIds.clear();

        this.state.currentPhase = GamePhase.READY;
        this.state.currentLevelId = levelId;
        this.state.linesUsed = 0;
        this.state.linesRemaining = config.maxLines;
        this.state.lightPointsCollected = 0;
        this.state.lightPointsTotal = config.lightPointCount;
        this.state.sessionTime = 0;
        this.state.isPaused = false;
    }

    /**
     * Resets the level to its initial state using the same config.
     * Throws if no level has been started yet.
     */
    restartLevel(): void {
        if (!this.levelConfig) {
            throw new Error('Cannot restart: no level has been started');
        }
        this.onLevelStart(this.levelConfig.levelId, this.levelConfig);
    }

    // ----------------------------------------------------------------
    // Line quota
    // ----------------------------------------------------------------

    /**
     * Records that a line has been drawn. Increments linesUsed and
     * decrements linesRemaining. No-op if canDrawLine() is false.
     */
    onLineDrawn(): void {
        if (!this.canDrawLine()) {
            return;
        }
        this.state.linesUsed++;
        this.state.linesRemaining--;
    }

    /**
     * Returns the number of lines used in the current level.
     */
    getLinesUsed(): number {
        return this.state.linesUsed;
    }

    /**
     * Returns the number of lines remaining in the current level quota.
     */
    getLinesRemaining(): number {
        return this.state.linesRemaining;
    }

    // ----------------------------------------------------------------
    // Light point collection
    // ----------------------------------------------------------------

    /**
     * Records that a light point has been collected. Ignores duplicate IDs
     * and events received after VICTORY or DEFEAT.
     *
     * When all light points are collected, sets phase to VICTORY.
     */
    onLightPointCollected(lightPointId: string): void {
        // Ignore events after the game has ended
        if (this.state.currentPhase === GamePhase.VICTORY
            || this.state.currentPhase === GamePhase.DEFEAT) {
            return;
        }

        // Ignore duplicate collection of the same light point
        if (this.collectedLightPointIds.has(lightPointId)) {
            return;
        }

        // Only accept collection during active gameplay phases
        if (this.state.currentPhase !== GamePhase.READY
            && this.state.currentPhase !== GamePhase.PLAYING) {
            return;
        }

        this.collectedLightPointIds.add(lightPointId);
        this.state.lightPointsCollected++;

        // Check victory condition
        if (this.state.lightPointsCollected === this.state.lightPointsTotal) {
            this.state.currentPhase = GamePhase.VICTORY;
            this.state.isPaused = false;
        }
    }

    /**
     * Returns the number of light points collected in the current level.
     */
    getLightPointsCollected(): number {
        return this.state.lightPointsCollected;
    }

    /**
     * Returns the total number of light points in the current level.
     */
    getLightPointsTotal(): number {
        return this.state.lightPointsTotal;
    }

    // ----------------------------------------------------------------
    // Pause / resume
    // ----------------------------------------------------------------

    /**
     * Pauses the game. Only valid from PLAYING phase; throws otherwise.
     */
    pause(): void {
        this.setState(GamePhase.PAUSED);
    }

    /**
     * Resumes the game from pause. Only valid from PAUSED phase; throws otherwise.
     */
    resume(): void {
        this.setState(GamePhase.PLAYING);
    }

    // ----------------------------------------------------------------
    // Time
    // ----------------------------------------------------------------

    /**
     * Accumulates session time. Only counts when the phase is PLAYING.
     * Session time is capped at MAX_SESSION_TIME (3600 seconds).
     */
    updateSessionTime(deltaTime: number): void {
        if (this.state.currentPhase !== GamePhase.PLAYING) {
            return;
        }
        this.state.sessionTime = Math.min(
            this.state.sessionTime + deltaTime,
            MAX_SESSION_TIME
        );
    }

    /**
     * Returns the elapsed session time for the current level, in seconds.
     */
    getSessionTime(): number {
        return this.state.sessionTime;
    }

    // ----------------------------------------------------------------
    // Full state access
    // ----------------------------------------------------------------

    /**
     * Returns a shallow copy of the current game state snapshot.
     * Callers can read freely without affecting internal state.
     */
    getState(): GameState {
        return { ...this.state };
    }

    // ----------------------------------------------------------------
    // Private helpers
    // ----------------------------------------------------------------

    /**
     * Creates a default GameState with sensible initial values.
     * Used before any level has been loaded.
     */
    private createDefaultState(): GameState {
        return {
            currentPhase: GamePhase.READY,
            currentLevelId: '',
            linesUsed: 0,
            linesRemaining: LINE_CONFIG.MAX_LINES_PER_LEVEL,
            lightPointsCollected: 0,
            lightPointsTotal: 0,
            sessionTime: 0,
            isPaused: false,
        };
    }
}
