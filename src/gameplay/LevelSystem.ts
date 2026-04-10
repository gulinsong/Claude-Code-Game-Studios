/**
 * LevelSystem.ts — Manages level data loading, progress tracking, and unlock logic.
 *
 * Responsibilities:
 * - Loading and validating level configurations from LevelData arrays
 * - Tracking per-level progress (best stars, attempts, best time)
 * - Enforcing world unlock rules based on cumulative stars
 * - Enforcing sequential level unlock within each world
 * - Coordinate conversion from normalized (0-1) to pixel space
 *
 * GDD: design/gdd/level-system.md
 * No engine dependencies — pure TypeScript.
 */

import {
    LevelData,
    LevelProgress,
    WorldProgress,
    GameProgress,
    StarThresholds,
} from '../interfaces/GameInterfaces';
import { StarRatingCalculator } from './StarRatingCalculator';
import { STAR_CONFIG } from '../config/GameConfig';

/** Default world unlock thresholds: [World1, World2, World3, World4] */
const DEFAULT_WORLD_UNLOCK_THRESHOLDS: readonly number[] = STAR_CONFIG.WORLD_UNLOCK_THRESHOLDS;

/** Creates an empty LevelProgress for a given level ID. */
function createEmptyProgress(levelId: string): LevelProgress {
    return {
        levelId,
        bestStars: 0,
        completed: false,
        attempts: 0,
        bestTime: 0,
    };
}

export class LevelSystem {
    /** All loaded level data, keyed by level ID (e.g., "1-3") */
    private levels: Map<string, LevelData>;

    /** Per-level progress, keyed by level ID */
    private progress: Map<string, LevelProgress>;

    /** Cumulative star unlock thresholds per world. Index 0 = World 1. */
    private worldUnlockThresholds: number[];

    /**
     * Construct a new LevelSystem.
     *
     * @param worldUnlockThresholds - Optional override for world unlock thresholds.
     *   Defaults to STAR_CONFIG.WORLD_UNLOCK_THRESHOLDS ([0, 7, 18, 33]).
     *   Index 0 corresponds to World 1 (always 0 for instant unlock).
     */
    constructor(worldUnlockThresholds?: number[]) {
        this.levels = new Map();
        this.progress = new Map();
        this.worldUnlockThresholds = worldUnlockThresholds !== undefined
            ? [...worldUnlockThresholds]
            : [...DEFAULT_WORLD_UNLOCK_THRESHOLDS];
    }

    // ===== Level Data Management =====

    /**
     * Load an array of level configurations into the system.
     *
     * Validates each level before loading. Invalid levels are skipped.
     * Duplicate IDs log a warning and overwrite the previous entry.
     *
     * @param levels - Array of LevelData objects to load
     */
    loadLevelData(levels: LevelData[]): void {
        for (const level of levels) {
            const validation = LevelSystem.validateLevelData(level);
            if (!validation.valid) {
                console.warn(
                    `[LevelSystem] Skipping invalid level "${level.id}": ${validation.errors.join(', ')}`
                );
                continue;
            }

            if (this.levels.has(level.id)) {
                console.warn(`[LevelSystem] Duplicate level ID "${level.id}" — overwriting.`);
            }

            this.levels.set(level.id, level);

            // Initialize progress if not already tracked
            if (!this.progress.has(level.id)) {
                this.progress.set(level.id, createEmptyProgress(level.id));
            }
        }
    }

    /**
     * Retrieve loaded level data by ID.
     *
     * @param levelId - Level identifier in "{world}-{level}" format
     * @returns LevelData if found, undefined otherwise
     */
    getLevelData(levelId: string): LevelData | undefined {
        return this.levels.get(levelId);
    }

    /**
     * Get all loaded level IDs.
     *
     * @returns Array of all level ID strings
     */
    getAllLevelIds(): string[] {
        return Array.from(this.levels.keys());
    }

    /**
     * Get all level data for a specific world, sorted by level number.
     *
     * @param worldNumber - 1-based world number
     * @returns Array of LevelData for the requested world, sorted by level number ascending
     */
    getLevelsByWorld(worldNumber: number): LevelData[] {
        const result: LevelData[] = [];
        this.levels.forEach((level) => {
            if (level.world === worldNumber) {
                result.push(level);
            }
        });
        result.sort((a, b) => a.level - b.level);
        return result;
    }

    // ===== Level Validation =====

    /**
     * Validate a level's configuration data.
     *
     * Checks:
     * - ID format matches "{world}-{level}" pattern
     * - world and level numbers are positive
     * - name is non-empty
     * - difficulty is between 0 and 1
     * - maxLines > 0
     * - lightPoints has at least one entry
     * - starThresholds are strictly ascending (one < two < three)
     * - starThresholds.three <= lightPoints.length
     *
     * @param level - The level data to validate
     * @returns Object with valid flag and array of error messages
     */
    static validateLevelData(level: LevelData): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // ID format check
        if (!level.id || typeof level.id !== 'string') {
            errors.push('id is missing or not a string');
        } else {
            const idPattern = /^\d+-\d+$/;
            if (!idPattern.test(level.id)) {
                errors.push(`id "${level.id}" does not match "{{world}}-{{level}}" format`);
            }
        }

