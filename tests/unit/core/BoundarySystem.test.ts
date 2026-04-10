/**
 * BoundarySystem.test.ts — Unit tests for BoundarySystem.
 * GDD: design/gdd/boundary-system.md
 *
 * Covers: initialization, edge computation, playable area, isInsideBounds,
 * isBelowBottom, destroy, graceful degradation for invalid safe area values.
 */

import { BoundarySystem } from '../../../src/core/BoundarySystem';

describe('BoundarySystem initialization', () => {
    let bs: BoundarySystem;

    beforeEach(() => {
        bs = new BoundarySystem();
    });

    test('initializes with valid screen dimensions', () => {
        bs.initialize(750, 1334, 44, 34);
        const edges = bs.getEdges();
        expect(edges).not.toBeNull();
        expect(edges!.left).toBe(20);           // BOUNDARY_PADDING
        expect(edges!.right).toBe(730);         // 750 - 20
        expect(edges!.top).toBe(1270);          // 1334 - 20 - 44
        expect(edges!.bottom).toBe(54);         // 20 + 34
    });

    test('computes playable area correctly', () => {
        bs.initialize(750, 1334, 44, 34);
        const area = bs.getPlayableArea();
        expect(area).not.toBeNull();
        expect(area!.x).toBe(20);
        expect(area!.y).toBe(54);
        expect(area!.width).toBe(710);          // 730 - 20
        expect(area!.height).toBe(1216);        // 1270 - 54
    });

    test('works with zero safe area', () => {
        bs.initialize(750, 1334, 0, 0);
        const edges = bs.getEdges();
        expect(edges!.top).toBe(1314);          // 1334 - 20
        expect(edges!.bottom).toBe(20);         // 20 + 0
    });

    test('returns null before initialization', () => {
        expect(bs.getEdges()).toBeNull();
        expect(bs.getPlayableArea()).toBeNull();
    });
});

describe('BoundarySystem safe area degradation', () => {
    let bs: BoundarySystem;

    beforeEach(() => {
        bs = new BoundarySystem();
    });

    test('negative safeAreaTop uses default (44)', () => {
        bs.initialize(750, 1334, -10, 34);
        const edges = bs.getEdges();
        expect(edges!.top).toBe(1270);          // 1334 - 20 - 44
    });

    test('negative safeAreaBottom uses default (34)', () => {
        bs.initialize(750, 1334, 44, -5);
        const edges = bs.getEdges();
        expect(edges!.bottom).toBe(54);         // 20 + 34
    });

    test('NaN safeAreaTop uses default', () => {
        bs.initialize(750, 1334, NaN, 34);
        const edges = bs.getEdges();
        expect(edges!.top).toBe(1270);
    });

    test('undefined safe area defaults to 0', () => {
        bs.initialize(750, 1334);
        const edges = bs.getEdges();
        expect(edges!.top).toBe(1314);
        expect(edges!.bottom).toBe(20);
    });
});

describe('BoundarySystem.isInsideBounds', () => {
    let bs: BoundarySystem;

    beforeEach(() => {
        bs = new BoundarySystem();
        bs.initialize(750, 1334, 0, 0);
        // left=20, right=730, bottom=20, top=1314
    });

    test('center of playable area is inside', () => {
        expect(bs.isInsideBounds({ x: 375, y: 667 })).toBe(true);
    });

    test('point on the edge is inside', () => {
        expect(bs.isInsideBounds({ x: 20, y: 20 })).toBe(true);
        expect(bs.isInsideBounds({ x: 730, y: 1314 })).toBe(true);
    });

    test('point outside left is not inside', () => {
        expect(bs.isInsideBounds({ x: 19, y: 667 })).toBe(false);
    });

    test('point outside right is not inside', () => {
        expect(bs.isInsideBounds({ x: 731, y: 667 })).toBe(false);
    });

    test('point below bottom is not inside', () => {
        expect(bs.isInsideBounds({ x: 375, y: 19 })).toBe(false);
    });

    test('point above top is not inside', () => {
        expect(bs.isInsideBounds({ x: 375, y: 1315 })).toBe(false);
    });

    test('respects margin parameter', () => {
        // Margin of 10 means the effective boundary is [30, 720] x [30, 1304]
        expect(bs.isInsideBounds({ x: 25, y: 667 }, 10)).toBe(false);
        expect(bs.isInsideBounds({ x: 30, y: 667 }, 10)).toBe(true);
    });

    test('returns false before initialization', () => {
        const uninitialized = new BoundarySystem();
        expect(uninitialized.isInsideBounds({ x: 100, y: 100 })).toBe(false);
    });
});

describe('BoundarySystem.isBelowBottom', () => {
    let bs: BoundarySystem;

    beforeEach(() => {
        bs = new BoundarySystem();
        bs.initialize(750, 1334, 0, 0);
        // bottom = 20
    });

    test('point below bottom returns true', () => {
        expect(bs.isBelowBottom({ x: 375, y: 10 })).toBe(true);
    });

    test('point at bottom returns false', () => {
        expect(bs.isBelowBottom({ x: 375, y: 20 })).toBe(false);
    });

    test('point above bottom returns false', () => {
        expect(bs.isBelowBottom({ x: 375, y: 30 })).toBe(false);
    });

    test('respects tolerance parameter', () => {
        // With tolerance=5, point must be below (20 - 5) = 15
        expect(bs.isBelowBottom({ x: 375, y: 16 }, 5)).toBe(false);
        expect(bs.isBelowBottom({ x: 375, y: 14 }, 5)).toBe(true);
    });

    test('returns false before initialization', () => {
        const uninitialized = new BoundarySystem();
        expect(uninitialized.isBelowBottom({ x: 100, y: -100 })).toBe(false);
    });
});

describe('BoundarySystem destroy', () => {
    test('destroy clears state', () => {
        const bs = new BoundarySystem();
        bs.initialize(750, 1334, 0, 0);
        bs.onBallOutOfBounds = () => {};

        bs.destroy();

        expect(bs.getEdges()).toBeNull();
        expect(bs.getPlayableArea()).toBeNull();
    });
});
