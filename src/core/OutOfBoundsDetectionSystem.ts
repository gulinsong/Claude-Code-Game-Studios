/**
 * OutOfBoundsDetectionSystem.ts — Detects when the ball passes the bottom
 * boundary and triggers game failure. Ensures single-fire behavior via a
 * hasTriggered flag.
 *
 * GDD: design/gdd/out-of-bounds-system.md
 * No engine dependencies — pure TypeScript logic.
 */

import { BOUNDARY_CONFIG } from '../config/GameConfig';

/** Ball destroy margin below screen (px), sourced from config. */
const BALL_DESTROY_MARGIN = BOUNDARY_CONFIG.BALL_DESTROY_MARGIN;

/** Detection states per GDD. */
export enum OutOfBoundsState {
    ARMED = 'ARMED',
    TRIGGERED = 'TRIGGERED',
    SPENT = 'SPENT',
}

/**
 * OutOfBoundsDetectionSystem monitors for ball out-of-bounds events.
 *
 * Lifecycle: ARMED → TRIGGERED → SPENT, with reset back to ARMED on level restart.
 * The system uses a single flag to guarantee only one trigger per level attempt.
 */
export class OutOfBoundsDetectionSystem {
    private state: OutOfBoundsState;
    private hasTriggered: boolean;
    private destroyMargin: number;

    /** Callback to notify game state manager of OOB event. */
    public onTriggered: (() => void) | null;

    constructor(destroyMargin: number = BALL_DESTROY_MARGIN) {
        this.state = OutOfBoundsState.ARMED;
        this.hasTriggered = false;
        this.destroyMargin = destroyMargin;
        this.onTriggered = null;
    }

    /**
     * Called by the collision system when the ball passes through the
     * bottom boundary sensor.
     *
     * Only fires once per level attempt. Subsequent calls are silently ignored.
     */
    onBallOutOfBounds(): void {
        if (this.hasTriggered) return;

        this.hasTriggered = true;
        this.state = OutOfBoundsState.TRIGGERED;

        if (this.onTriggered) {
            this.onTriggered();
        }
    }

    /**
     * Check if the ball should be destroyed based on its Y position.
     *
     * Only relevant in TRIGGERED state. In Cocos Creator coordinates (Y up),
     * the ball is destroyed when its Y < -destroyMargin.
     *
     * @param ballY Current Y position of the ball.
     * @returns true if the ball should be destroyed.
     */
    shouldDestroyBall(ballY: number): boolean {
        if (this.state !== OutOfBoundsState.TRIGGERED) {
            return false;
        }
        if (ballY < -this.destroyMargin) {
            this.state = OutOfBoundsState.SPENT;
            return true;
        }
        return false;
    }

    /**
     * Reset the detection system for a new level attempt.
     *
     * Resets state to ARMED and clears the triggered flag.
     */
    reset(): void {
        this.state = OutOfBoundsState.ARMED;
        this.hasTriggered = false;
    }

    /**
     * Clean up resources. Call when the scene unloads.
     */
    destroy(): void {
        this.state = OutOfBoundsState.SPENT;
        this.hasTriggered = true;
        this.onTriggered = null;
    }

    /**
     * Get the current detection state (for debugging).
     */
    getState(): OutOfBoundsState {
        return this.state;
    }

    /**
     * Check if the system has already triggered this attempt.
     */
    isTriggered(): boolean {
        return this.hasTriggered;
    }

    /**
     * Get the Y threshold below which the ball is destroyed.
     */
    getDestroyY(): number {
        return -this.destroyMargin;
    }
}
