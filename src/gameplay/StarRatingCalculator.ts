/**
 * StarRatingCalculator.ts — Pure calculation module for the star rating system.
 *
 * Computes star ratings from light point collection data, generates default
 * thresholds, validates threshold configurations, tracks cumulative stars,
 * and determines world unlock status. All methods are static and side-effect-free.
 *
 * GDD: design/gdd/star-rating-system.md
 */

import { StarThresholds, StarRatingResult } from '../interfaces/GameInterfaces';
import { STAR_CONFIG } from '../config/GameConfig';

export class StarRatingCalculator {
    /**
     * Calculate stars for a completed level.
     *
     * Returns 0 if the level was not completed (defeat).
     * Checks thresholds top-down: 3 -> 2 -> 1 -> 0.
     *
     * @param lightPointsCollected - Number of light points the player collected
     * @param lightPointsTotal     - Total light points available in the level (unused, kept for API symmetry)
     * @param thresholds           - The star thresholds for this level
     * @param isVictory            - Whether the player achieved victory
     * @returns Star rating: 0, 1, 2, or 3
     */
    static calculateStars(
        lightPointsCollected: number,
        lightPointsTotal: number,
        thresholds: StarThresholds,
        isVictory: boolean
    ): number {
        if (!isVictory) {
            return 0;
        }

        if (lightPointsCollected >= thresholds.three) {
            return 3;
        }
        if (lightPointsCollected >= thresholds.two) {
            return 2;
        }
        if (lightPointsCollected >= thresholds.one) {
            return 1;
        }

        return 0;
    }

    /**
     * Generate default thresholds for a level based on light point count.
     *
     * - three = lightPointCount (100% — "one-ball clear" pillar)
     * - two   = ceil(lightPointCount * 0.7)
     * - one   = ceil(lightPointCount * 0.4)
     *
     * @param lightPointCount - Total number of light points in the level
     * @returns StarThresholds computed from ratios
     */
    static generateDefaultThresholds(lightPointCount: number): StarThresholds {
        return {
            three: lightPointCount,
            two: Math.ceil(lightPointCount * STAR_CONFIG.THRESHOLD_TWO_RATIO),
            one: Math.ceil(lightPointCount * STAR_CONFIG.THRESHOLD_ONE_RATIO),
        };
    }

    /**
     * Validate that thresholds are properly ascending and within bounds.
     *
     * Rules:
     * - 1 <= one <= two <= three <= lightPointCount
     * - one must be at least 1 (0 collected should never earn 1 star)
     * - three must not exceed the total light point count
     *
     * @param thresholds       - The thresholds to validate
     * @param lightPointCount  - Total light points in the level
     * @returns true if thresholds are valid
     */
    static validateThresholds(thresholds: StarThresholds, lightPointCount: number): boolean {
        if (thresholds.one < 1) {
            return false;
        }
        if (thresholds.one > thresholds.two) {
            return false;
        }
        if (thresholds.two > thresholds.three) {
            return false;
        }
        if (thresholds.three > lightPointCount) {
            return false;
        }

        return true;
    }

    /**
     * Calculate cumulative stars from all level progress entries.
     *
     * Sums bestStars for every level where bestStars > 0.
     * Maximum possible: 96 stars (4 worlds x 8 levels x 3 stars).
     *
     * @param levelProgresses - Array of objects with a bestStars property
     * @returns Total cumulative star count
     */
    static calculateCumulativeStars(levelProgresses: { bestStars: number }[]): number {
        let total = 0;
        for (const progress of levelProgresses) {
            if (progress.bestStars > 0) {
                total += progress.bestStars;
            }
        }
        return total;
    }

