/**
 * VisualFeedbackSystem.test.ts — Unit tests for VisualFeedbackSystem.
 * GDD: design/gdd/visual-feedback-system.md
 */

import {
    VisualFeedbackSystem,
    VisualEffectType,
    EffectRequest,
} from '../../../src/foundation/VisualFeedbackSystem';
import { Vec2 } from '../../../src/interfaces/GameInterfaces';

describe('VisualFeedbackSystem effect triggers', () => {
    let vfx: VisualFeedbackSystem;
    let requests: EffectRequest[];

    beforeEach(() => {
        vfx = new VisualFeedbackSystem();
        requests = [];
        vfx.onEffectRequest = (req) => requests.push(req);
    });

    test('showPreviewLine emits PREVIEW_LINE with start/end', () => {
        vfx.showPreviewLine({ x: 10, y: 20 }, { x: 30, y: 40 });
        expect(requests.length).toBe(1);
        expect(requests[0].type).toBe(VisualEffectType.PREVIEW_LINE);
        expect(requests[0].start).toEqual({ x: 10, y: 20 });
        expect(requests[0].end).toEqual({ x: 30, y: 40 });
        expect(requests[0].intensity).toBe(1.0);
    });

    test('hidePreviewLine emits with zero intensity', () => {
        vfx.hidePreviewLine();
        expect(requests.length).toBe(1);
        expect(requests[0].type).toBe(VisualEffectType.PREVIEW_LINE);
        expect(requests[0].intensity).toBe(0.0);
    });

    test('showConfirmedLine emits CONFIRMED_LINE', () => {
        vfx.showConfirmedLine({ x: 0, y: 0 }, { x: 100, y: 100 });
        expect(requests.length).toBe(1);
        expect(requests[0].type).toBe(VisualEffectType.CONFIRMED_LINE);
    });

    test('playBounceEffect emits BOUNCE at position', () => {
        vfx.playBounceEffect({ x: 50, y: 50 });
        expect(requests.length).toBe(1);
        expect(requests[0].type).toBe(VisualEffectType.BOUNCE);
        expect(requests[0].position).toEqual({ x: 50, y: 50 });
    });

    test('playCollectEffect emits COLLECT at position', () => {
        vfx.playCollectEffect({ x: 75, y: 75 });
        expect(requests.length).toBe(1);
        expect(requests[0].type).toBe(VisualEffectType.COLLECT);
    });

    test('playWinEffect emits WIN', () => {
        vfx.playWinEffect();
        expect(requests.length).toBe(1);
        expect(requests[0].type).toBe(VisualEffectType.WIN);
    });

    test('playLoseEffect emits LOSE', () => {
        vfx.playLoseEffect();
        expect(requests.length).toBe(1);
        expect(requests[0].type).toBe(VisualEffectType.LOSE);
    });

    test('no callback set does not throw', () => {
        const noCallback = new VisualFeedbackSystem();
        expect(() => noCallback.playBounceEffect({ x: 0, y: 0 })).not.toThrow();
    });
});

describe('VisualFeedbackSystem particle budget', () => {
    test('tracks active particles', () => {
        const vfx = new VisualFeedbackSystem(200);
        vfx.onParticlesSpawned(50);
        expect(vfx.getActiveParticleCount()).toBe(50);
        vfx.onParticlesSpawned(30);
        expect(vfx.getActiveParticleCount()).toBe(80);
    });

    test('particles expired reduces count', () => {
        const vfx = new VisualFeedbackSystem(200);
        vfx.onParticlesSpawned(50);
        vfx.onParticlesExpired(20);
        expect(vfx.getActiveParticleCount()).toBe(30);
    });

    test('particle count cannot go below 0', () => {
        const vfx = new VisualFeedbackSystem(200);
        vfx.onParticlesSpawned(10);
        vfx.onParticlesExpired(50);
        expect(vfx.getActiveParticleCount()).toBe(0);
    });

    test('clearAllEffects resets particle count', () => {
        const vfx = new VisualFeedbackSystem();
        vfx.onParticlesSpawned(100);
        vfx.clearAllEffects();
        expect(vfx.getActiveParticleCount()).toBe(0);
    });

    test('bounce is blocked when particle budget exceeded', () => {
        const requests: EffectRequest[] = [];
        const vfx = new VisualFeedbackSystem(15);
        vfx.onEffectRequest = (req) => requests.push(req);
        vfx.onParticlesSpawned(200); // over budget

        vfx.playBounceEffect({ x: 50, y: 50 });
        expect(requests.length).toBe(0);
    });
});
