/**
 * LineBounceSystem.test.ts — Unit tests for LineBounceSystem.
 * GDD: design/gdd/line-bounce-system.md
 */

import { LineBounceSystem, LineState } from '../../../src/gameplay/LineBounceSystem';

// ---------------------------------------------------------------------------
// Line creation
// ---------------------------------------------------------------------------

describe('LineBounceSystem line creation', () => {
    let lbs: LineBounceSystem;
    let registeredLines: { start: { x: number; y: number }; end: { x: number; y: number } }[];
    let confirmedLines: string[];
    let sounds: string[];
    let countChanges: { used: number; remaining: number }[];

    beforeEach(() => {
        lbs = new LineBounceSystem(3);
        registeredLines = [];
        confirmedLines = [];
        sounds = [];
        countChanges = [];
        lbs.onRegisterLine = (s, e) => {
            registeredLines.push({ start: s, end: e });
            return `line_${registeredLines.length - 1}`;
        };
        lbs.onShowConfirmedLine = (_s, _e, id) => confirmedLines.push(id);
        lbs.onPlaySound = (id) => sounds.push(id);
        lbs.onLineCountChanged = (used, remaining) => countChanges.push({ used, remaining });
    });

    test('createLine returns a lineId', () => {
        const id = lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        expect(id).not.toBeNull();
    });

    test('createLine registers with collision system', () => {
        lbs.createLine({ x: 10, y: 20 }, { x: 100, y: 20 });
        expect(registeredLines.length).toBe(1);
    });

    test('createLine triggers visual feedback', () => {
        lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        expect(confirmedLines.length).toBe(1);
    });

    test('createLine plays line_place sound', () => {
        lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        expect(sounds).toEqual(['line_place']);
    });

    test('createLine notifies count change', () => {
        lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        expect(countChanges).toEqual([{ used: 1, remaining: 2 }]);
    });

    test('can draw up to max lines', () => {
        expect(lbs.canDrawLine()).toBe(true);
        lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        lbs.createLine({ x: 0, y: 50 }, { x: 100, y: 50 });
        lbs.createLine({ x: 0, y: 100 }, { x: 100, y: 100 });
        expect(lbs.canDrawLine()).toBe(false);
    });

    test('createLine returns null when quota exceeded', () => {
        lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        lbs.createLine({ x: 0, y: 50 }, { x: 100, y: 50 });
        lbs.createLine({ x: 0, y: 100 }, { x: 100, y: 100 });
        const result = lbs.createLine({ x: 0, y: 150 }, { x: 100, y: 150 });
        expect(result).toBeNull();
    });

    test('getLineCount tracks used/remaining', () => {
        lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        expect(lbs.getLineCount()).toEqual({ used: 1, remaining: 2 });
    });
});

// ---------------------------------------------------------------------------
// Line removal (undo)
// ---------------------------------------------------------------------------