    /**
     * Check if a world is unlocked based on cumulative stars.
     *
     * World unlock thresholds: [0, 7, 18, 33].
     * World 1 (threshold 0) is always unlocked.
     * Worlds beyond the configured list are considered locked.
     *
     * @param worldNumber    - 1-based world number
     * @param cumulativeStars - Total cumulative stars earned
     * @returns true if the world is unlocked
     */
    static isWorldUnlocked(worldNumber: number, cumulativeStars: number): boolean {
        const thresholds = STAR_CONFIG.WORLD_UNLOCK_THRESHOLDS;

        if (worldNumber < 1 || worldNumber > thresholds.length) {
            return false;
        }

        const threshold = thresholds[worldNumber - 1];
        return cumulativeStars >= threshold;
    }

    /**
     * Get unlock progress for a world as a value between 0.0 and 1.0.
     *
     * World 1 always returns 1.0 (threshold is 0).
     * Worlds beyond the configured list return 0.0.
     *
     * @param worldNumber    - 1-based world number
     * @param cumulativeStars - Total cumulative stars earned
     * @returns Progress from 0.0 (no progress) to 1.0 (unlocked)
     */
    static getUnlockProgress(worldNumber: number, cumulativeStars: number): number {
        const thresholds = STAR_CONFIG.WORLD_UNLOCK_THRESHOLDS;

        if (worldNumber < 1 || worldNumber > thresholds.length) {
            return 0.0;
        }

        const threshold = thresholds[worldNumber - 1];

        if (threshold === 0) {
            return 1.0;
        }

        const progress = cumulativeStars / threshold;
        return Math.min(Math.max(progress, 0.0), 1.0);
    }

    /**
     * Build a complete StarRatingResult from raw level completion data.
     *
     * This is the primary entry point for producing the result object passed
     * to the UI, save system, and animation/audio systems after a level ends.
     *
     * @param levelId                - Identifier for the completed level
     * @param stars                  - Stars earned this session (from calculateStars)
     * @param previousBestStars      - Best stars previously recorded for this level
     * @param cumulativeStarsBefore  - Cumulative stars across all levels before this result
     * @param lightPointsCollected   - Light points collected this session
     * @param lightPointsTotal       - Total light points in the level
     * @param sessionTime            - Time spent in this play session (seconds)
     * @returns Complete StarRatingResult
     */
    static buildResult(
        levelId: string,
        stars: number,
        previousBestStars: number,
        cumulativeStarsBefore: number,
        lightPointsCollected: number,
        lightPointsTotal: number,
        sessionTime: number
    ): StarRatingResult {
        // Best stars never downgrades
        const newBestStars = Math.max(previousBestStars, stars);
        const isNewRecord = newBestStars > previousBestStars;

        // Cumulative stars increases by the difference
        const cumulativeStarsAfter = cumulativeStarsBefore + (newBestStars - previousBestStars);

        // Check if any new world was unlocked by this result
        const newWorldUnlocked = StarRatingCalculator.findNewlyUnlockedWorld(
            cumulativeStarsBefore,
            cumulativeStarsAfter
        );

        return {
            levelId,
            stars,
            previousBestStars,
            newBestStars,
            isNewRecord,
            cumulativeStarsBefore,
            cumulativeStarsAfter,
            newWorldUnlocked,
            lightPointsCollected,
            lightPointsTotal,
            sessionTime,
        };
    }

    /**
     * Find the highest world that was newly unlocked by a star count change.
     *
     * Returns null if no new world was unlocked.
     * Internal helper used by buildResult.
     *
     * @param starsBefore  - Cumulative stars before the change
     * @param starsAfter   - Cumulative stars after the change
     * @returns World number (1-based) of the highest newly unlocked world, or null
     */
    private static findNewlyUnlockedWorld(starsBefore: number, starsAfter: number): number | null {
        const thresholds = STAR_CONFIG.WORLD_UNLOCK_THRESHOLDS;
        let highestNewlyUnlocked: number | null = null;

        for (let i = 0; i < thresholds.length; i++) {
            const worldNumber = i + 1;
            const threshold = thresholds[i];
            const wasLocked = starsBefore < threshold;
            const isNowUnlocked = starsAfter >= threshold;

            if (wasLocked && isNowUnlocked) {
                highestNewlyUnlocked = worldNumber;
            }
        }

        return highestNewlyUnlocked;
    }
}
