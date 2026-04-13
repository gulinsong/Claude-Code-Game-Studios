/**
 * OverlayController.ts — Manages overlay content assembly.
 *
 * Prepares data for pause, win result, and lose result overlays.
 * Does not own overlay visibility — UIScreenController manages that.
 *
 * GDD: design/gdd/ui-system.md § 屏幕 5-7
 * No engine dependencies — pure TypeScript.
 */

/** Win result data for the overlay display. */
export interface WinResultData {
    levelId: string;
    stars: number;
    lightPointsCollected: number;
    lightPointsTotal: number;
    sessionTime: number;
    hasNextLevel: boolean;
    nextLevelId: string | null;
    newWorldUnlocked: boolean;
    newWorldName: string | null;
}

/** Lose result data for the overlay display. */
export interface LoseResultData {
    levelId: string;
    lightPointsCollected: number;
    lightPointsTotal: number;
    starsEarned: number;
    encourageText: string;
    showNextButton: boolean;
}

/** Encouraging phrases shown on lose result. */
const LOSE_ENCOURAGE_TEXTS = [
    '再试一次吧！',
    '差一点就成功了！',
    '换个角度试试？',
    '画线可以更有创意哦',
] as const;

/**
 * OverlayController assembles overlay content data.
 */
export class OverlayController {
    private lastWinData: WinResultData | null;
    private lastLoseData: LoseResultData | null;

    constructor() {
        this.lastWinData = null;
        this.lastLoseData = null;
    }

    // ===== Content Assembly =====

    /**
     * Build win result overlay data.
     * @param levelId Current level ID
     * @param stars Star rating (0-3)
     * @param collected Light points collected
     * @param total Total light points
     * @param sessionTime Level completion time in seconds
     * @param hasNextLevel Whether a next level exists
     * @param nextLevelId Next level ID (if applicable)
     * @param newWorldUnlocked Whether a new world was unlocked
     * @param newWorldName Name of the unlocked world (if applicable)
     */
    buildWinResult(
        levelId: string,
        stars: number,
        collected: number,
        total: number,
        sessionTime: number,
        hasNextLevel: boolean,
        nextLevelId: string | null,
        newWorldUnlocked: boolean = false,
        newWorldName: string | null = null,
    ): WinResultData {
        const data: WinResultData = {
            levelId,
            stars: Math.max(0, Math.min(3, stars)),
            lightPointsCollected: collected,
            lightPointsTotal: total,
            sessionTime,
            hasNextLevel,
            nextLevelId,
            newWorldUnlocked,
            newWorldName,
        };
        this.lastWinData = data;
        return data;
    }

    /**
     * Build lose result overlay data.
     * @param levelId Current level ID
     * @param collected Light points collected
     * @param total Total light points
     * @param starsEarned Stars earned even on defeat (can be 0-2)
     */
    buildLoseResult(
        levelId: string,
        collected: number,
        total: number,
        starsEarned: number = 0,
    ): LoseResultData {
        const data: LoseResultData = {
            levelId,
            lightPointsCollected: collected,
            lightPointsTotal: total,
            starsEarned: Math.max(0, Math.min(3, starsEarned)),
            encourageText: this.getRandomEncourageText(),
            showNextButton: starsEarned > 0,
        };
        this.lastLoseData = data;
        return data;
    }

    // ===== Query =====

    /** Get the last built win result data. */
    getLastWinResult(): WinResultData | null {
        return this.lastWinData;
    }

    /** Get the last built lose result data. */
    getLastLoseResult(): LoseResultData | null {
        return this.lastLoseData;
    }

    // ===== Helpers =====

    /** Get a random encouraging phrase. */
    getRandomEncourageText(): string {
        const index = Math.floor(Math.random() * LOSE_ENCOURAGE_TEXTS.length);
        return LOSE_ENCOURAGE_TEXTS[index];
    }

    /** Get all encourage texts (for testing). */
    static getEncourageTexts(): readonly string[] {
        return LOSE_ENCOURAGE_TEXTS;
    }

    // ===== Reset =====

    /** Reset to default state. */
    reset(): void {
        this.lastWinData = null;
        this.lastLoseData = null;
    }
}