        // World and level numbers
        if (typeof level.world !== 'number' || level.world < 1) {
            errors.push('world must be a number >= 1');
        }
        if (typeof level.level !== 'number' || level.level < 1) {
            errors.push('level must be a number >= 1');
        }

        // Name
        if (!level.name || typeof level.name !== 'string' || level.name.trim().length === 0) {
            errors.push('name must be a non-empty string');
        }

        // Difficulty range
        if (typeof level.difficulty !== 'number' || level.difficulty < 0 || level.difficulty > 1) {
            errors.push('difficulty must be between 0.0 and 1.0');
        }

        // maxLines must be positive
        if (typeof level.maxLines !== 'number' || level.maxLines <= 0) {
            errors.push('maxLines must be greater than 0');
        }

        // lightPoints must have at least one entry
        if (!Array.isArray(level.lightPoints) || level.lightPoints.length === 0) {
            errors.push('lightPoints must be a non-empty array');
        }

        // starThresholds ascending check (only if lightPoints exist)
        if (level.starThresholds && Array.isArray(level.lightPoints) && level.lightPoints.length > 0) {
            const thresholds = level.starThresholds;
            if (typeof thresholds.one !== 'number' || thresholds.one < 1) {
                errors.push('starThresholds.one must be >= 1');
            }
            if (thresholds.one >= thresholds.two) {
                errors.push('starThresholds.one must be less than starThresholds.two');
            }
            if (thresholds.two >= thresholds.three) {
                errors.push('starThresholds.two must be less than starThresholds.three');
            }
            if (thresholds.three > level.lightPoints.length) {
                errors.push('starThresholds.three must not exceed lightPoints count');
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    // ===== Coordinate Conversion =====

    /**
     * Convert normalized coordinates (0-1 range) to pixel coordinates.
     *
     * Formula:
     *   pixelX = nx * playableWidth + leftBoundary
     *   pixelY = ny * playableHeight + bottomBoundary
     *
     * @param nx              - Normalized X coordinate (0.0 = left, 1.0 = right)
     * @param ny              - Normalized Y coordinate (0.0 = bottom, 1.0 = top)
     * @param playableWidth   - Width of the playable area in pixels
     * @param playableHeight  - Height of the playable area in pixels
     * @param leftBoundary    - X offset of the left edge of the playable area
     * @param bottomBoundary  - Y offset of the bottom edge of the playable area
     * @returns Pixel coordinates { x, y }
     */
    static normalizedToPixel(
        nx: number,
        ny: number,
        playableWidth: number,
        playableHeight: number,
        leftBoundary: number,
        bottomBoundary: number
    ): { x: number; y: number } {
        return {
            x: nx * playableWidth + leftBoundary,
            y: ny * playableHeight + bottomBoundary,
        };
    }

    // ===== Progress Tracking =====

    /**
     * Record the result of a level play session.
     *
     * Updates bestStars (never downgrades), increments attempts, and tracks
     * best completion time. Marks the level as completed if stars >= 1.
     *
     * @param levelId - The level that was played
     * @param stars   - Stars earned this session (0-3)
     * @param time    - Time spent in the session (seconds)
     */
    onLevelResult(levelId: string, stars: number, time: number): void {
        let current = this.progress.get(levelId);
        if (!current) {
            current = createEmptyProgress(levelId);
            this.progress.set(levelId, current);
        }

        // bestStars never downgrades
        current.bestStars = Math.max(current.bestStars, stars);
        current.attempts += 1;

        if (stars >= 1) {
            current.completed = true;

            // Track best time only for completed runs
            if (current.bestTime === 0 || time < current.bestTime) {
                current.bestTime = time;
            }
        }
    }

    /**
     * Get the progress record for a specific level.
     *
     * Returns a default empty progress entry if the level has no recorded progress.
     *
     * @param levelId - Level identifier
     * @returns LevelProgress for the level
     */
    getLevelProgress(levelId: string): LevelProgress {
        const existing = this.progress.get(levelId);
        if (existing) {
            return { ...existing };
        }
        return createEmptyProgress(levelId);
    }

    /**
     * Get aggregated progress for all levels in a world.
     *
     * @param worldNumber - 1-based world number
     * @returns WorldProgress containing unlock status and per-level progress
     */
    getWorldProgress(worldNumber: number): WorldProgress {
        const worldLevels = this.getLevelsByWorld(worldNumber);
        const levelProgresses: LevelProgress[] = worldLevels.map((ld) =>
            this.getLevelProgress(ld.id)
        );

        return {
            worldId: worldNumber,
            unlocked: this.isWorldUnlocked(worldNumber),
            levels: levelProgresses,
        };
    }

    /**
     * Get full game progress across all worlds.
     *
     * @returns GameProgress with per-world breakdown, total stars, and last played level
     */
    getGameProgress(): GameProgress {
        const worldNumbers = this.getWorldCount();
        const worlds: WorldProgress[] = [];

        for (let w = 1; w <= worldNumbers; w++) {
            worlds.push(this.getWorldProgress(w));
        }

        return {
            worlds,
            totalStars: this.getCumulativeStars(),
            lastPlayedLevel: this.findLastPlayedLevel(),
        };
    }

    // ===== Unlock Logic =====

    /**
     * Check if a specific level is unlocked.
     *
     * A level is unlocked when:
     * 1. Its world is unlocked (cumulative stars >= threshold)
     * 2. It is level 1 within the world, OR the previous level has >= 1 star
     *
     * @param levelId - Level identifier in "{world}-{level}" format
     * @returns true if the level is accessible
     */
    isLevelUnlocked(levelId: string): boolean {
        const levelData = this.levels.get(levelId);
        if (!levelData) {
            return false;
        }

        // World must be unlocked
        if (!this.isWorldUnlocked(levelData.world)) {
            return false;
        }

        // Level 1 in every world is always unlocked (once world is unlocked)
        if (levelData.level === 1) {
            return true;
        }

        // Sequential unlock: previous level must have >= 1 star
        const previousLevelId = `${levelData.world}-${levelData.level - 1}`;
        const previousProgress = this.progress.get(previousLevelId);
        if (!previousProgress) {
            return false;
        }

        return previousProgress.bestStars >= 1;
    }

    /**
     * Check if a world is unlocked based on cumulative stars.
     *
     * World 1 (threshold = 0) is always unlocked.
     * Worlds beyond the configured threshold array are locked.
     *
     * @param worldNumber - 1-based world number
     * @returns true if the world is unlocked
     */
    isWorldUnlocked(worldNumber: number): boolean {
        if (worldNumber < 1 || worldNumber > this.worldUnlockThresholds.length) {
            return false;
        }

        const threshold = this.worldUnlockThresholds[worldNumber - 1];
        return this.getCumulativeStars() >= threshold;
    }

    /**
     * Calculate the total cumulative stars across all levels.
     *
     * Sums bestStars for every level that has progress recorded.
     * Uses StarRatingCalculator for consistency.
     *
     * @returns Total cumulative stars (0-96)
     */
    getCumulativeStars(): number {
        const allProgress: { bestStars: number }[] = [];
        this.progress.forEach((prog) => {
            allProgress.push(prog);
        });
        return StarRatingCalculator.calculateCumulativeStars(allProgress);
    }

    // ===== World Info =====

    /**
     * Get the number of worlds configured by the unlock thresholds.
     *
     * @returns Number of worlds (e.g., 4)
     */
    getWorldCount(): number {
        return this.worldUnlockThresholds.length;
    }

    /**
     * Get the star threshold required to unlock a specific world.
     *
     * Returns Infinity for worlds beyond the configured range.
     *
     * @param worldNumber - 1-based world number
     * @returns Stars needed to unlock that world
     */
    getWorldUnlockThreshold(worldNumber: number): number {
        if (worldNumber < 1 || worldNumber > this.worldUnlockThresholds.length) {
            return Infinity;
        }
        return this.worldUnlockThresholds[worldNumber - 1];
    }

    // ===== Private Helpers =====

    /**
     * Determine the last played level by finding the level with the highest attempt count.
     *
     * If multiple levels share the highest attempt count, returns the one with the
     * most recent world/level ordering (highest world, then highest level).
     *
     * @returns Level ID of the last played level, or empty string if none played
     */
    private findLastPlayedLevel(): string {
        let lastPlayed = '';
        let maxAttempts = 0;

        const entries = Array.from(this.progress.entries());
        for (let i = 0; i < entries.length; i++) {
            const levelId = entries[i][0];
            const prog = entries[i][1];
            if (prog.attempts > maxAttempts) {
                maxAttempts = prog.attempts;
                lastPlayed = levelId;
            } else if (prog.attempts === maxAttempts && prog.attempts > 0 && lastPlayed !== '') {
                // Tie-break: prefer higher world, then higher level
                const current = this.parseLevelId(levelId);
                const existing = this.parseLevelId(lastPlayed);
                if (current && existing) {
                    if (
                        current.world > existing.world ||
                        (current.world === existing.world && current.level > existing.level)
                    ) {
                        lastPlayed = levelId;
                    }
                }
            }
        }

        return lastPlayed;
    }

    /**
     * Parse a level ID string into its world and level number components.
     *
     * @param levelId - Level ID in "{world}-{level}" format
     * @returns Object with world and level numbers, or null if format is invalid
     */
    private parseLevelId(levelId: string): { world: number; level: number } | null {
        const parts = levelId.split('-');
        if (parts.length !== 2) {
            return null;
        }
        const world = parseInt(parts[0], 10);
        const level = parseInt(parts[1], 10);
        if (isNaN(world) || isNaN(level)) {
            return null;
        }
        return { world, level };
    }
}
