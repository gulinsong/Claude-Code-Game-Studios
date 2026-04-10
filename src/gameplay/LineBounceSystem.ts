/**
 * LineBounceSystem.ts — Manages player-drawn lines as physical bounce surfaces.
 *
 * Handles line creation from input, registration with the collision system,
 * line state tracking (Active → Locked → Removed), and undo logic.
 * Bridges InputSystem, CollisionSystem, VisualFeedbackSystem, and AudioSystem.
 *
 * GDD: design/gdd/line-bounce-system.md
 * No engine dependencies — pure TypeScript.
 */

import { Vec2 } from '../interfaces/GameInterfaces';

/** Line segment states per GDD. */
export enum LineState {
    ACTIVE = 'ACTIVE',
    LOCKED = 'LOCKED',
    REMOVED = 'REMOVED',
}

/** Internal tracked line data. */
interface TrackedLine {
    id: string;
    start: Vec2;
    end: Vec2;
    state: LineState;
    isHit: boolean;
}

/**
 * LineBounceSystem manages the lifecycle of player-drawn lines.
 */
export class LineBounceSystem {
    /** All lines in the current level, keyed by lineId. */
    private lines: Map<string, TrackedLine>;

    /** Maximum lines allowed per level. */
    private maxLines: number;

    /** Number of lines currently active (not removed). */
    private activeLineCount: number;

    /** Callback: register line with collision system. Returns lineId. */
    public onRegisterLine: ((start: Vec2, end: Vec2) => string) | null;

    /** Callback: unregister line from collision system. */
    public onUnregisterLine: ((lineId: string) => void) | null;

    /** Callback: show confirmed line visually. */
    public onShowConfirmedLine: ((start: Vec2, end: Vec2, lineId: string) => void) | null;

    /** Callback: hide line visually. */
    public onHideLine: ((lineId: string) => void) | null;

    /** Callback: play bounce visual effect. */
    public onBounceEffect: ((position: Vec2) => void) | null;

    /** Callback: play sound. */
    public onPlaySound: ((soundId: string) => void) | null;

    /** Callback: notify line count changed. */
    public onLineCountChanged: ((used: number, remaining: number) => void) | null;

    constructor(maxLines: number = 3) {
        this.lines = new Map();
        this.maxLines = maxLines;
        this.activeLineCount = 0;
        this.onRegisterLine = null;
        this.onUnregisterLine = null;
        this.onShowConfirmedLine = null;
        this.onHideLine = null;
        this.onBounceEffect = null;
        this.onPlaySound = null;
        this.onLineCountChanged = null;
    }

    // ===== Line creation =====

    /**
     * Create a new line from player input.
     *
     * Registers with collision system, triggers visual/audio feedback,
     * and updates line count.
     *
     * @param start - Line start point.
     * @param end   - Line end point.
     * @returns lineId if created, null if quota exceeded or registration failed.
     */
    createLine(start: Vec2, end: Vec2): string | null {
        if (!this.canDrawLine()) return null;

        // Register with collision system
        let lineId: string;
        if (this.onRegisterLine) {
            lineId = this.onRegisterLine(start, end);
        } else {
            // Generate a fallback ID
            lineId = `line_${this.lines.size}`;
        }

        this.lines.set(lineId, {
            id: lineId,
            start: { x: start.x, y: start.y },
            end: { x: end.x, y: end.y },
            state: LineState.ACTIVE,
            isHit: false,
        });

        this.activeLineCount++;

        // Visual feedback
        if (this.onShowConfirmedLine) {
            this.onShowConfirmedLine(start, end, lineId);
        }

        // Audio feedback
        if (this.onPlaySound) {
            this.onPlaySound('line_place');
        }

        // Notify count change
        this.notifyCountChanged();

        return lineId;
    }

    // ===== Line removal =====

    /**
     * Remove (undo) a line.
     *
     * Only ACTIVE (not yet hit) lines can be removed.
     * LOCKED lines reject the removal request.
     *
     * @param lineId - ID of the line to remove.
     * @returns true if removed, false if not allowed.
     */
    removeLine(lineId: string): boolean {
        const line = this.lines.get(lineId);
        if (!line) return false;

        if (line.state === LineState.LOCKED) return false;
        if (line.state === LineState.REMOVED) return false;

        // Unregister from collision system
        if (this.onUnregisterLine) {
            this.onUnregisterLine(lineId);
        }

        // Visual feedback
        if (this.onHideLine) {
            this.onHideLine(lineId);
        }

        // Audio feedback
        if (this.onPlaySound) {
            this.onPlaySound('line_undo');
        }

        line.state = LineState.REMOVED;
        this.activeLineCount--;

        this.notifyCountChanged();
        return true;
    }

    // ===== Collision response =====

    /**
     * Called when the ball hits a line.
     *
     * Locks the line (prevents future undo), triggers visual/audio feedback.
     *
     * @param position - Contact point.
     * @param normal   - Surface normal at contact.
     * @param lineId   - ID of the line that was hit.
     */
    onBallHitLine(position: Vec2, normal: Vec2, lineId: string): void {
        const line = this.lines.get(lineId);
        if (!line) return;

        // Lock on first hit (idempotent — subsequent hits are no-ops)
        if (!line.isHit) {
            line.isHit = true;
            line.state = LineState.LOCKED;
        }

        // Bounce visual effect
        if (this.onBounceEffect) {
            this.onBounceEffect(position);
        }

        // Bounce sound
        if (this.onPlaySound) {
            this.onPlaySound('bounce');
        }
    }

    // ===== Level lifecycle =====

    /**
     * Reset all lines for a new level or level restart.
     *
     * @param maxLines - Override max lines (from level config).
     */
    reset(maxLines?: number): void {
        // Unregister all lines from collision system
        if (this.onUnregisterLine) {
            this.lines.forEach((line) => {
                if (line.state !== LineState.REMOVED) {
                    this.onUnregisterLine!(line.id);
                }
            });
        }

        this.lines.clear();
        this.activeLineCount = 0;
        if (maxLines !== undefined) {
            this.maxLines = maxLines;
        }
    }

    // ===== Queries =====

    /** Check if more lines can be drawn. */
    canDrawLine(): boolean {
        return this.activeLineCount < this.maxLines;
    }

    /** Get line count info. */
    getLineCount(): { used: number; remaining: number } {
        return {
            used: this.activeLineCount,
            remaining: this.maxLines - this.activeLineCount,
        };
    }

    /** Get the state of a specific line. */
    getLineState(lineId: string): LineState | null {
        const line = this.lines.get(lineId);
        return line ? line.state : null;
    }

    /** Check if a specific line has been hit. */
    isLineHit(lineId: string): boolean {
        const line = this.lines.get(lineId);
        return line ? line.isHit : false;
    }

    /** Get total number of lines (including removed). */
    getTotalLineCount(): number {
        return this.lines.size;
    }

    // ===== Private =====

    private notifyCountChanged(): void {
        if (this.onLineCountChanged) {
            this.onLineCountChanged(this.activeLineCount, this.maxLines - this.activeLineCount);
        }
    }
}
