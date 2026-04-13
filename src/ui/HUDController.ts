/**
 * HUDController.ts — Manages gameplay HUD data binding.
 *
 * Tracks lines used/remaining, light points collected/total,
 * and session time. Pushes updates to the engine layer via callbacks.
 *
 * GDD: design/gdd/ui-system.md § 屏幕 4: 游戏 HUD
 * No engine dependencies — pure TypeScript.
 */

import { HUDData } from './UIScreenController';

/**
 * HUDController manages HUD data updates during gameplay.
 */
export class HUDController {
    private linesUsed: number;
    private maxLines: number;
    private lightPointsCollected: number;
    private lightPointsTotal: number;
    private sessionStartTime: number;
    private isTracking: boolean;

    // ===== Callbacks =====

    /** Called when HUD data changes. */
    public onHUDUpdate: ((data: HUDData) => void) | null;

    constructor() {
        this.linesUsed = 0;
        this.maxLines = 0;
        this.lightPointsCollected = 0;
        this.lightPointsTotal = 0;
        this.sessionStartTime = 0;
        this.isTracking = false;
        this.onHUDUpdate = null;
    }

    // ===== Lifecycle =====

    /** Initialize HUD for a new level. */
    startLevel(maxLines: number, lightPointsTotal: number): void {
        this.linesUsed = 0;
        this.maxLines = maxLines;
        this.lightPointsCollected = 0;
        this.lightPointsTotal = lightPointsTotal;
        this.sessionStartTime = Date.now();
        this.isTracking = true;
        this.emitUpdate();
    }

    /** Stop tracking (level ended). */
    stopTracking(): void {
        this.isTracking = false;
    }

    // ===== Updaters =====

    /** Record a line being used. */
    onLineCreated(): void {
        if (!this.isTracking) return;
        this.linesUsed++;
        this.emitUpdate();
    }

    /** Record a line being removed (undo). */
    onLineRemoved(): void {
        if (!this.isTracking) return;
        this.linesUsed = Math.max(0, this.linesUsed - 1);
        this.emitUpdate();
    }

    /** Record a light point being collected. */
    onLightPointCollected(): void {
        if (!this.isTracking) return;
        this.lightPointsCollected++;
        this.emitUpdate();
    }

    // ===== Query =====

    /** Get current HUD data snapshot. */
    getData(): HUDData {
        return {
            linesUsed: this.linesUsed,
            linesRemaining: this.maxLines - this.linesUsed,
            lightPointsCollected: this.lightPointsCollected,
            lightPointsTotal: this.lightPointsTotal,
            sessionTime: this.getSessionTime(),
        };
    }

    /** Get elapsed session time in seconds. */
    getSessionTime(): number {
        if (!this.isTracking) return 0;
        return (Date.now() - this.sessionStartTime) / 1000;
    }

    // ===== Reset =====

    /** Reset to default state. */
    reset(): void {
        this.linesUsed = 0;
        this.maxLines = 0;
        this.lightPointsCollected = 0;
        this.lightPointsTotal = 0;
        this.sessionStartTime = 0;
        this.isTracking = false;
    }

    // ===== Private =====

    private emitUpdate(): void {
        if (this.onHUDUpdate) {
            this.onHUDUpdate(this.getData());
        }
    }
}
