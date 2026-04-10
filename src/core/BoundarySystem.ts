/**
 * BoundarySystem.ts — Defines and manages the playable area boundaries.
 *
 * Computes four boundary edges from screen dimensions + safe area insets.
 * Left, right, and top boundaries are solid walls (ball bounces).
 * Bottom boundary is a sensor (ball passes through → triggers out-of-bounds).
 *
 * GDD: design/gdd/boundary-system.md
 * No engine dependencies — pure TypeScript logic.
 */

import { BOUNDARY_CONFIG } from '../config/GameConfig';

// ===== Safe area defaults (px) for graceful degradation =====
const DEFAULT_SAFE_AREA_TOP = 44;
const DEFAULT_SAFE_AREA_BOTTOM = 34;

/** Boundary edge data for collision system registration. */
export interface BoundaryEdges {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

/** Playable area rectangle. */
export interface PlayableArea {
    x: number;      // left edge
    y: number;      // bottom edge
    width: number;  // playable width
    height: number; // playable height
}

/**
 * BoundarySystem computes and stores the four boundary edges and provides
 * the playable area rectangle. It is initialized once per scene lifecycle
 * with screen dimensions and safe area insets.
 */
export class BoundarySystem {
    private edges: BoundaryEdges | null;
    private playableArea: PlayableArea | null;

    /** Callback invoked when the ball passes through the bottom sensor. */
    public onBallOutOfBounds: (() => void) | null;

    constructor() {
        this.edges = null;
        this.playableArea = null;
        this.onBallOutOfBounds = null;
    }

    /**
     * Initialize boundaries from screen dimensions and safe area insets.
     *
     * Should be called once when the game scene loads.
     *
     * @param screenWidth     Total screen width in design pixels.
     * @param screenHeight    Total screen height in design pixels.
     * @param safeAreaTop     Top safe area (notch/status bar) in px. Clamped >= 0.
     * @param safeAreaBottom  Bottom safe area (home indicator) in px. Clamped >= 0.
     */
    initialize(
        screenWidth: number,
        screenHeight: number,
        safeAreaTop: number = 0,
        safeAreaBottom: number = 0,
    ): void {
        // Graceful degradation for invalid safe area values
        const sat = (typeof safeAreaTop === 'number' && safeAreaTop >= 0)
            ? safeAreaTop
            : DEFAULT_SAFE_AREA_TOP;
        const sab = (typeof safeAreaBottom === 'number' && safeAreaBottom >= 0)
            ? safeAreaBottom
            : DEFAULT_SAFE_AREA_BOTTOM;

        const padding = BOUNDARY_CONFIG.BOUNDARY_PADDING;

        const left = padding;
        const right = screenWidth - padding;
        const top = screenHeight - padding - sat;
        const bottom = padding + sab;

        this.edges = { left, right, top, bottom };
        this.playableArea = {
            x: left,
            y: bottom,
            width: right - left,
            height: top - bottom,
        };
    }

    /**
     * Get the computed boundary edges.
     *
     * @returns BoundaryEdges if initialized, null otherwise.
     */
    getEdges(): BoundaryEdges | null {
        return this.edges;
    }

    /**
     * Get the playable area rectangle.
     *
     * @returns PlayableArea if initialized, null otherwise.
     */
    getPlayableArea(): PlayableArea | null {
        return this.playableArea;
    }

    /**
     * Check if a position is within the playable area boundaries.
     *
     * @param pos    Position to test.
     * @param margin Additional margin inside boundaries (e.g. ball radius).
     * @returns true if the position is within all four boundaries.
     */
    isInsideBounds(pos: { x: number; y: number }, margin: number = 0): boolean {
        if (!this.edges) return false;
        return (
            pos.x >= this.edges.left + margin &&
            pos.x <= this.edges.right - margin &&
            pos.y >= this.edges.bottom + margin &&
            pos.y <= this.edges.top - margin
        );
    }

    /**
     * Check if a position is below the bottom boundary (out of bounds).
     *
     * @param pos       Position to test.
     * @param tolerance Extra tolerance below the boundary before counting as OOB.
     * @returns true if the position is below the bottom boundary.
     */
    isBelowBottom(pos: { x: number; y: number }, tolerance: number = 0): boolean {
        if (!this.edges) return false;
        return pos.y < this.edges.bottom - tolerance;
    }

    /**
     * Clean up boundary data. Call when the scene unloads.
     */
    destroy(): void {
        this.edges = null;
        this.playableArea = null;
        this.onBallOutOfBounds = null;
    }
}