describe('LineBounceSystem line removal', () => {
    let lbs: LineBounceSystem;
    let unregistered: string[];
    let hidden: string[];
    let sounds: string[];

    beforeEach(() => {
        lbs = new LineBounceSystem(3);
        unregistered = [];
        hidden = [];
        sounds = [];
        lbs.onRegisterLine = (_s, _e) => `line_${lbs.getTotalLineCount()}`;
        lbs.onUnregisterLine = (id) => unregistered.push(id);
        lbs.onHideLine = (id) => hidden.push(id);
        lbs.onPlaySound = (id) => sounds.push(id);
    });

    test('removeLine succeeds for ACTIVE line', () => {
        const id = lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        const result = lbs.removeLine(id!);
        expect(result).toBe(true);
    });

    test('removeLine unregisters from collision', () => {
        const id = lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        lbs.removeLine(id!);
        expect(unregistered).toEqual([id]);
    });

    test('removeLine hides visual', () => {
        const id = lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        lbs.removeLine(id!);
        expect(hidden).toEqual([id]);
    });

    test('removeLine plays undo sound', () => {
        const id = lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        lbs.removeLine(id!);
        expect(sounds).toContain('line_undo');
    });

    test('removeLine frees up quota', () => {
        const id = lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        lbs.removeLine(id!);
        expect(lbs.canDrawLine()).toBe(true);
        expect(lbs.getLineCount()).toEqual({ used: 0, remaining: 3 });
    });

    test('removeLine fails for unknown ID', () => {
        expect(lbs.removeLine('nonexistent')).toBe(false);
    });

    test('removeLine fails for LOCKED line (ball has hit it)', () => {
        const id = lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        lbs.onBallHitLine({ x: 50, y: 0 }, { x: 0, y: 1 }, id!);
        expect(lbs.removeLine(id!)).toBe(false);
    });

    test('removeLine fails for already removed line', () => {
        const id = lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        lbs.removeLine(id!);
        expect(lbs.removeLine(id!)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Ball hit line (collision response)
// ---------------------------------------------------------------------------

describe('LineBounceSystem collision response', () => {
    let lbs: LineBounceSystem;
    let bounceEffects: { x: number; y: number }[];
    let sounds: string[];

    beforeEach(() => {
        lbs = new LineBounceSystem(3);
        bounceEffects = [];
        sounds = [];
        lbs.onRegisterLine = () => `line_${lbs.getTotalLineCount()}`;
        lbs.onBounceEffect = (pos) => bounceEffects.push(pos);
        lbs.onPlaySound = (id) => sounds.push(id);
    });

    test('onBallHitLine locks the line', () => {
        const id = lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        lbs.onBallHitLine({ x: 50, y: 0 }, { x: 0, y: 1 }, id!);
        expect(lbs.getLineState(id!)).toBe(LineState.LOCKED);
        expect(lbs.isLineHit(id!)).toBe(true);
    });

    test('onBallHitLine triggers bounce effect at contact point', () => {
        const id = lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        lbs.onBallHitLine({ x: 50, y: 0 }, { x: 0, y: 1 }, id!);
        expect(bounceEffects.length).toBe(1);
        expect(bounceEffects[0]).toEqual({ x: 50, y: 0 });
    });

    test('onBallHitLine plays bounce sound', () => {
        const id = lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        lbs.onBallHitLine({ x: 50, y: 0 }, { x: 0, y: 1 }, id!);
        expect(sounds).toContain('bounce');
    });

    test('onBallHitLine is idempotent (multiple hits)', () => {
        const id = lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        lbs.onBallHitLine({ x: 50, y: 0 }, { x: 0, y: 1 }, id!);
        lbs.onBallHitLine({ x: 30, y: 0 }, { x: 0, y: 1 }, id!);
        // Should trigger two effects but state stays LOCKED
        expect(bounceEffects.length).toBe(2);
        expect(lbs.getLineState(id!)).toBe(LineState.LOCKED);
    });

    test('onBallHitLine with unknown ID is ignored', () => {
        expect(() => lbs.onBallHitLine({ x: 0, y: 0 }, { x: 0, y: 1 }, 'unknown')).not.toThrow();
        expect(bounceEffects.length).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe('LineBounceSystem reset', () => {
    test('reset clears all lines and restores quota', () => {
        const lbs = new LineBounceSystem(3);
        const unregistered: string[] = [];
        lbs.onRegisterLine = () => `line_${lbs.getTotalLineCount()}`;
        lbs.onUnregisterLine = (id) => unregistered.push(id);

        lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        lbs.createLine({ x: 0, y: 50 }, { x: 100, y: 50 });

        lbs.reset();

        expect(lbs.canDrawLine()).toBe(true);
        expect(lbs.getLineCount()).toEqual({ used: 0, remaining: 3 });
        expect(lbs.getTotalLineCount()).toBe(0);
    });

    test('reset with maxLines override', () => {
        const lbs = new LineBounceSystem(3);
        lbs.onRegisterLine = () => `line`;
        lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        lbs.reset(5);
        expect(lbs.getLineCount()).toEqual({ used: 0, remaining: 5 });
    });

    test('reset unregisters active lines', () => {
        const lbs = new LineBounceSystem(3);
        const unregistered: string[] = [];
        lbs.onRegisterLine = () => `line_${lbs.getTotalLineCount()}`;
        lbs.onUnregisterLine = (id) => unregistered.push(id);
        lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        lbs.createLine({ x: 0, y: 50 }, { x: 100, y: 50 });

        lbs.reset();
        expect(unregistered.length).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('LineBounceSystem edge cases', () => {
    test('createLine without onRegisterLine still works (fallback ID)', () => {
        const lbs = new LineBounceSystem(3);
        const id = lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        expect(id).toBe('line_0');
    });

    test('createLine without callbacks does not throw', () => {
        const lbs = new LineBounceSystem(3);
        expect(() => lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 })).not.toThrow();
    });

    test('removeLine without callbacks does not throw', () => {
        const lbs = new LineBounceSystem(3);
        lbs.onRegisterLine = () => 'line_0';
        lbs.createLine({ x: 0, y: 0 }, { x: 100, y: 0 });
        expect(() => lbs.removeLine('line_0')).not.toThrow();
    });

    test('getLineState returns null for unknown ID', () => {
        const lbs = new LineBounceSystem(3);
        expect(lbs.getLineState('unknown')).toBeNull();
    });

    test('isLineHit returns false for unknown ID', () => {
        const lbs = new LineBounceSystem(3);
        expect(lbs.isLineHit('unknown')).toBe(false);
    });
});
