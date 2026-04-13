/**
 * SaveSystem.ts — Manages game progress persistence.
 *
 * Tracks: level completion state, star ratings, cumulative stars,
 * world unlock progress, and last played level.
 *
 * Pure TypeScript — no engine dependencies. Persistence is delegated
 * to the engine layer via onPersist / onLoad callbacks.
 *
 * GDD: design/gdd/game-state-management.md (save/load)
 */

import { STAR_CONFIG } from '../config/GameConfig';

/** Per-level save data. */
export interface LevelSaveData {
    /** Whether the level has been completed at least once. */
    completed: boolean;
    /** Best star rating (0-3). */
    bestStars: number;
}

/** Complete save state. */
export interface SaveState {
    /** Version for migration support. */
    version: number;
    /** Per-level progress keyed by level ID (e.g., "1-1"). */
    levels: Record<string, LevelSaveData>;
    /** ID of the last played level. */
    lastPlayedLevel: string | null;
}

/**
 * SaveSystem manages level progress and star ratings.
 * Emits persistence requests via callbacks.
 */
export class SaveSystem {
    private state: SaveState;
    private dirty: boolean;

    // ===== Callbacks =====

    /** Request the engine layer to persist current state. */
    public onPersist: ((state: SaveState) => void) | null;

    /** Request the engine layer to load saved state. */
    public onLoad: (() => SaveState | null) | null;

    constructor() {
        this.state = this.createDefaultState();
        this.dirty = false;
        this.onPersist = null;
        this.onLoad = null;
    }

    // ===== State access =====

    /** Get the full save state (for serialization). */
    getState(): SaveState {
        return { ...this.state, levels: { ...this.state.levels } };
    }

    /** Check if there are unsaved changes. */
    isDirty(): boolean {
        return this.dirty;
    }

    /** Get save data for a specific level. */
    getLevelData(levelId: string): LevelSaveData {
        return this.state.levels[levelId] ?? { completed: false, bestStars: 0 };
    }

    /** Get the last played level ID. */
    getLastPlayedLevel(): string | null {
        return this.state.lastPlayedLevel;
    }

    /** Get best star rating for a level. */
    getBestStars(levelId: string): number {
        return this.getLevelData(levelId).bestStars;
    }

    /** Get total cumulative stars across all completed levels. */
    getCumulativeStars(): number {
        let total = 0;
        for (const data of Object.values(this.state.levels)) {
            total += data.bestStars;
        }
        return total;
    }

    /** Get cumulative stars for a specific world. */
    getWorldStars(worldId: number): number {
        const prefix = `${worldId}-`;
        let total = 0;
        for (const [id, data] of Object.entries(this.state.levels)) {
            if (id.startsWith(prefix)) {
                total += data.bestStars;
            }
        }
        return total;
    }

    /** Check if a world is unlocked based on cumulative stars. */
    isWorldUnlocked(worldId: number): boolean {
        const thresholds = STAR_CONFIG.WORLD_UNLOCK_THRESHOLDS;
        const threshold = thresholds[worldId - 1] ?? Infinity;
        return this.getCumulativeStars() >= threshold;
    }

    /** Check if a level is unlocked (previous level completed or first in world). */
    isLevelUnlocked(levelId: string): boolean {
        const data = this.getLevelData(levelId);
        if (data.completed) return true;

        // First level of each world is unlocked if the world is unlocked
        const parts = levelId.split('-');
        const worldId = parseInt(parts[0], 10);
        const levelNum = parseInt(parts[1], 10);

        if (levelNum === 1) {
            return this.isWorldUnlocked(worldId);
        }

        // Otherwise, previous level must be completed
        const prevId = `${worldId}-${levelNum - 1}`;
        return this.getLevelData(prevId).completed;
    }

    // ===== State mutations =====

    /** Update a level's result (stars earned). */
    updateLevelResult(levelId: string, stars: number): boolean {
        const current = this.getLevelData(levelId);
        const improved = stars > current.bestStars;

        if (improved || !current.completed) {
            this.state.levels[levelId] = {
                completed: current.completed || stars > 0,
                bestStars: Math.max(current.bestStars, stars),
            };
            this.dirty = true;
        }

        this.state.lastPlayedLevel = levelId;
        this.dirty = true;

        return improved;
    }

    /** Set the last played level. */
    setLastPlayedLevel(levelId: string): void {
        this.state.lastPlayedLevel = levelId;
        this.dirty = true;
    }

    // ===== Persistence =====

    /** Save current state (delegates to engine layer). */
    save(): void {
        if (this.onPersist) {
            this.onPersist(this.getState());
        }
        this.dirty = false;
    }

    /** Load state from engine layer. */
    load(): boolean {
        if (!this.onLoad) return false;

        const loaded = this.onLoad();
        if (!loaded) return false;

        // Validate version
        if (loaded.version !== this.state.version) {
            console.warn(`[SaveSystem] Version mismatch: ${loaded.version} vs ${this.state.version}`);
        }

        this.state = loaded;
        this.dirty = false;
        return true;
    }

    /** Clear all progress. */
    reset(): void {
        this.state = this.createDefaultState();
        this.dirty = true;
    }

    // ===== Private =====

    private createDefaultState(): SaveState {
        return {
            version: 1,
            levels: {},
            lastPlayedLevel: null,
        };
    }
}
