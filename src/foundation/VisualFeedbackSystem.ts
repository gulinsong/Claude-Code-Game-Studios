/**
 * VisualFeedbackSystem.ts — Stateless API for triggering visual effects.
 *
 * Provides a pure-logic interface that game systems call to request visual
 * effects (bounce particles, collection flash, win/lose overlays, etc.).
 * The actual rendering is handled by the engine integration layer.
 *
 * GDD: design/gdd/visual-feedback-system.md
 * No engine dependencies — pure TypeScript.
 */

import { Vec2 } from '../interfaces/GameInterfaces';
import { VISUAL_CONFIG } from '../config/GameConfig';

/** Visual effect types, matching GDD definitions. */
export enum VisualEffectType {
    PREVIEW_LINE = 'preview_line',
    CONFIRMED_LINE = 'confirmed_line',
    BOUNCE = 'bounce_effect',
    COLLECT = 'collect_effect',
    WIN = 'win_effect',
    LOSE = 'lose_effect',
}

/** Effect request data passed to the rendering layer. */
export interface EffectRequest {
    type: VisualEffectType;
    position?: Vec2;
    start?: Vec2;
    end?: Vec2;
    intensity: number;
}

/**
 * VisualFeedbackSystem is a stateless dispatcher. It validates effect requests
 * and forwards them to the rendering layer via callbacks. It does NOT manage
 * particles or animations internally — those belong to the engine layer.
 */
export class VisualFeedbackSystem {
    /** Maximum simultaneous particles (performance budget). */
    private maxParticles: number;

    /** Currently active particle count (tracked by engine layer). */
    private activeParticleCount: number;

    /** Callback invoked when an effect should be rendered. */
    public onEffectRequest: ((request: EffectRequest) => void) | null;

    constructor(maxParticles: number = VISUAL_CONFIG.MAX_PARTICLES) {
        this.maxParticles = maxParticles;
        this.activeParticleCount = 0;
        this.onEffectRequest = null;
    }

    // ===== Effect triggers =====

    /** Show the semi-transparent preview line while the player is drawing. */
    showPreviewLine(start: Vec2, end: Vec2): void {
        this.emit({
            type: VisualEffectType.PREVIEW_LINE,
            start: { x: start.x, y: start.y },
            end: { x: end.x, y: end.y },
            intensity: 1.0,
        });
    }

    /** Hide the preview line (touch ended or cancelled). */
    hidePreviewLine(): void {
        this.emit({
            type: VisualEffectType.PREVIEW_LINE,
            intensity: 0.0,
        });
    }

    /** Show a confirmed line (solid + glow). */
    showConfirmedLine(start: Vec2, end: Vec2): void {
        this.emit({
            type: VisualEffectType.CONFIRMED_LINE,
            start: { x: start.x, y: start.y },
            end: { x: end.x, y: end.y },
            intensity: 1.0,
        });
    }

    /** Play bounce particle burst at the contact point. */
    playBounceEffect(position: Vec2, intensity: number = 1.0): void {
        if (!this.canAffordParticles(this.estimateParticles(VisualEffectType.BOUNCE, intensity))) {
            return;
        }
        this.emit({
            type: VisualEffectType.BOUNCE,
            position: { x: position.x, y: position.y },
            intensity,
        });
    }

    /** Play collection flash + scale animation. */
    playCollectEffect(position: Vec2, intensity: number = 1.0): void {
        this.emit({
            type: VisualEffectType.COLLECT,
            position: { x: position.x, y: position.y },
            intensity,
        });
    }

    /** Play the victory celebration effect. */
    playWinEffect(): void {
        this.emit({
            type: VisualEffectType.WIN,
            intensity: 1.0,
        });
    }

    /** Play the failure screen effect (dim + shake). */
    playLoseEffect(): void {
        this.emit({
            type: VisualEffectType.LOSE,
            intensity: 1.0,
        });
    }

    /** Clear all active effects (scene transition). */
    clearAllEffects(): void {
        this.activeParticleCount = 0;
        // Emit a clear signal with zero intensity
        this.emit({ type: VisualEffectType.PREVIEW_LINE, intensity: 0.0 });
    }

    // ===== Particle budget tracking =====

    /** Notify the system that particles were spawned (called by engine layer). */
    onParticlesSpawned(count: number): void {
        this.activeParticleCount += count;
    }

    /** Notify the system that particles expired (called by engine layer). */
    onParticlesExpired(count: number): void {
        this.activeParticleCount = Math.max(0, this.activeParticleCount - count);
    }

    /** Get current active particle count. */
    getActiveParticleCount(): number {
        return this.activeParticleCount;
    }

    // ===== Private helpers =====

    private emit(request: EffectRequest): void {
        if (this.onEffectRequest) {
            this.onEffectRequest(request);
        }
    }

    private estimateParticles(type: VisualEffectType, intensity: number): number {
        // Base counts from GDD
        const baseCounts: Record<string, number> = {
            [VisualEffectType.BOUNCE]: 10,
            [VisualEffectType.COLLECT]: 15,
            [VisualEffectType.WIN]: 30,
            [VisualEffectType.LOSE]: 5,
        };
        const base = baseCounts[type] ?? 10;
        return Math.round(base * intensity);
    }

    private canAffordParticles(needed: number): boolean {
        return this.activeParticleCount + needed <= this.maxParticles;
    }
}
