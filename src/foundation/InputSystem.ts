/**
 * InputSystem.ts — Processes touch input and manages the line-drawing state machine.
 *
 * Tracks touch start/move/end events, generates line segments, enforces
 * minimum length validation, and provides preview line data for visual feedback.
 * No engine dependencies — pure TypeScript logic.
 *
 * GDD: design/gdd/input-system.md
 */

import { Vec2, LineSegment, InputPhase } from '../interfaces/GameInterfaces';
import { INPUT_CONFIG } from '../config/GameConfig';

/** Touch event data expected from the engine's input system. */
export interface TouchData {
    /** Touch point ID (first touch only is processed). */
    id: number;
    /** Position in screen coordinates. */
    x: number;
    y: number;
}

/**
 * InputSystem manages the drawing state machine and converts raw touch events
 * into game-usable line segment data.
 *
 * States: IDLE → DRAWING → IDLE (on touch end or cancel)
 */
export class InputSystem {
    /** Current drawing phase. */
    private phase: InputPhase;

    /** Starting point of the current touch. */
    private touchStart: Vec2 | null;

    /** Current endpoint of the active touch (updated on move). */
    private touchCurrent: Vec2 | null;

    /** Whether drawing is allowed (checked against game state externally). */
    private canDraw: boolean;

    /** Whether the game is paused (input is blocked during pause). */
    private paused: boolean;

    /** Minimum line segment length in pixels. */
    private minLineLength: number;

    /** Callback when a valid line is confirmed (touch end + length check passed). */
    public onLineConfirmed: ((start: Vec2, end: Vec2) => void) | null;

    /** Callback to provide preview line data during drawing. */
    public onPreviewUpdate: ((start: Vec2, end: Vec2) => void) | null;

    /** Callback when preview should be hidden. */
    public onPreviewHide: (() => void) | null;

    /** Callback when the line is too short (< minLineLength). */
    public onLineRejected: (() => void) | null;

    constructor(minLineLength: number = INPUT_CONFIG.MIN_LINE_LENGTH) {
        this.phase = InputPhase.IDLE;
        this.touchStart = null;
        this.touchCurrent = null;
        this.canDraw = true;
        this.paused = false;
        this.minLineLength = minLineLength;
        this.onLineConfirmed = null;
        this.onPreviewUpdate = null;
        this.onPreviewHide = null;
        this.onLineRejected = null;
    }

    // ===== Touch event handlers =====

    /**
     * Handle touch start event.
     *
     * Only processes the first touch. If drawing is not allowed or the
     * game is paused, the event is ignored.
     */
    onTouchStart(touch: TouchData): void {
        if (this.phase !== InputPhase.IDLE) return;
        if (!this.canDraw || this.paused) return;

        this.phase = InputPhase.DRAWING;
        this.touchStart = { x: touch.x, y: touch.y };
        this.touchCurrent = { x: touch.x, y: touch.y };
    }

    /**
     * Handle touch move event.
     *
     * Updates the preview line endpoint. Only processes if a touch is active.
     */
    onTouchMove(touch: TouchData): void {
        if (this.phase !== InputPhase.DRAWING) return;
        if (!this.touchStart) return;

        this.touchCurrent = { x: touch.x, y: touch.y };

        if (this.onPreviewUpdate) {
            this.onPreviewUpdate(this.touchStart, this.touchCurrent);
        }
    }

    /**
     * Handle touch end event.
     *
     * Validates line length. If >= minLineLength, confirms the line via
     * onLineConfirmed. Otherwise, rejects it via onLineRejected.
     */
    onTouchEnd(touch: TouchData): void {
        if (this.phase !== InputPhase.DRAWING) return;
        if (!this.touchStart) {
            this.resetToIdle();
            return;
        }

        // Update current position to the touch end point
        this.touchCurrent = { x: touch.x, y: touch.y };

        const length = this.computeLength(this.touchStart, this.touchCurrent);

        if (length >= this.minLineLength) {
            if (this.onLineConfirmed) {
                this.onLineConfirmed(
                    { x: this.touchStart.x, y: this.touchStart.y },
                    { x: this.touchCurrent.x, y: this.touchCurrent.y },
                );
            }
        } else {
            if (this.onLineRejected) {
                this.onLineRejected();
            }
        }

        if (this.onPreviewHide) {
            this.onPreviewHide();
        }

        this.resetToIdle();
    }

    /**
     * Handle touch cancel (e.g., interruption by system event).
     *
     * Cancels the current drawing without creating a line.
     */
    onTouchCancel(): void {
        if (this.phase !== InputPhase.DRAWING) return;

        if (this.onPreviewHide) {
            this.onPreviewHide();
        }

        this.resetToIdle();
    }

    // ===== State control =====

    /** Set whether drawing is allowed. Checked on each touch start. */
    setCanDraw(canDraw: boolean): void {
        this.canDraw = canDraw;
    }

    /** Set pause state. Touch input is blocked while paused. */
    setPaused(paused: boolean): void {
        this.paused = paused;
        // Cancel any in-progress drawing on pause
        if (paused && this.phase === InputPhase.DRAWING) {
            if (this.onPreviewHide) {
                this.onPreviewHide();
            }
            this.resetToIdle();
        }
    }

    /** Get current input phase. */
    getPhase(): InputPhase {
        return this.phase;
    }

    /** Check if currently drawing. */
    isDrawing(): boolean {
        return this.phase === InputPhase.DRAWING;
    }

    /**
     * Get the current preview line segment data.
     *
     * @returns LineSegment if currently drawing, null otherwise.
     */
    getPreviewLine(): { start: Vec2; end: Vec2 } | null {
        if (this.phase !== InputPhase.DRAWING || !this.touchStart || !this.touchCurrent) {
            return null;
        }
        return {
            start: { x: this.touchStart.x, y: this.touchStart.y },
            end: { x: this.touchCurrent.x, y: this.touchCurrent.y },
        };
    }

    // ===== Private helpers =====

    /** Reset to idle state, clearing touch tracking. */
    private resetToIdle(): void {
        this.phase = InputPhase.IDLE;
        this.touchStart = null;
        this.touchCurrent = null;
    }

    /** Compute Euclidean distance between two points. */
    private computeLength(a: Vec2, b: Vec2): number {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
