/**
 * OutOfBoundsDetectionSystem.test.ts — Unit tests for OutOfBoundsDetectionSystem.
 * GDD: design/gdd/out-of-bounds-system.md
 *
 * Covers: single-fire trigger, state transitions (ARMED→TRIGGERED→SPENT),
 * shouldDestroyBall, reset, destroy, edge cases.
 */

import {
    OutOfBoundsDetectionSystem,
    OutOfBoundsState,
} from '../../../src/core/OutOfBoundsDetectionSystem';

describe('OutOfBoundsDetectionSystem initial state', () => {
    test('starts in ARMED state', () => {
        const oob = new OutOfBoundsDetectionSystem();
        expect(oob.getState()).toBe(OutOfBoundsState.ARMED);
        expect(oob.isTriggered()).toBe(false);
    });
});

describe('OutOfBoundsDetectionSystem trigger', () => {
    let oob: OutOfBoundsDetectionSystem;
    let triggerCount: number;

    beforeEach(() => {
        oob = new OutOfBoundsDetectionSystem();
        triggerCount = 0;
        oob.onTriggered = () => { triggerCount++; };
    });

    test('onBallOutOfBounds fires callback and changes state', () => {
        oob.onBallOutOfBounds();
        expect(triggerCount).toBe(1);
        expect(oob.getState()).toBe(OutOfBoundsState.TRIGGERED);
        expect(oob.isTriggered()).toBe(true);
    });

    test('onBallOutOfBounds only fires once', () => {
        oob.onBallOutOfBounds();
        oob.onBallOutOfBounds();
        oob.onBallOutOfBounds();
        expect(triggerCount).toBe(1);
    });

    test('callback fires even if onTriggered is null', () => {
        oob.onTriggered = null;
        expect(() => oob.onBallOutOfBounds()).not.toThrow();
        expect(oob.isTriggered()).toBe(true);
    });
});

describe('OutOfBoundsDetectionSystem shouldDestroyBall', () => {
    let oob: OutOfBoundsDetectionSystem;

    beforeEach(() => {
        oob = new OutOfBoundsDetectionSystem(100);
    });

    test('returns false in ARMED state', () => {
        expect(oob.shouldDestroyBall(-200)).toBe(false);
    });

    test('returns false when ball is above destroy threshold', () => {
        oob.onBallOutOfBounds();
        expect(oob.shouldDestroyBall(-50)).toBe(false);
        expect(oob.getState()).toBe(OutOfBoundsState.TRIGGERED);
    });

    test('returns true and transitions to SPENT when ball below threshold', () => {
        oob.onBallOutOfBounds();
        const result = oob.shouldDestroyBall(-150);
        expect(result).toBe(true);
        expect(oob.getState()).toBe(OutOfBoundsState.SPENT);
    });

    test('exact threshold value does not trigger destroy (< required)', () => {
        oob.onBallOutOfBounds();
        expect(oob.shouldDestroyBall(-100)).toBe(false);
    });

    test('returns false in SPENT state', () => {
        oob.onBallOutOfBounds();
        oob.shouldDestroyBall(-200);
        expect(oob.shouldDestroyBall(-500)).toBe(false);
    });
});

describe('OutOfBoundsDetectionSystem reset', () => {
    test('reset restores ARMED state after trigger', () => {
        const oob = new OutOfBoundsDetectionSystem();
        oob.onBallOutOfBounds();
        expect(oob.isTriggered()).toBe(true);

        oob.reset();

        expect(oob.getState()).toBe(OutOfBoundsState.ARMED);
        expect(oob.isTriggered()).toBe(false);
    });

    test('reset allows re-triggering', () => {
        let count = 0;
        const oob = new OutOfBoundsDetectionSystem();
        oob.onTriggered = () => { count++; };

        oob.onBallOutOfBounds();
        oob.reset();
        oob.onBallOutOfBounds();

        expect(count).toBe(2);
    });

    test('reset is idempotent', () => {
        const oob = new OutOfBoundsDetectionSystem();
        oob.reset();
        oob.reset();
        oob.reset();
        expect(oob.getState()).toBe(OutOfBoundsState.ARMED);
    });

    test('rapid reset cycles work correctly', () => {
        const oob = new OutOfBoundsDetectionSystem();
        for (let i = 0; i < 10; i++) {
            oob.onBallOutOfBounds();
            expect(oob.isTriggered()).toBe(true);
            oob.reset();
            expect(oob.isTriggered()).toBe(false);
        }
    });
});

describe('OutOfBoundsDetectionSystem destroy', () => {
    test('destroy sets SPENT state and clears callback', () => {
        const oob = new OutOfBoundsDetectionSystem();
        oob.onTriggered = () => {};
        oob.destroy();
        expect(oob.getState()).toBe(OutOfBoundsState.SPENT);
        expect(oob.onTriggered).toBeNull();
    });
});

describe('OutOfBoundsDetectionSystem getDestroyY', () => {
    test('returns negative of destroy margin', () => {
        const oob = new OutOfBoundsDetectionSystem(100);
        expect(oob.getDestroyY()).toBe(-100);
    });

    test('respects custom margin', () => {
        const oob = new OutOfBoundsDetectionSystem(200);
        expect(oob.getDestroyY()).toBe(-200);
    });
});
